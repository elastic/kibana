/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiPanel,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Insight } from '@kbn/streams-schema';
import { InfoPanel } from '../../../info_panel';
import { impactBadgeColors, impactLabels } from './insight_constants';

interface InsightFlyoutProps {
  insight: Insight;
  onClose: () => void;
}

export const InsightFlyout = ({ insight, onClose }: InsightFlyoutProps) => {
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'insightFlyoutTitle' });

  return (
    <EuiFlyout
      onClose={onClose}
      aria-labelledby={flyoutTitleId}
      type="push"
      ownFocus={false}
      size="40%"
      hideCloseButton
      data-test-subj="streamsInsightFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem>
            <EuiTitle size="m">
              <h2 id={flyoutTitleId}>{insight.title}</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              data-test-subj="streamsInsightFlyoutCloseButton"
              iconType="cross"
              aria-label={i18n.translate('xpack.streams.insightFlyout.closeButtonAriaLabel', {
                defaultMessage: 'Close',
              })}
              onClick={onClose}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiFlexItem>
            <InfoPanel
              title={i18n.translate('xpack.streams.insightFlyout.detailsTitle', {
                defaultMessage: 'Significant event details',
              })}
            >
              <EuiDescriptionList
                type="column"
                columnWidths={[1, 2]}
                compressed
                listItems={[
                  {
                    title: i18n.translate('xpack.streams.insightFlyout.impactLabel', {
                      defaultMessage: 'Severity',
                    }),
                    description: (
                      <EuiBadge color={impactBadgeColors[insight.impact]}>
                        {impactLabels[insight.impact]}
                      </EuiBadge>
                    ),
                  },
                ]}
              />
              <EuiHorizontalRule margin="m" />
              <EuiDescriptionList
                type="column"
                columnWidths={[1, 2]}
                compressed
                listItems={[
                  {
                    title: i18n.translate('xpack.streams.insightFlyout.summaryLabel', {
                      defaultMessage: 'Summary',
                    }),
                    description: <EuiText size="s">{insight.description}</EuiText>,
                  },
                ]}
              />
            </InfoPanel>
          </EuiFlexItem>

          {insight.evidence.length > 0 && (
            <EuiFlexItem>
              <InfoPanel
                title={i18n.translate('xpack.streams.insightFlyout.evidenceTitle', {
                  defaultMessage: 'Evidence',
                })}
              >
                <EuiFlexGroup direction="column" gutterSize="xs">
                  {insight.evidence.map((ev, idx) => (
                    <EuiFlexItem key={idx}>
                      <EuiPanel color="subdued" paddingSize="s" hasShadow={false}>
                        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                          <EuiFlexItem grow={false}>
                            <EuiBadge color="hollow">{ev.stream_name}</EuiBadge>
                          </EuiFlexItem>
                          <EuiFlexItem>
                            <EuiText size="xs">
                              {i18n.translate('xpack.streams.insightFlyout.evidenceDescription', {
                                defaultMessage: '{queryTitle} ({eventCount} events)',
                                values: {
                                  queryTitle: ev.query_title,
                                  eventCount: ev.event_count,
                                },
                              })}
                            </EuiText>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </EuiPanel>
                    </EuiFlexItem>
                  ))}
                </EuiFlexGroup>
              </InfoPanel>
            </EuiFlexItem>
          )}

          {insight.recommendations.length > 0 && (
            <EuiFlexItem>
              <InfoPanel
                title={i18n.translate('xpack.streams.insightFlyout.recommendationsTitle', {
                  defaultMessage: 'Recommendations',
                })}
              >
                <EuiText size="s">
                  <ul>
                    {insight.recommendations.map((rec, idx) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </EuiText>
              </InfoPanel>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
