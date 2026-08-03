/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiDescriptionListProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  createEsTraceFetcher,
  TraceWaterfall,
  useTraceSpans,
  type TraceFetcher,
} from '@kbn/llm-trace-waterfall';
import React, { useMemo } from 'react';
import type { GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import type { Pattern, PatternCase } from '../../../../common/http_api/patterns';
import { useKibana } from '../../hooks/use_kibana';
import { patternTitle } from './pattern_format';

interface CaseDetailFlyoutProps {
  pattern: Pattern;
  patternCase: PatternCase;
  aiIndex: GetAiIndexResponse | undefined;
  onClose: () => void;
  /** Step to the previous case in the pattern's suite; omitted at the first case. */
  onPrevious?: () => void;
  /** Step to the next case in the pattern's suite; omitted at the last case. */
  onNext?: () => void;
  /** Position of this case within the pattern's suite, for the "Case X of N" label. */
  position?: { index: number; total: number };
}

const statusBadgeColor = (status?: string): 'danger' | 'success' | 'default' =>
  status === 'Error' ? 'danger' : status === 'Ok' ? 'success' : 'default';

const round = (value?: number, digits = 2): string | undefined =>
  typeof value === 'number' ? value.toFixed(digits).replace(/\.?0+$/, '') : undefined;

/**
 * Full detail for a single case (one retrieval/tool event): its agent trace
 * rendered as a waterfall, the retrieval fields, and the query/error. Opened on
 * top of {@link PatternDetailFlyout} by clicking a case.
 */
export const CaseDetailFlyout = ({
  pattern,
  patternCase,
  aiIndex,
  onClose,
  onPrevious,
  onNext,
  position,
}: CaseDetailFlyoutProps) => {
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'ctxCaseFlyout' });
  const {
    services: { data },
  } = useKibana();

  const target = pattern.pattern_key.split(':')[2];
  const signals = patternCase.round_signals ?? {};

  // Trace waterfall for this case's round, fetched from the AI index's trace index.
  const esSearch = data.search.search;
  const tracesIndex = aiIndex?.self_improvement?.traces_index;
  const traceId = patternCase.round_id;
  const canShowTrace = Boolean(tracesIndex && traceId);
  const fetchTrace = useMemo<TraceFetcher>(
    () =>
      tracesIndex
        ? createEsTraceFetcher(esSearch, { index: tracesIndex })
        : async () => ({ spans: [], durationMs: 0 }),
    [esSearch, tracesIndex]
  );
  const traceResult = useTraceSpans(canShowTrace ? traceId : null, { fetchTrace });

  const signalBits = [
    signals.esql_count != null ? `esql ${signals.esql_count}` : undefined,
    signals.raw_query_count != null ? `raw ${signals.raw_query_count}` : undefined,
    signals.ki_retrieval_count != null ? `ki ${signals.ki_retrieval_count}` : undefined,
    signals.looped ? 'looped' : undefined,
    signals.fell_back_to_raw ? 'fell back to raw' : undefined,
  ].filter(Boolean);

  const caseItems: EuiDescriptionListProps['listItems'] = [
    {
      title: caseLabels.status,
      description: (
        <EuiBadge color={statusBadgeColor(patternCase.status)}>
          {patternCase.status ?? '—'}
        </EuiBadge>
      ),
    },
    { title: caseLabels.timestamp, description: patternCase['@timestamp'] },
    { title: caseLabels.tool, description: patternCase.tool },
    ...(patternCase.query_kind
      ? [{ title: caseLabels.queryKind, description: patternCase.query_kind }]
      : []),
    ...(patternCase.target_index
      ? [{ title: caseLabels.targetIndex, description: patternCase.target_index }]
      : []),
    ...(patternCase.duration_ms != null
      ? [{ title: caseLabels.duration, description: `${round(patternCase.duration_ms)} ms` }]
      : []),
    ...(patternCase.returned
      ? [
          {
            title: caseLabels.returned,
            description: `${patternCase.returned.row_count ?? 0} rows${
              patternCase.returned.columns?.length
                ? ` · ${patternCase.returned.columns.join(', ')}`
                : ''
            }`,
          },
        ]
      : []),
    ...(signalBits.length
      ? [{ title: caseLabels.signals, description: signalBits.join(' · ') }]
      : []),
    ...(patternCase.agent?.name || patternCase.agent?.class
      ? [
          {
            title: caseLabels.agent,
            description: `${patternCase.agent?.name ?? ''}${
              patternCase.agent?.class ? ` (${patternCase.agent.class})` : ''
            }`.trim(),
          },
        ]
      : []),
    ...(patternCase.labels?.length
      ? [
          {
            title: caseLabels.classifierLabels,
            description: (
              <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
                {patternCase.labels.map((l, i) => (
                  <EuiFlexItem grow={false} key={`${l.type}-${i}`}>
                    <EuiBadge color="hollow">
                      {l.sub_type ? `${l.type} · ${l.sub_type}` : l.type}
                      {l.confidence != null ? ` (${round(l.confidence)})` : ''}
                    </EuiBadge>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            ),
          },
        ]
      : []),
    { title: caseLabels.round, description: patternCase.round_id },
    ...(patternCase.conversation_id
      ? [{ title: caseLabels.conversation, description: patternCase.conversation_id }]
      : []),
  ];

  return (
    <EuiFlyout
      onClose={onClose}
      size="l"
      aria-labelledby={flyoutTitleId}
      data-test-subj="contextCaseDetailFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={flyoutTitleId}>{patternTitle(pattern)}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center" wrap>
              <EuiFlexItem grow={false}>
                <EuiBadge color={statusBadgeColor(patternCase.status)}>
                  {patternCase.status ?? '—'}
                </EuiBadge>
              </EuiFlexItem>
              {target && target !== '_' && (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">{target}</EuiBadge>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
          {position && (
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    size="s"
                    iconType="arrowLeft"
                    isDisabled={!onPrevious}
                    onClick={() => onPrevious?.()}
                    data-test-subj="contextCasePrevButton"
                  >
                    {caseLabels.previous}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    {i18n.translate('xpack.contextEngine.aiIndexDetail.caseDetail.position', {
                      defaultMessage: 'Case {n} of {total}',
                      values: { n: position.index + 1, total: position.total },
                    })}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    size="s"
                    iconType="arrowRight"
                    iconSide="right"
                    isDisabled={!onNext}
                    onClick={() => onNext?.()}
                    data-test-subj="contextCaseNextButton"
                  >
                    {caseLabels.next}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiTitle size="xs">
          <h3>{caseLabels.traceSection}</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        {canShowTrace ? (
          <div style={{ height: 360 }} data-test-subj="contextTraceWaterfall">
            <TraceWaterfall
              spans={traceResult.spans}
              traceId={traceId}
              durationMs={traceResult.durationMs}
              isLoading={traceResult.isLoading}
              error={traceResult.error}
            />
          </div>
        ) : (
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.contextEngine.aiIndexDetail.caseDetail.traceUnavailable', {
              defaultMessage:
                'No trace index is configured for this case, so the waterfall is unavailable.',
            })}
          </EuiText>
        )}

        <EuiHorizontalRule margin="m" />

        <EuiTitle size="xs">
          <h3>{caseLabels.caseSection}</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiDescriptionList type="column" columnWidths={[1, 2]} compressed listItems={caseItems} />

        {patternCase.query && (
          <>
            <EuiSpacer size="m" />
            <EuiText size="xs">
              <strong>{caseLabels.query}</strong>
            </EuiText>
            <EuiSpacer size="xs" />
            <EuiCodeBlock language="sql" fontSize="s" paddingSize="s" isCopyable>
              {patternCase.query}
            </EuiCodeBlock>
          </>
        )}

        {patternCase.error && (
          <>
            <EuiSpacer size="m" />
            <EuiText size="xs" color="danger">
              <strong>{caseLabels.error}</strong>
            </EuiText>
            <EuiSpacer size="xs" />
            <EuiCodeBlock fontSize="s" paddingSize="s" isCopyable>
              {patternCase.error}
            </EuiCodeBlock>
          </>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

const caseLabels = {
  previous: i18n.translate('xpack.contextEngine.aiIndexDetail.caseDetail.previous', {
    defaultMessage: 'Previous',
  }),
  next: i18n.translate('xpack.contextEngine.aiIndexDetail.caseDetail.next', {
    defaultMessage: 'Next',
  }),
  traceSection: i18n.translate('xpack.contextEngine.aiIndexDetail.caseDetail.traceSection', {
    defaultMessage: 'Trace',
  }),
  caseSection: i18n.translate('xpack.contextEngine.aiIndexDetail.caseDetail.caseSection', {
    defaultMessage: 'Case',
  }),
  status: i18n.translate('xpack.contextEngine.aiIndexDetail.caseDetail.status', {
    defaultMessage: 'Status',
  }),
  timestamp: i18n.translate('xpack.contextEngine.aiIndexDetail.caseDetail.timestamp', {
    defaultMessage: 'Timestamp',
  }),
  tool: i18n.translate('xpack.contextEngine.aiIndexDetail.caseDetail.tool', {
    defaultMessage: 'Tool',
  }),
  queryKind: i18n.translate('xpack.contextEngine.aiIndexDetail.caseDetail.queryKind', {
    defaultMessage: 'Query kind',
  }),
  targetIndex: i18n.translate('xpack.contextEngine.aiIndexDetail.caseDetail.targetIndex', {
    defaultMessage: 'Target index',
  }),
  duration: i18n.translate('xpack.contextEngine.aiIndexDetail.caseDetail.duration', {
    defaultMessage: 'Duration',
  }),
  returned: i18n.translate('xpack.contextEngine.aiIndexDetail.caseDetail.returned', {
    defaultMessage: 'Returned',
  }),
  signals: i18n.translate('xpack.contextEngine.aiIndexDetail.caseDetail.signals', {
    defaultMessage: 'Round signals',
  }),
  agent: i18n.translate('xpack.contextEngine.aiIndexDetail.caseDetail.agent', {
    defaultMessage: 'Agent',
  }),
  classifierLabels: i18n.translate('xpack.contextEngine.aiIndexDetail.caseDetail.labels', {
    defaultMessage: 'Labels',
  }),
  round: i18n.translate('xpack.contextEngine.aiIndexDetail.caseDetail.round', {
    defaultMessage: 'Trace (round)',
  }),
  conversation: i18n.translate('xpack.contextEngine.aiIndexDetail.caseDetail.conversation', {
    defaultMessage: 'Conversation',
  }),
  query: i18n.translate('xpack.contextEngine.aiIndexDetail.caseDetail.query', {
    defaultMessage: 'Query',
  }),
  error: i18n.translate('xpack.contextEngine.aiIndexDetail.caseDetail.errorLabel', {
    defaultMessage: 'Error',
  }),
};
