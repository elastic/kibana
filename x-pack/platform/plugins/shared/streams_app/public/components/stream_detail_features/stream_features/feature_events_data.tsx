/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Chart, BarSeries, Settings } from '@elastic/charts';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { FeatureWithFilter } from '@kbn/streams-schema';
import { getIndexPatternsForStream } from '@kbn/streams-schema';
import { conditionToESQL } from '@kbn/streamlang';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { DISCOVER_APP_LOCATOR } from '@kbn/discover-plugin/common';
import { useStreamFeatureEventsData } from './hooks/use_stream_feature_events_data';
import { useKibana } from '../../../hooks/use_kibana';
import { useStreamDetail } from '../../../hooks/use_stream_detail';

export const FeatureEventsData = ({ feature }: { feature: FeatureWithFilter }) => {
  const chartBaseTheme = useElasticChartsTheme();

  const events = useStreamFeatureEventsData(feature);

  const {
    dependencies: {
      start: { share },
    },
  } = useKibana();
  const useUrl = share.url.locators.useUrl;

  const { definition } = useStreamDetail();
  const esqlQuery = `FROM ${getIndexPatternsForStream(definition.stream).join(',')}
      | WHERE ${conditionToESQL(feature.filter)}`;

  const discoverLink = useUrl<DiscoverAppLocatorParams>(
    () => ({
      id: DISCOVER_APP_LOCATOR,
      params: {
        query: { esql: esqlQuery },
        timeRange: { from: 'now-24h', to: 'now' },
      },
    }),
    [esqlQuery]
  );

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.streams.identifiedFeatureEvents.label', {
              defaultMessage: 'Identified feature events',
            })}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {discoverLink ? (
            <EuiButtonEmpty
              size="s"
              href={discoverLink}
              aria-label={i18n.translate(
                'xpack.streams.identifiedFeatureEvents.viewAllLinkAriaLabel',
                {
                  defaultMessage: 'Open in Discover',
                }
              )}
            >
              {i18n.translate('xpack.streams.identifiedFeatureEvents.viewAllLinkText', {
                defaultMessage: 'Open in Discover',
              })}
            </EuiButtonEmpty>
          ) : null}
        </EuiFlexItem>
      </EuiFlexGroup>
      <Chart size={{ height: 64 }}>
        <Settings baseTheme={chartBaseTheme} showLegend={false} />
        <BarSeries id="numbers" data={events} xAccessor={0} yAccessors={[1]} />
      </Chart>
    </>
  );
};
