/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { FeatureWithFilter, Streams } from '@kbn/streams-schema';
import { getIndexPatternsForStream } from '@kbn/streams-schema';
import { conditionToESQL } from '@kbn/streamlang';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { DISCOVER_APP_LOCATOR } from '@kbn/discover-plugin/common';
import { useKibana } from '../../../hooks/use_kibana';
import { FeatureEventsSparkline } from './feature_events_sparkline';

export const FeatureEventsData = ({
  feature,
  definition,
}: {
  feature: FeatureWithFilter;
  definition: Streams.all.Definition;
}) => {
  const {
    dependencies: {
      start: { share },
    },
  } = useKibana();
  const useUrl = share.url.locators.useUrl;

  const esqlQuery = `FROM ${getIndexPatternsForStream(definition).join(',')}
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
              data-test-subj="feature_identification_existing_open_in_discover_button"
            >
              {i18n.translate('xpack.streams.identifiedFeatureEvents.viewAllLinkText', {
                defaultMessage: 'Open in Discover',
              })}
            </EuiButtonEmpty>
          ) : null}
        </EuiFlexItem>
      </EuiFlexGroup>

      <FeatureEventsSparkline
        feature={feature}
        definition={definition}
        hideAxis={false}
        height={200}
      />
    </>
  );
};
