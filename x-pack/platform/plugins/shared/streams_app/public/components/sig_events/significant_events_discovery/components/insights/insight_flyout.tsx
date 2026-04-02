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
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHealth,
  EuiHorizontalRule,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Insight } from '@kbn/streams-schema';
import { InfoPanel } from '../../../../info_panel';
import { impactBadgeColors, impactLabels } from './insight_constants';
import { FeedbackButtons } from './feedback_buttons';
import { formatGeneratedAt } from './utils';

interface InsightFlyoutProps {
  insight: Insight;
  onClose: () => void;
}

export const InsightFlyout = ({ insight, onClose }: InsightFlyoutProps) => {
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'insightFlyoutTitle' });

  const detailItems = [
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
    {
      title: i18n.translate('xpack.streams.insightFlyout.discoveredAtLabel', {
        defaultMessage: 'Discovered at',
      }),
      description: (
        <EuiText size="s" color="subdued">
          {formatGeneratedAt(insight.generated_at)}
        </EuiText>
      ),
    },
  ];

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
              {detailItems.map((item, index) => (
                <React.Fragment key={item.title}>
                  <EuiDescriptionList
                    type="column"
                    columnWidths={[1, 2]}
                    compressed
                    listItems={[item]}
                  />
                  {index < detailItems.length - 1 && <EuiHorizontalRule margin="m" />}
                </React.Fragment>
              ))}
            </InfoPanel>
          </EuiFlexItem>

          <EuiFlexItem>
            <InfoPanel
              title={i18n.translate('xpack.streams.insightFlyout.summaryTitle', {
                defaultMessage: 'Summary',
              })}
            >
              <EuiText size="s">{insight.description}</EuiText>
            </InfoPanel>
          </EuiFlexItem>

          {insight.evidence.length > 0 && (
            <EuiFlexItem>
              <InfoPanel
                title={i18n.translate('xpack.streams.insightFlyout.evidenceTitle', {
                  defaultMessage: 'Evidence',
                })}
              >
                {insight.evidence.map((ev, idx) => (
                  <React.Fragment key={idx}>
                    <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <EuiHealth color="subdued" />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
                          <EuiFlexItem grow={false}>
                            <EuiText size="s">
                              {i18n.translate('xpack.streams.insightFlyout.evidenceDescription', {
                                defaultMessage: '{queryTitle} ({eventCount} events)',
                                values: {
                                  queryTitle: ev.query_title,
                                  eventCount: ev.event_count,
                                },
                              })}
                            </EuiText>
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            <EuiBadge color="hollow">{ev.stream_name}</EuiBadge>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                    {idx < insight.evidence.length - 1 && <EuiHorizontalRule margin="m" />}
                  </React.Fragment>
                ))}
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

      <EuiFlyoutFooter>
        <FeedbackButtons />
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
