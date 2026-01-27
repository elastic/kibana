/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import useToggle from 'react-use/lib/useToggle';
import type { Insight, InsightImpactLevel } from '@kbn/streams-schema';

const impactColors: Record<InsightImpactLevel, 'danger' | 'warning' | 'primary' | 'hollow'> = {
  critical: 'danger',
  high: 'warning',
  medium: 'primary',
  low: 'hollow',
};

const impactLabels: Record<InsightImpactLevel, string> = {
  critical: i18n.translate('xpack.streams.insights.impact.critical', {
    defaultMessage: 'Critical',
  }),
  high: i18n.translate('xpack.streams.insights.impact.high', {
    defaultMessage: 'High',
  }),
  medium: i18n.translate('xpack.streams.insights.impact.medium', {
    defaultMessage: 'Medium',
  }),
  low: i18n.translate('xpack.streams.insights.impact.low', {
    defaultMessage: 'Low',
  }),
};

interface InsightCardProps {
  insight: Insight;
  index: number;
}

export function InsightCard({ insight, index }: InsightCardProps) {
  const [isOpen, toggleIsOpen] = useToggle(index === 0);
  const accordionId = useGeneratedHtmlId({ prefix: 'insightAccordion' });

  return (
    <EuiPanel hasBorder paddingSize="m">
      <EuiAccordion
        id={accordionId}
        data-test-subj="streamsInsightCardAccordion"
        forceState={isOpen ? 'open' : 'closed'}
        onToggle={toggleIsOpen}
        buttonContent={
          <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiBadge color={impactColors[insight.impact]}>
                {impactLabels[insight.impact]}
              </EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="xs">
                <h3>{insight.title}</h3>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        paddingSize="m"
      >
        <EuiSpacer size="s" />

        <EuiText size="s">
          <p>{insight.description}</p>
        </EuiText>

        {insight.evidence.length > 0 && (
          <>
            <EuiSpacer size="m" />
            <EuiText size="xs">
              <strong>
                {i18n.translate('xpack.streams.insights.evidence', {
                  defaultMessage: 'Evidence:',
                })}
              </strong>
            </EuiText>
            <EuiSpacer size="xs" />
            <EuiFlexGroup direction="column" gutterSize="xs">
              {insight.evidence.map((ev, idx) => (
                <EuiFlexItem key={idx}>
                  <EuiPanel color="subdued" paddingSize="s" hasShadow={false}>
                    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <EuiBadge color="hollow">{ev.streamName}</EuiBadge>
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiText size="xs">
                          {i18n.translate('xpack.streams.insights.evidenceDescription', {
                            defaultMessage: '{queryTitle} ({eventCount} events)',
                            values: { queryTitle: ev.queryTitle, eventCount: ev.eventCount },
                          })}
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiPanel>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </>
        )}

        {insight.recommendations.length > 0 && (
          <>
            <EuiSpacer size="m" />
            <EuiText size="xs">
              <strong>
                {i18n.translate('xpack.streams.insights.recommendations', {
                  defaultMessage: 'Recommendations:',
                })}
              </strong>
            </EuiText>
            <EuiSpacer size="xs" />
            <EuiText size="s">
              <ul>
                {insight.recommendations.map((rec, idx) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            </EuiText>
          </>
        )}
      </EuiAccordion>
    </EuiPanel>
  );
}
