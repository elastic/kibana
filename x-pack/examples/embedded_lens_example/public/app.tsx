/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
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
import { ViewMode } from '../../../../src/plugins/embeddable/public';
import type {
  TypedLensByValueInput,
  PersistedIndexPatternLayer,
  XYState,
  LensEmbeddableInput,
  DateHistogramIndexPatternColumn,
  DatatableVisualizationState,
  HeatmapVisualizationState,
  GaugeVisualizationState,
  TermsIndexPatternColumn,
} from '../../../plugins/lens/public';
import { StartDependencies } from './plugin';

// @TODO: restore original example code
function getDataLayer(defaultIndexPattern: IndexPattern): PersistedIndexPatternLayer {
  return {
    columnOrder: ['col1', 'col2'],
    columns: {
      col2: {
        dataType: 'number',
        isBucketed: false,
        label: 'Count of records',
        operationType: 'count',
        scale: 'ratio',
        sourceField: 'Records',
      },
      col1: {
        dataType: 'date',
        isBucketed: true,
        label: '@timestamp',
        operationType: 'date_histogram',
        params: { interval: 'auto' },
        scale: 'interval',
        sourceField: defaultIndexPattern.timeFieldName!,
      } as DateHistogramIndexPatternColumn,
    },
  };
}

function getBaseAttributes(
  defaultIndexPattern: IndexPattern,
  dataLayer: PersistedIndexPatternLayer = getDataLayer(defaultIndexPattern)
): Omit<TypedLensByValueInput['attributes'], 'visualizationType' | 'state'> & {
  state: Omit<TypedLensByValueInput['attributes']['state'], 'visualization'>;
} {
  return {
    title: 'Prefilled from example app',
    references: [
      {
        id: defaultIndexPattern.id!,
        name: 'indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: defaultIndexPattern.id!,
        name: 'indexpattern-datasource-layer-layer1',
        type: 'index-pattern',
      },
    ],
    state: {
      datasourceStates: {
        indexpattern: {
          layers: {
            layer1: dataLayer,
          },
        },
      },
      filters: [],
      query: { language: 'kuery', query: '' },
    },
  };
}

// Generate a Lens state based on some app-specific input parameters.
// `TypedLensByValueInput` can be used for type-safety - it uses the same interfaces as Lens-internal code.
function getLensAttributes(
  defaultIndexPattern: IndexPattern,
  color: string
): TypedLensByValueInput['attributes'] {
  const baseAttributes = getBaseAttributes(defaultIndexPattern);

  const xyConfig: XYState = {
    axisTitlesVisibilitySettings: { x: true, yLeft: true, yRight: true },
    fittingFunction: 'None',
    gridlinesVisibilitySettings: { x: true, yLeft: true, yRight: true },
    layers: [
      {
        accessors: ['col2'],
        layerId: 'layer1',
        layerType: 'data',
        seriesType: 'bar_stacked',
        xAccessor: 'col1',
        yConfig: [{ forAccessor: 'col2', color }],
      },
    ],
    legend: { isVisible: true, position: 'right' },
    preferredSeriesType: 'bar_stacked',
    tickLabelsVisibilitySettings: { x: true, yLeft: true, yRight: true },
    valueLabels: 'hide',
  };

  return {
    ...baseAttributes,
    visualizationType: 'lnsXY',
    state: {
      ...baseAttributes.state,
      visualization: xyConfig,
    },
  };
}

function getLensAttributesHeatmap(
  defaultIndexPattern: IndexPattern
): TypedLensByValueInput['attributes'] {
  const dataLayer = getDataLayer(defaultIndexPattern);
  const heatmapDataLayer = {
    columnOrder: ['col1', 'col3', 'col2'],
    columns: {
      ...dataLayer.columns,
      col3: {
        label: 'Top values of @tags.keyword',
        dataType: 'string',
        operationType: 'terms',
        scale: 'ordinal',
        sourceField: '@tags.keyword',
        isBucketed: true,
        params: {
          size: 5,
          orderBy: { type: 'alphabetical', fallback: true },
          orderDirection: 'desc',
        },
      } as TermsIndexPatternColumn,
    },
  };

  const baseAttributes = getBaseAttributes(defaultIndexPattern, heatmapDataLayer);

  const heatmapConfig: HeatmapVisualizationState = {
    layerId: 'layer1',
    layerType: 'data',
    shape: 'heatmap',
    xAccessor: 'col1',
    yAccessor: 'col3',
    valueAccessor: 'col2',
    legend: { isVisible: true, position: 'right', type: 'heatmap_legend' },
    gridConfig: {
      isCellLabelVisible: true,
      isYAxisLabelVisible: true,
      isXAxisLabelVisible: true,
      type: 'heatmap_grid',
    },
  };

  return {
    ...baseAttributes,
    visualizationType: 'lnsHeatmap',
    state: {
      ...baseAttributes.state,
      visualization: heatmapConfig,
    },
  };
}

function getLensAttributesDatatable(
  defaultIndexPattern: IndexPattern
): TypedLensByValueInput['attributes'] {
  const baseAttributes = getBaseAttributes(defaultIndexPattern);

  const tableConfig: DatatableVisualizationState = {
    layerId: 'layer1',
    layerType: 'data',
    columns: [{ columnId: 'col1' }, { columnId: 'col2' }],
  };

  return {
    ...baseAttributes,
    visualizationType: 'lnsDatatable',
    state: {
      ...baseAttributes.state,
      visualization: tableConfig,
    },
  };
}

function getLensAttributesGauge(
  defaultIndexPattern: IndexPattern
): TypedLensByValueInput['attributes'] {
  const dataLayer = getDataLayer(defaultIndexPattern);
  const gaugeDataLayer = {
    columnOrder: ['col2'],
    columns: {
      col2: dataLayer.columns.col2,
    },
  };

  const baseAttributes = getBaseAttributes(defaultIndexPattern, gaugeDataLayer);
  const gaugeConfig: GaugeVisualizationState = {
    layerId: 'layer1',
    layerType: 'data',
    shape: 'horizontalBullet',
    ticksPosition: 'auto',
    labelMajorMode: 'auto',
    metricAccessor: 'col1',
  };
  return {
    ...baseAttributes,
    visualizationType: 'lnsGauge',
    state: {
      ...baseAttributes.state,
      visualization: gaugeConfig,
    },
  };
}

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
                <EuiFlexGroup>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      data-test-subj="lns-example-change-color"
                      isLoading={isLoading}
                      onClick={() => {
                        // eslint-disable-next-line no-bitwise
                        const newColor = '#' + ((Math.random() * 0xffffff) << 0).toString(16);
                        setColor(newColor);
                      }}
                    >
                      Change color
                    </EuiButton>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      aria-label="Open lens in new tab"
                      isDisabled={!props.plugins.lens.canUseEditor()}
                      onClick={() => {
                        props.plugins.lens.navigateToPrefilledEditor(
                          {
                            id: '',
                            timeRange: time,
                            attributes: getLensAttributes(props.defaultIndexPattern!, color),
                          },
                          {
                            openInNewTab: true,
                          }
                        );
                        // eslint-disable-next-line no-bitwise
                        const newColor = '#' + ((Math.random() * 0xffffff) << 0).toString(16);
                        setColor(newColor);
                      }}
                    >
                      Edit in Lens (new tab)
                    </EuiButton>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      aria-label="Open lens in same tab"
                      data-test-subj="lns-example-open-editor"
                      isDisabled={!props.plugins.lens.canUseEditor()}
                      onClick={() => {
                        props.plugins.lens.navigateToPrefilledEditor(
                          {
                            id: '',
                            timeRange: time,
                            attributes: getLensAttributes(props.defaultIndexPattern!, color),
                          },
                          {
                            openInNewTab: false,
                          }
                        );
                      }}
                    >
                      Edit in Lens (same tab)
                    </EuiButton>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      aria-label="Save visualization into library or embed directly into any dashboard"
                      data-test-subj="lns-example-save"
                      isDisabled={!getLensAttributes(props.defaultIndexPattern, color)}
                      onClick={() => {
                        setIsSaveModalVisible(true);
                      }}
                    >
                      Save Visualization
                    </EuiButton>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      aria-label="Change time range"
                      data-test-subj="lns-example-change-time-range"
                      isDisabled={!getLensAttributes(props.defaultIndexPattern, color)}
                      onClick={() => {
                        setTime({
                          from: '2015-09-18T06:31:44.000Z',
                          to: '2015-09-23T18:31:44.000Z',
                        });
                      }}
                    >
                      Change time range
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <LensComponent
                  id="myGauge"
                  style={{ height: 500 }}
                  attributes={getLensAttributesGauge(props.defaultIndexPattern)}
                  onLoad={(val) => {
                    setIsLoading(val);
                  }}
                  viewMode={ViewMode.VIEW}
                />
                <LensComponent
                  id=""
                  withActions
                  style={{ height: 500 }}
                  timeRange={time}
                  attributes={getLensAttributes(props.defaultIndexPattern, color)}
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
                  viewMode={ViewMode.VIEW}
                />
                {/* <LensComponent
                  id="myTable"
                  style={{ height: 500 }}
                  timeRange={time}
                  attributes={getLensAttributesDatatable(props.defaultIndexPattern)}
                  disableTriggers
                  onLoad={(val) => {
                    setIsLoading(val);
                  }}
                  viewMode={ViewMode.VIEW}
                />
                <LensComponent
                  id="myHeatmap"
                  style={{ height: 500 }}
                  timeRange={time}
                  attributes={getLensAttributesHeatmap(props.defaultIndexPattern)}
                  disableTriggers
                  onLoad={(val) => {
                    setIsLoading(val);
                  }}
                  viewMode={ViewMode.VIEW}
                /> */}
                {isSaveModalVisible && (
                  <LensSaveModalComponent
                    initialInput={
                      getLensAttributes(
                        props.defaultIndexPattern,
                        color
                      ) as unknown as LensEmbeddableInput
                    }
                    onSave={() => {}}
                    onClose={() => setIsSaveModalVisible(false)}
                  />
                )}
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
