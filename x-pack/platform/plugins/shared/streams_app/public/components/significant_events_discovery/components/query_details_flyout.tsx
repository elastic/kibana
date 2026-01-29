/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiCallOut,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { SignificantEventItem } from '../../../hooks/use_fetch_significant_events';
import { SeverityBadge } from './severity_badge';
import { InfoPanel } from '../../info_panel';
import { SparkPlot } from '../../spark_plot';
import { AssetImage } from '../../asset_image';

interface QueryDetailsFlyoutProps {
  item: SignificantEventItem | null;
  onClose: () => void;
}

export function QueryDetailsFlyout({ item, onClose }: QueryDetailsFlyoutProps) {
  if (!item) {
    return null;
  }

  const lastOccurrence = item.occurrences.findLast((occurrence) => occurrence.y !== 0);
  const lastDetectedDate = lastOccurrence
    ? new Date(lastOccurrence.x)
    : null;

  const formattedLastDetected = lastDetectedDate
    ? `${lastDetectedDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })} @ ${lastDetectedDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })}`
    : '--';

  const totalOccurrences = item.occurrences.reduce((sum, occurrence) => sum + occurrence.y, 0);
  const formattedOccurrences = totalOccurrences.toLocaleString('en-US');

  const features = item.query.feature
    ? [item.query.feature.name]
    : [];

  return (
    <EuiFlyout
      ownFocus
      aria-labelledby="queryDetailsFlyoutTitle"
      onClose={onClose}
      size="s"
      type="push"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem>
            <EuiTitle size="s">
              <h2 id="queryDetailsFlyoutTitle">
                {i18n.translate(
                  'xpack.streams.significantEventsDiscovery.queryDetailsFlyout.title',
                  {
                    defaultMessage: 'Significant event query details',
                  }
                )}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiCallOut
          size="s"
          iconType="info"
          color="primary"
          title={i18n.translate(
            'xpack.streams.significantEventsDiscovery.queryDetailsFlyout.duplicateInfo',
            {
              defaultMessage:
                "If you want to edit the details you must duplicate the rule. Edits might cause conflicting results.",
            }
          )}
        />
        <EuiSpacer size="l" />
        <InfoPanel
          title={i18n.translate(
            'xpack.streams.significantEventsDiscovery.queryDetailsFlyout.generalInformationTitle',
            {
              defaultMessage: 'General information',
            }
          )}
        >
          <EuiDescriptionList type="column" columnWidths={[1, 2]}>
            <EuiDescriptionListTitle>
              <EuiTitle size="xxxs">
                <span>
                  {i18n.translate(
                    'xpack.streams.significantEventsDiscovery.queryDetailsFlyout.titleLabel',
                    {
                      defaultMessage: 'Title',
                    }
                  )}
                </span>
              </EuiTitle>
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              <EuiText size="s">{item.query.title}</EuiText>
            </EuiDescriptionListDescription>

            <EuiDescriptionListTitle>
              <EuiTitle size="xxxs">
                <span>
                  {i18n.translate(
                    'xpack.streams.significantEventsDiscovery.queryDetailsFlyout.impactLabel',
                    {
                      defaultMessage: 'Impact',
                    }
                  )}
                </span>
              </EuiTitle>
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              <SeverityBadge score={item.query.severity_score} />
            </EuiDescriptionListDescription>

            <EuiDescriptionListTitle>
              <EuiTitle size="xxxs">
                <span>
                  {i18n.translate(
                    'xpack.streams.significantEventsDiscovery.queryDetailsFlyout.featuresLabel',
                    {
                      defaultMessage: 'Features',
                    }
                  )}
                </span>
              </EuiTitle>
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              {features.length > 0 ? (
                <EuiFlexGroup gutterSize="xs" wrap>
                  {features.map((feature, index) => (
                    <EuiFlexItem key={index} grow={false}>
                      <EuiBadge color="hollow">{feature}</EuiBadge>
                    </EuiFlexItem>
                  ))}
                </EuiFlexGroup>
              ) : (
                <EuiText size="xs">--</EuiText>
              )}
            </EuiDescriptionListDescription>

            <EuiDescriptionListTitle>
              <EuiTitle size="xxxs">
                <span>
                  {i18n.translate(
                    'xpack.streams.significantEventsDiscovery.queryDetailsFlyout.lastDetectedLabel',
                    {
                      defaultMessage: 'Last Detected',
                    }
                  )}
                </span>
              </EuiTitle>
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              <EuiText size="xs">{formattedLastDetected}</EuiText>
            </EuiDescriptionListDescription>

            <EuiDescriptionListTitle>
              <EuiTitle size="xxxs">
                <span>
                  {i18n.translate(
                    'xpack.streams.significantEventsDiscovery.queryDetailsFlyout.numberOfOccurrencesLabel',
                    {
                      defaultMessage: 'Number of occurrences',
                    }
                  )}
                </span>
              </EuiTitle>
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              <EuiText size="xs">{formattedOccurrences}</EuiText>
            </EuiDescriptionListDescription>
          </EuiDescriptionList>
        </InfoPanel>
        <EuiSpacer size="l" />
        <InfoPanel
          title={i18n.translate(
            'xpack.streams.significantEventsDiscovery.queryDetailsFlyout.detectedEventOccurrencesTitle',
            {
              defaultMessage: 'Detected event occurrences',
            }
          )}
        >
          {totalOccurrences === 0 ? (
            <EuiFlexGroup
              direction="column"
              gutterSize="s"
              alignItems="center"
              justifyContent="center"
              css={{ height: '100%', minHeight: '200px' }}
            >
              <AssetImage type="barChart" size="xs" />
              <EuiText color="subdued" size="s" textAlign="center">
                {i18n.translate(
                  'xpack.streams.significantEventsDiscovery.queryDetailsFlyout.noEventsDetected',
                  {
                    defaultMessage:
                      "We currently don't detect any events. You can leave it, as it might happen later or modify the query.",
                  }
                )}
              </EuiText>
            </EuiFlexGroup>
          ) : (
            <SparkPlot
              id={`query-details-occurrences-${item.query.id}`}
              name={i18n.translate(
                'xpack.streams.significantEventsDiscovery.queryDetailsFlyout.occurrencesChartName',
                { defaultMessage: 'Occurrences' }
              )}
              type="bar"
              timeseries={item.occurrences}
              annotations={[]}
              compressed={false}
              hideAxis={false}
              height={180}
            />
          )}
        </InfoPanel>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}
