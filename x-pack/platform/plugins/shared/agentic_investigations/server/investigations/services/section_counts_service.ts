/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import { DEFAULT_CONVERSATION_TITLE } from '@kbn/agent-builder-common';
import { chatSystemIndex } from '@kbn/agent-builder-server';
import { INVESTIGATION_TEMPLATE_ID } from '../../../common/escalations/constants';
import { INVESTIGATION_SEVERITY_NONE } from '../../../common/investigations/constants';
import type {
  InvestigationSectionCount,
  InvestigationSectionCounts,
  InvestigationSectionCountsQuery,
} from '../../../common/investigations/investigation';
import { isInvestigationSeverity } from '../../../common/investigations/severity';
import { buildConversationReadFilter, resolveConversationReader } from './conversation_read_filter';

const CONVERSATIONS_INDEX = chatSystemIndex('conversations');

export interface InvestigationSectionCountsServiceDeps {
  /** Reads the conversations index; the read filter does the access check. */
  getInternalEsClient: () => ElasticsearchClient;
  getScopedEsClient: (request: KibanaRequest) => ElasticsearchClient;
  getSecurity: () => SecurityServiceStart;
  /** The agents the request's user can access: conversations on other agents are not readable. */
  getAccessibleAgentIds: (request: KibanaRequest) => Promise<string[]>;
  getSpaceId: (request: KibanaRequest) => string;
  logger: Logger;
}

const emptyCount = (): InvestigationSectionCount => ({ total: 0, matching: 0 });

const emptyCounts = (): InvestigationSectionCounts => ({
  open: {
    critical: emptyCount(),
    high: emptyCount(),
    medium: emptyCount(),
    low: emptyCount(),
    [INVESTIGATION_SEVERITY_NONE]: emptyCount(),
  },
  closed: emptyCount(),
});

/** The query's words, lower-cased: every one must appear, as in the list's `query` filter. */
const toTerms = (query: string | undefined): string[] =>
  (query ?? '').toLowerCase().split(/\s+/).filter(Boolean);

/**
 * Status and severity read the way `toMetadata` does: a missing status is open. The text is what
 * the list's `query` matches: the title (unless it is still Agent Builder's placeholder), the
 * summary, and the verdict, lower-cased and joined by newlines. `LOCATE` matches a term literally.
 */
export const buildSectionCountsEsql = (termCount: number): string => {
  const groups = `| EVAL status = CASE(FIELD_EXTRACT(metadata, "status") == "closed", "closed", "open"),
       severity = COALESCE(FIELD_EXTRACT(metadata, "severity"), "${INVESTIGATION_SEVERITY_NONE}")`;
  if (termCount === 0) {
    return `FROM ${CONVERSATIONS_INDEX}
${groups}
| STATS total = COUNT(*), matching = COUNT(*) BY status, severity`;
  }
  const matches = Array.from(
    { length: termCount },
    (_, index) => `LOCATE(text, ?term${index}) > 0`
  );
  return `FROM ${CONVERSATIONS_INDEX}
${groups},
       title_text = CASE(title IS NULL OR TRIM(title) == "" OR title == ?placeholder, "", title),
       text = TO_LOWER(CONCAT(title_text, "\\n",
         COALESCE(FIELD_EXTRACT(metadata, "summary"), ""), "\\n",
         COALESCE(FIELD_EXTRACT(metadata, "verdict"), "")))
| STATS total = COUNT(*), matching = COUNT(*) WHERE ${matches.join(' AND ')} BY status, severity`;
};

const isMissingIndex = (error: unknown): boolean => {
  const { statusCode, message } = (error ?? {}) as { statusCode?: number; message?: string };
  return statusCode === 404 || /unknown index|index_not_found/i.test(message ?? '');
};

/**
 * Counts the investigations of each home page group in one ES|QL query: open ones per severity,
 * and closed ones, each with and without the text query. Nothing is read into memory, so unlike
 * the list there is no candidate cap.
 */
export class InvestigationSectionCountsService {
  constructor(private readonly deps: InvestigationSectionCountsServiceDeps) {}

  async count(
    request: KibanaRequest,
    { query }: InvestigationSectionCountsQuery
  ): Promise<InvestigationSectionCounts> {
    const agentIds = await this.deps.getAccessibleAgentIds(request);
    if (agentIds.length === 0) {
      return emptyCounts();
    }
    const reader = await resolveConversationReader({
      request,
      security: this.deps.getSecurity(),
      esClient: this.deps.getScopedEsClient(request),
    });
    const terms = toTerms(query);

    let response: { columns: Array<{ name: string }>; values: unknown[][] };
    try {
      response = await this.deps.getInternalEsClient().esql.query({
        query: buildSectionCountsEsql(terms.length),
        filter: {
          bool: {
            filter: [
              { term: { template_id: INVESTIGATION_TEMPLATE_ID } },
              ...buildConversationReadFilter({
                spaceId: this.deps.getSpaceId(request),
                reader,
                agentIds,
              }),
            ],
          },
        },
        params:
          terms.length > 0
            ? [
                { placeholder: DEFAULT_CONVERSATION_TITLE },
                ...terms.map((term, index) => ({ [`term${index}`]: term })),
              ]
            : [],
        format: 'json',
      });
    } catch (error) {
      if (isMissingIndex(error)) {
        this.deps.logger.debug(`No conversations to count investigations in yet: ${error}`);
        return emptyCounts();
      }
      throw error;
    }

    const names = response.columns.map(({ name }) => name);
    const [totalIndex, matchingIndex, statusIndex, severityIndex] = [
      'total',
      'matching',
      'status',
      'severity',
    ].map((name) => names.indexOf(name));

    const counts = emptyCounts();
    for (const row of response.values) {
      const severity = row[severityIndex];
      const group =
        row[statusIndex] === 'closed'
          ? counts.closed
          : counts.open[
              typeof severity === 'string' && isInvestigationSeverity(severity)
                ? severity
                : INVESTIGATION_SEVERITY_NONE
            ];
      group.total += Number(row[totalIndex] ?? 0);
      group.matching += Number(row[matchingIndex] ?? 0);
    }
    return counts;
  }
}
