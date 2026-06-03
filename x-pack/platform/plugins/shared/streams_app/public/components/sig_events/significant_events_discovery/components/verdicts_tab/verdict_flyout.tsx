/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiDescriptionList,
  EuiLoadingSpinner,
  EuiListGroup,
  EuiTimeline,
  EuiTimelineItem,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Verdict } from '@kbn/streams-schema';
import { formatTimestamp } from '../../../../../util/formatters';
import { VERDICT_LABELS } from '../shared/translations';
import { VERDICT_COLORS } from '../shared/constants';

interface VerdictFlyoutProps {
  verdict: Verdict;
  history: Verdict[];
  isHistoryLoading: boolean;
  onClose: () => void;
}

export const VerdictFlyout = ({
  verdict,
  history,
  isHistoryLoading,
  onClose,
}: VerdictFlyoutProps) => {
  const titleId = useGeneratedHtmlId();

  const streams = useMemo(() => {
    const fromEvidences = (verdict.evidences ?? [])
      .map((e) => e.stream_name)
      .filter((s): s is string => !!s);
    return [...new Set(fromEvidences.length > 0 ? fromEvidences : verdict.stream_names ?? [])];
  }, [verdict]);

  const diagnostics = useMemo(
    () => [
      {
        title: i18n.translate('xpack.streams.verdictFlyout.criticality', {
          defaultMessage: 'Criticality',
        }),
        description: verdict.criticality != null ? String(verdict.criticality) : '-',
      },
      {
        title: i18n.translate('xpack.streams.verdictFlyout.confidence', {
          defaultMessage: 'Confidence',
        }),
        description: verdict.confidence != null ? `${verdict.confidence}%` : '-',
      },
      ...(streams.length > 0
        ? [
            {
              title: i18n.translate('xpack.streams.verdictFlyout.streams', {
                defaultMessage: 'Streams',
              }),
              description: streams.join(', '),
            },
          ]
        : []),
      {
        title: i18n.translate('xpack.streams.verdictFlyout.discoverySlug', {
          defaultMessage: 'Discovery',
        }),
        description: verdict.discovery_slug,
      },
    ],
    [verdict, streams]
  );

  return (
    <EuiFlyout onClose={onClose} size="m" aria-labelledby={titleId}>
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="s" wrap>
          <EuiFlexItem grow={false}>
            <EuiBadge color={VERDICT_COLORS[verdict.verdict] ?? 'default'}>
              {VERDICT_LABELS[verdict.verdict] ?? verdict.verdict}
            </EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiTitle size="m">
          <h2 id={titleId}>{verdict.title}</h2>
        </EuiTitle>
        <EuiText size="s" color="subdued">
          {formatTimestamp(verdict['@timestamp'])}
        </EuiText>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiDescriptionList
          type="column"
          columnWidths={[1, 2]}
          listItems={diagnostics}
          compressed
        />

        <EuiSpacer size="l" />

        <EuiTitle size="xs">
          <h3>
            {i18n.translate('xpack.streams.verdictFlyout.verdictSummary', {
              defaultMessage: 'Verdict',
            })}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s">{verdict.verdict_summary}</EuiText>

        <EuiSpacer size="l" />

        <EuiTitle size="xs">
          <h3>
            {i18n.translate('xpack.streams.verdictFlyout.rootCause', {
              defaultMessage: 'Root Cause',
            })}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s">{verdict.root_cause}</EuiText>

        {(verdict.recommendations ?? []).length > 0 && (
          <>
            <EuiSpacer size="l" />
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('xpack.streams.verdictFlyout.recommendations', {
                  defaultMessage: 'Recommendations',
                })}
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiListGroup
              wrapText
              maxWidth={false}
              listItems={(verdict.recommendations ?? []).map((rec) => ({
                label: rec,
                size: 's' as const,
                iconType: 'dot' as const,
              }))}
            />
          </>
        )}

        <EuiSpacer size="l" />

        <EuiTitle size="xs">
          <h3>
            {i18n.translate('xpack.streams.verdictFlyout.timeline', {
              defaultMessage: 'Timeline',
            })}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />

        {isHistoryLoading ? (
          <EuiLoadingSpinner size="m" />
        ) : history.length === 0 ? (
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.streams.verdictFlyout.noHistory', {
              defaultMessage: 'No history available.',
            })}
          </EuiText>
        ) : (
          <EuiTimeline
            aria-label={i18n.translate('xpack.streams.verdictFlyout.timeline.ariaLabel', {
              defaultMessage: 'Verdict history',
            })}
            gutterSize="m"
          >
            {history.map((entry, idx) => (
              <EuiTimelineItem
                key={`${entry['@timestamp']}-${idx}`}
                icon="dot"
                iconAriaLabel={VERDICT_LABELS[entry.verdict] ?? entry.verdict}
                verticalAlign="top"
              >
                <EuiFlexGroup gutterSize="xs" alignItems="center" wrap responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color={VERDICT_COLORS[entry.verdict] ?? 'hollow'}>
                      {VERDICT_LABELS[entry.verdict] ?? entry.verdict}
                    </EuiBadge>
                  </EuiFlexItem>
                  {entry.criticality != null && (
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs" color="subdued">
                        {i18n.translate('xpack.streams.verdictFlyout.timeline.criticality', {
                          defaultMessage: 'Criticality {n}',
                          values: { n: entry.criticality },
                        })}
                      </EuiText>
                    </EuiFlexItem>
                  )}
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="subdued">
                      {formatTimestamp(entry['@timestamp'])}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
                {entry.verdict_summary && (
                  <EuiText size="s">
                    <p>{entry.verdict_summary}</p>
                  </EuiText>
                )}
                {entry.assessment_note && (
                  <EuiText size="xs" color="subdued">
                    <p>{entry.assessment_note}</p>
                  </EuiText>
                )}
              </EuiTimelineItem>
            ))}
          </EuiTimeline>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
