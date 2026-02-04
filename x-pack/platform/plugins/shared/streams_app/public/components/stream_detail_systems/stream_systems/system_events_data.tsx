/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Streams, type System, getDiscoverEsqlQuery } from '@kbn/streams-schema';
import { conditionToESQL } from '@kbn/streamlang';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { DISCOVER_APP_LOCATOR } from '@kbn/discover-plugin/common';
import { useKibana } from '../../../hooks/use_kibana';
import { useStreamDetail } from '../../../hooks/use_stream_detail';
import { SystemEventsSparklineLast24hrs } from './system_events_sparkline';

export const SystemEventsData = ({
  system,
  definition,
}: {
  system: System;
  definition: Streams.all.Definition;
}) => {
  const {
    dependencies: {
      start: { share },
    },
  } = useKibana();
  // Get index_mode from the stream detail context (API response)
  const { definition: fullDefinition } = useStreamDetail();
  const useUrl = share.url.locators.useUrl;

  const indexMode = Streams.ingest.all.GetResponse.is(fullDefinition)
    ? fullDefinition.index_mode
    : undefined;
  const baseQuery = getDiscoverEsqlQuery({ definition, indexMode });
  const esqlQuery = baseQuery
    ? `${baseQuery}
      | WHERE ${conditionToESQL(system.filter)}`
    : undefined;

  const discoverLink = useUrl<DiscoverAppLocatorParams>(
    () => ({
      id: DISCOVER_APP_LOCATOR,
      params: {
        query: { esql: esqlQuery || '' },
        timeRange: { from: 'now-24h', to: 'now' },
      },
    }),
    [esqlQuery]
  );

  return (
    <>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h3>
              {i18n.translate('xpack.streams.identifiedSystemEvents.label', {
                defaultMessage: 'Detected system events',
              })}
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {discoverLink && esqlQuery ? (
            <EuiButtonEmpty
              size="s"
              href={discoverLink}
              aria-label={i18n.translate(
                'xpack.streams.identifiedSystemEvents.viewAllLinkAriaLabel',
                {
                  defaultMessage: 'Open in Discover',
                }
              )}
              data-test-subj="system_identification_existing_open_in_discover_button"
            >
              {i18n.translate('xpack.streams.identifiedSystemEvents.viewAllLinkText', {
                defaultMessage: 'Open in Discover',
              })}
            </EuiButtonEmpty>
          ) : null}
        </EuiFlexItem>
      </EuiFlexGroup>

      <SystemEventsSparklineLast24hrs
        system={system}
        definition={definition}
        hideAxis={false}
        height={200}
      />
    </>
  );
};
