/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import {
  getAnySourceCommandFromESQLQuery,
  getIndexPatternFromESQLQuery,
  getProjectRoutingFromEsqlQuery,
} from '@kbn/esql-utils';
import type { ResolveResourceResponse } from '../utils/resources';
import { resolveResourceForEsql } from '../utils/resources';

/** PROMQL without `index=` reads `metrics-*`. */
const PROMQL_DEFAULT_TARGET = 'metrics-*';

type SourceCommand = 'FROM' | 'TS' | 'PROMQL';

export interface ExtractedQueryTarget {
  /** The sources exactly as they follow the source command, e.g. `logs*,-logstash*`. */
  target: string;
  sourceCommand?: SourceCommand;
  projectRouting?: string;
}

const isSourceCommand = (command: string): command is SourceCommand =>
  command === 'FROM' || command === 'TS' || command === 'PROMQL';

/**
 * Extracts the sources of a query's source command (`FROM`, `TS` or `PROMQL`), with exclusions,
 * `cluster:` prefixes, `::` selectors and subquery sources kept as written, plus the
 * `SET project_routing` value. Works on queries with syntax errors after the source command.
 * Returns undefined when the query has no sources (`ROW`, `SHOW`, an empty or comment-only text).
 */
export const extractQueryTarget = (query?: string): ExtractedQueryTarget | undefined => {
  if (!query?.trim()) {
    return undefined;
  }
  try {
    const command = getAnySourceCommandFromESQLQuery(query);
    const projectRouting = getProjectRoutingFromEsqlQuery(query);
    const target =
      getIndexPatternFromESQLQuery(query) || (command === 'PROMQL' ? PROMQL_DEFAULT_TARGET : '');
    if (!target) {
      return undefined;
    }
    return {
      target,
      ...(isSourceCommand(command) ? { sourceCommand: command } : {}),
      ...(projectRouting ? { projectRouting } : {}),
    };
  } catch {
    return undefined;
  }
};

export interface ResolveQueryTargetParams {
  /** The editor's current query. */
  currentQuery?: string;
  esClient: ElasticsearchClient;
  logger?: Logger;
  includeDatasets: boolean;
  includeViews: boolean;
  includeFrozen: boolean;
}

export interface QueryTargetResult {
  strategy: 'current_query';
  resource: ResolveResourceResponse;
  sourceCommand?: SourceCommand;
  projectRouting?: string;
}

/**
 * Chooses the current query's sources as the source of a generated query, and resolves them.
 * Returns undefined when the query has no sources or they cannot be resolved, so the caller
 * discovers a source instead.
 */
export const resolveQueryTarget = async ({
  currentQuery,
  esClient,
  logger,
  includeDatasets,
  includeViews,
  includeFrozen,
}: ResolveQueryTargetParams): Promise<QueryTargetResult | undefined> => {
  const current = extractQueryTarget(currentQuery);
  if (!current) {
    return undefined;
  }

  let resource: ResolveResourceResponse;
  try {
    resource = await resolveResourceForEsql({
      resourceName: current.target,
      esClient,
      includeDatasets,
      includeViews,
      includeFrozen,
    });
  } catch (e) {
    logger?.debug(
      `Could not resolve the current query's sources "${current.target}", discovering a source instead: ${e.message}`
    );
    return undefined;
  }

  logger?.debug('Source strategy: current_query');
  return {
    strategy: 'current_query',
    resource,
    ...(current.sourceCommand ? { sourceCommand: current.sourceCommand } : {}),
    ...(current.projectRouting ? { projectRouting: current.projectRouting } : {}),
  };
};
