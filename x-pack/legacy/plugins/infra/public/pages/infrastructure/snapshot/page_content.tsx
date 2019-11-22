/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { WithWaffleFilter } from '../../../containers/waffle/with_waffle_filters';
import { WithWaffleOptions } from '../../../containers/waffle/with_waffle_options';
import { WithWaffleTime } from '../../../containers/waffle/with_waffle_time';
import { WithOptions } from '../../../containers/with_options';
import { WithSource } from '../../../containers/with_source';
import { Layout } from '../../../components/inventory/layout';

export const SnapshotPageContent: React.FC = () => (
  <WithSource>
    {({ configuration, createDerivedIndexPattern, sourceId }) => (
      <WithOptions>
        {({ wafflemap }) => (
          <WithWaffleFilter indexPattern={createDerivedIndexPattern('metrics')}>
            {({ filterQueryAsJson, applyFilterQuery }) => (
              <WithWaffleTime>
                {({ currentTimeRange, isAutoReloading }) => (
                  <WithWaffleOptions>
                    {({
                      metric,
                      groupBy,
                      nodeType,
                      view,
                      changeView,
                      autoBounds,
                      boundsOverride,
                    }) => (
                      <Layout
                        filterQuery={filterQueryAsJson}
                        metric={metric}
                        groupBy={groupBy}
                        nodeType={nodeType}
                        sourceId={sourceId}
                        timeRange={currentTimeRange}
                        options={{
                          ...wafflemap,
                          metric,
                          fields: configuration && configuration.fields,
                          groupBy,
                        }}
                        onDrilldown={applyFilterQuery}
                        view={view}
                        onViewChange={changeView}
                        autoBounds={autoBounds}
                        boundsOverride={boundsOverride}
                      />
                    )}
                  </WithWaffleOptions>
                )}
              </WithWaffleTime>
            )}
          </WithWaffleFilter>
        )}
      </WithOptions>
    )}
  </WithSource>
);
