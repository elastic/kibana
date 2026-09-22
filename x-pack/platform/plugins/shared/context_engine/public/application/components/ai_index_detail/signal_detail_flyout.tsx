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
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { TraceWaterfall, createEsTraceFetcher, useTraceSpans } from '@kbn/llm-trace-waterfall';
import React, { useMemo } from 'react';
import { buildAgentBuilderTracesIndexName } from '../../../../common/constants';
import type { Signal } from '../../../../common/http_api/signals';
import { useKibana } from '../../hooks/use_kibana';
import { useSpaceId } from '../../hooks/use_space_id';
import {
  humanizeQueryKind,
  humanizeTagType,
  signalTitle,
  SIGNAL_STATUS_ERROR,
} from './signal_format';

const traceContainerStyle = css`
  height: 360px;
`;

interface SignalDetailFlyoutProps {
  signals: Signal[];
  /** Total number of signals in the group (from the badge), used for the "Signal X of N" label. */
  total: number;
  index: number;
  onNavigate: (index: number) => void;
  onClose: () => void;
}

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <EuiTitle size="xs">
    <h3>{children}</h3>
  </EuiTitle>
);

export const SignalDetailFlyout = ({
  signals,
  total,
  index,
  onNavigate,
  onClose,
}: SignalDetailFlyoutProps) => {
  const {
    services: { data, spaces },
  } = useKibana();
  const { spaceId, isResolving: isResolvingSpace } = useSpaceId(spaces);

  const signal = signals[index];

  const tracesIndex = spaceId ? buildAgentBuilderTracesIndexName(spaceId) : undefined;
  const traceId = signal?.trace_ids?.[0];
  // Gate on the trace id, not on `data.search.search` (which is always defined).
  const canShowTrace = Boolean(tracesIndex && traceId);
  // A signal with a trace id but no space yet is still *resolving* — don't flash the terminal
  // "no trace" message before the active space (and thus the traces index) is known.
  const isTraceResolving = Boolean(traceId) && !tracesIndex && isResolvingSpace;

  const fetchTrace = useMemo(
    () =>
      tracesIndex
        ? createEsTraceFetcher(data.search.search, { index: tracesIndex })
        : async () => ({ spans: [], durationMs: 0 }),
    [data.search.search, tracesIndex]
  );

  const traceResult = useTraceSpans(canShowTrace && traceId ? traceId : null, { fetchTrace });

  if (!signal) {
    return null;
  }

  const { data: signalData } = signal;
  // Navigation is bounded by the loaded page, while the "of N" label reflects the group total.
  const loadedCount = signals.length;
  const hasPrevious = index > 0;
  const hasNext = index < loadedCount - 1;

  const fields = [
    {
      title: i18n.translate('xpack.contextEngine.aiIndexDetail.signals.field.tool', {
        defaultMessage: 'Tool',
      }),
      description: signalData.tool,
    },
    {
      title: i18n.translate('xpack.contextEngine.aiIndexDetail.signals.field.queryKind', {
        defaultMessage: 'Query kind',
      }),
      description: humanizeQueryKind(signalData.query_kind),
    },
    {
      title: i18n.translate('xpack.contextEngine.aiIndexDetail.signals.field.targetIndex', {
        defaultMessage: 'Target index',
      }),
      description: signalData.target_index,
    },
    {
      title: i18n.translate('xpack.contextEngine.aiIndexDetail.signals.field.status', {
        defaultMessage: 'Status',
      }),
      description: signalData.status,
    },
    {
      title: i18n.translate('xpack.contextEngine.aiIndexDetail.signals.field.agent', {
        defaultMessage: 'Agent',
      }),
      description: `${signalData.agent.name} (${signalData.agent.class})`,
    },
    {
      title: i18n.translate('xpack.contextEngine.aiIndexDetail.signals.field.producer', {
        defaultMessage: 'Producer',
      }),
      description: signalData.producer,
    },
    {
      title: i18n.translate('xpack.contextEngine.aiIndexDetail.signals.field.rowCount', {
        defaultMessage: 'Rows returned',
      }),
      description: String(signalData.returned.row_count),
    },
    {
      title: i18n.translate('xpack.contextEngine.aiIndexDetail.signals.field.duration', {
        defaultMessage: 'Duration (ms)',
      }),
      description: String(signalData.duration_ms),
    },
    {
      title: i18n.translate('xpack.contextEngine.aiIndexDetail.signals.field.timestamp', {
        defaultMessage: 'Timestamp',
      }),
      description: signal['@timestamp'],
    },
    ...(signalData.conversation_id
      ? [
          {
            title: i18n.translate(
              'xpack.contextEngine.aiIndexDetail.signals.field.conversationId',
              { defaultMessage: 'Conversation id' }
            ),
            description: signalData.conversation_id,
          },
        ]
      : []),
  ];

  return (
    <EuiFlyout
      size="l"
      onClose={onClose}
      ownFocus
      data-test-subj="contextSignalDetailFlyout"
      aria-labelledby="contextSignalDetailFlyoutTitle"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="contextSignalDetailFlyoutTitle">{signalTitle(signal)}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="xs" responsive={false} wrap alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiBadge
              color={signalData.status === SIGNAL_STATUS_ERROR ? 'danger' : 'success'}
              data-test-subj="contextSignalDetailStatus"
            >
              {signalData.status}
            </EuiBadge>
          </EuiFlexItem>
          {signal.tags.map((tag) => (
            <EuiFlexItem grow={false} key={tag}>
              <EuiBadge color="hollow" data-test-subj="contextSignalDetailTag">
                {humanizeTagType(tag)}
              </EuiBadge>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              iconType="arrowLeft"
              isDisabled={!hasPrevious}
              onClick={() => onNavigate(index - 1)}
              data-test-subj="contextSignalDetailPreviousButton"
            >
              {i18n.translate('xpack.contextEngine.aiIndexDetail.signals.previousButton', {
                defaultMessage: 'Previous',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued" data-test-subj="contextSignalDetailPosition">
              {i18n.translate('xpack.contextEngine.aiIndexDetail.signals.position', {
                defaultMessage: 'Signal {position} of {total}',
                values: { position: index + 1, total },
              })}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              iconType="arrowRight"
              iconSide="right"
              isDisabled={!hasNext}
              onClick={() => onNavigate(index + 1)}
              data-test-subj="contextSignalDetailNextButton"
            >
              {i18n.translate('xpack.contextEngine.aiIndexDetail.signals.nextButton', {
                defaultMessage: 'Next',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <SectionTitle>
          {i18n.translate('xpack.contextEngine.aiIndexDetail.signals.traceSectionTitle', {
            defaultMessage: 'Trace',
          })}
        </SectionTitle>
        <EuiSpacer size="s" />
        {canShowTrace ? (
          <div css={traceContainerStyle} data-test-subj="contextSignalDetailTrace">
            <TraceWaterfall
              spans={traceResult.spans}
              traceId={traceId}
              durationMs={traceResult.durationMs}
              isLoading={traceResult.isLoading}
              error={traceResult.error}
            />
          </div>
        ) : isTraceResolving ? (
          <EuiSkeletonText lines={3} data-test-subj="contextSignalDetailTraceLoading" />
        ) : (
          <EuiText size="s" color="subdued" data-test-subj="contextSignalDetailNoTrace">
            <p>
              {i18n.translate('xpack.contextEngine.aiIndexDetail.signals.noTrace', {
                defaultMessage: 'No trace is associated with this signal.',
              })}
            </p>
          </EuiText>
        )}

        <EuiSpacer size="l" />

        <SectionTitle>
          {i18n.translate('xpack.contextEngine.aiIndexDetail.signals.fieldsSectionTitle', {
            defaultMessage: 'Fields',
          })}
        </SectionTitle>
        <EuiSpacer size="s" />
        <EuiDescriptionList
          type="column"
          compressed
          listItems={fields}
          data-test-subj="contextSignalDetailFields"
        />

        {signalData.query && (
          <>
            <EuiSpacer size="l" />
            <SectionTitle>
              {i18n.translate('xpack.contextEngine.aiIndexDetail.signals.querySectionTitle', {
                defaultMessage: 'Query',
              })}
            </SectionTitle>
            <EuiSpacer size="s" />
            <EuiCodeBlock
              language="sql"
              paddingSize="m"
              isCopyable
              data-test-subj="contextSignalDetailQuery"
            >
              {signalData.query}
            </EuiCodeBlock>
          </>
        )}

        {signalData.error && (
          <>
            <EuiSpacer size="l" />
            <SectionTitle>
              {i18n.translate('xpack.contextEngine.aiIndexDetail.signals.errorSectionTitle', {
                defaultMessage: 'Error',
              })}
            </SectionTitle>
            <EuiSpacer size="s" />
            <EuiCodeBlock paddingSize="m" isCopyable data-test-subj="contextSignalDetailError">
              {signalData.error}
            </EuiCodeBlock>
          </>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
