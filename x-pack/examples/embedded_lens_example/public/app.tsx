/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiTitle,
  EuiCallOut,
} from '@elastic/eui';
import { IndexPattern } from 'src/plugins/data/public';
import { CoreStart } from 'kibana/public';

import { StartDependencies } from './plugin';

export const App = (props: {
  core: CoreStart;
  plugins: StartDependencies;
  defaultIndexPattern: IndexPattern | null;
}) => {
  const [color, setColor] = useState('green');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaveModalVisible, setIsSaveModalVisible] = useState(false);
  const LensComponent = props.plugins.lens.EmbeddableComponent;
  const LensSaveModalComponent = props.plugins.lens.SaveModalComponent;

  const [time, setTime] = useState({
    from: 'now-5d',
    to: 'now',
  });

  return (
    <EuiPage>
      <EuiPageBody style={{ maxWidth: 1200, margin: '0 auto' }}>
        <EuiPageHeader>
          <EuiPageHeaderSection>
            <EuiTitle size="l">
              <h1>Embedded Lens vis</h1>
            </EuiTitle>
          </EuiPageHeaderSection>
        </EuiPageHeader>
        <EuiPageContent>
          <EuiPageContentBody style={{ maxWidth: 800, margin: '0 auto' }}>
            <p>
              This app embeds a Lens visualization by specifying the configuration. Data fetching
              and rendering is completely managed by Lens itself.
            </p>
            <p>
              The Change color button will update the configuration by picking a new random color of
              the series which causes Lens to re-render. The Edit button will take the current
              configuration and navigate to a prefilled editor.
            </p>
            {props.defaultIndexPattern && props.defaultIndexPattern.isTimeBased() ? (
              <>
                <LensComponent
                  id=""
                  withActions
                  style={{ height: 500 }}
                  timeRange={time}
                  attributes={{
                    title: '',
                    description: '',
                    visualizationType: 'lnsXY',
                    type: 'lens',
                    references: [
                      {
                        type: 'index-pattern',
                        id: '304509a0-46f7-11ec-a51b-5902f0886db7',
                        name: 'indexpattern-datasource-current-indexpattern',
                      },
                      {
                        type: 'index-pattern',
                        id: '304509a0-46f7-11ec-a51b-5902f0886db7',
                        name: 'indexpattern-datasource-layer-f05712e9-7b31-4684-a470-127afd8659de',
                      },
                    ],
                    state: {
                      visualization: {
                        yRightExtent: {
                          mode: 'full',
                        },
                        valueLabels: 'hide',
                        preferredSeriesType: 'bar_stacked',
                        legend: {
                          isVisible: true,
                          position: 'right',
                        },
                        layers: [
                          {
                            layerType: 'data',
                            xAccessor: 'f43d9f45-54b3-4b87-97a7-e31c5d59fb06',
                            layerId: 'f05712e9-7b31-4684-a470-127afd8659de',
                            accessors: ['e60e4ba2-024a-4785-8931-c85eb4ded81d'],
                            seriesType: 'line',
                            showGridlines: false,
                            position: 'top',
                          },
                        ],
                        yLeftExtent: {
                          mode: 'full',
                        },
                        title: 'Empty XY chart',
                      },
                      query: {
                        query: '',
                        language: 'kuery',
                      },
                      filters: [],
                      datasourceStates: {
                        indexpattern: {
                          layers: {
                            'f05712e9-7b31-4684-a470-127afd8659de': {
                              columnOrder: [
                                'f43d9f45-54b3-4b87-97a7-e31c5d59fb06',
                                'e60e4ba2-024a-4785-8931-c85eb4ded81d',
                              ],
                              columns: {
                                'e60e4ba2-024a-4785-8931-c85eb4ded81d': {
                                  sourceField: 'host.name',
                                  isBucketed: false,
                                  dataType: 'number',
                                  scale: 'ratio',
                                  operationType: 'unique_count',
                                  label: 'Unique count of host.name',
                                },
                                'f43d9f45-54b3-4b87-97a7-e31c5d59fb06': {
                                  sourceField: '@timestamp',
                                  isBucketed: true,
                                  dataType: 'date',
                                  scale: 'interval',
                                  operationType: 'date_histogram',
                                  label: '@timestamp',
                                  params: {
                                    interval: 'auto',
                                  },
                                },
                              },
                              incompleteColumns: {},
                            },
                          },
                        },
                      },
                    },
                  }}
                  onLoad={(val) => {
                    setIsLoading(val);
                  }}
                  onBrushEnd={({ range }) => {
                    setTime({
                      from: new Date(range[0]).toISOString(),
                      to: new Date(range[1]).toISOString(),
                    });
                  }}
                  onFilter={(_data) => {
                    // call back event for on filter event
                  }}
                  onTableRowClick={(_data) => {
                    // call back event for on table row click event
                  }}
                />
              </>
            ) : (
              <EuiCallOut
                title="Please define a default index pattern to use this demo"
                color="danger"
                iconType="alert"
              >
                <p>This demo only works if your default index pattern is set and time based</p>
              </EuiCallOut>
            )}
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
