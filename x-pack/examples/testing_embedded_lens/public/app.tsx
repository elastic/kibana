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
  EuiFlexGrid,
} from '@elastic/eui';
import type { CoreStart } from 'kibana/public';
import type { DataView } from '../../../../src/plugins/data_views/public';
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
  LensPublicStart,
  RangeIndexPatternColumn,
} from '../../../plugins/lens/public';
import type { StartDependencies } from './plugin';
import type { ActionExecutionContext } from '../../../../src/plugins/ui_actions/public';

const requiredTypes = ['date', 'string', 'number'] as const;
type RequiredType = typeof requiredTypes[number];
type FieldsMap = Record<RequiredType, string>;

function getInitialType(dataView: DataView) {
  return dataView.isTimeBased() ? 'date' : 'number';
}

function getColumnFor(type: RequiredType, fieldName: string) {
  if (type === 'string') {
    return {
      label: `Top values of ${fieldName}`,
      dataType: 'string',
      operationType: 'terms',
      scale: 'ordinal',
      sourceField: fieldName,
      isBucketed: true,
      params: {
        size: 5,
        orderBy: { type: 'alphabetical', fallback: true },
        orderDirection: 'desc',
      },
    } as TermsIndexPatternColumn;
  }
  if (type === 'number') {
    return {
      label: fieldName,
      dataType: 'number',
      operationType: 'range',
      sourceField: fieldName,
      isBucketed: true,
      scale: 'interval',
      params: {
        type: 'histogram',
        maxBars: 'auto',
        format: undefined,
        parentFormat: undefined,
      },
    } as RangeIndexPatternColumn;
  }
  return {
    dataType: 'date',
    isBucketed: true,
    label: '@timestamp',
    operationType: 'date_histogram',
    params: { interval: 'auto' },
    scale: 'interval',
    sourceField: fieldName,
  } as DateHistogramIndexPatternColumn;
}

function getDataLayer(type: RequiredType, field: string): PersistedIndexPatternLayer {
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
      col1: getColumnFor(type, field),
    },
  };
}

function getBaseAttributes(
  defaultIndexPattern: DataView,
  fields: FieldsMap,
  type?: RequiredType,
  dataLayer?: PersistedIndexPatternLayer
): Omit<TypedLensByValueInput['attributes'], 'visualizationType' | 'state'> & {
  state: Omit<TypedLensByValueInput['attributes']['state'], 'visualization'>;
} {
  const finalType = type ?? getInitialType(defaultIndexPattern);
  const finalDataLayer = getDataLayer(finalType, fields[finalType]);
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
            layer1: finalDataLayer,
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
  defaultIndexPattern: DataView,
  fields: FieldsMap,
  color: string
): TypedLensByValueInput['attributes'] {
  const baseAttributes = getBaseAttributes(defaultIndexPattern, fields);

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
  defaultIndexPattern: DataView,
  fields: FieldsMap
): TypedLensByValueInput['attributes'] {
  const initialType = getInitialType(defaultIndexPattern);
  const dataLayer = getDataLayer(initialType, fields[initialType]);
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
  defaultIndexPattern: DataView
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
  defaultIndexPattern: DataView
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

function getOpenInLensAction(id: string, actionFn: () => void) {
  return {
    id: `openInLens${id.toUpperCase()}`,
    type: 'link',
    getIconType: () => 'lens',
    async isCompatible(context: ActionExecutionContext<object>): Promise<boolean> {
      return true;
    },
    execute: async (context: ActionExecutionContext<object>) => {
      actionFn();
      return;
    },
    getDisplayName: () => 'Open in Lens',
  };
}

function getFieldsByType(dataView: DataView) {
  const aggregatableFields = dataView.fields.filter((f) => f.aggregatable);
  const fields: Partial<FieldsMap> = {
    string: aggregatableFields.find((f) => f.type === 'string')?.displayName,
    number: aggregatableFields.find((f) => f.type === 'number')?.displayName,
  };
  if (dataView.isTimeBased()) {
    fields.date = dataView.getTimeField().displayName;
  }
  // remove undefined values
  for (const type of requiredTypes) {
    if (typeof fields[type] == null) {
      delete fields[type];
    }
  }
  return fields;
}

export const App = (props: {
  core: CoreStart;
  plugins: StartDependencies;
  defaultIndexPattern: DataView;
  stateHelpers: Awaited<ReturnType<LensPublicStart['stateHelperApi']>>;
}) => {
  const [color, setColor] = useState('green');
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const [isSaveModalVisible, setIsSaveModalVisible] = useState(false);
  const [enableExtraAction, setEnableExtraAction] = useState(false);
  const [enableDefaultAction, setEnableDefaultAction] = useState(false);
  const LensComponent = props.plugins.lens.EmbeddableComponent;
  const LensSaveModalComponent = props.plugins.lens.SaveModalComponent;

  const fields = getFieldsByType(props.defaultIndexPattern);

  const [time, setTime] = useState({
    from: 'now-5d',
    to: 'now',
  });

  const charts = [
    { id: 'xy', attributes: getLensAttributes(props.defaultIndexPattern, fields, color) },
    { id: 'table', attributes: getLensAttributesDatatable(props.defaultIndexPattern, fields) },
    { id: 'heatmap', attributes: getLensAttributesHeatmap(props.defaultIndexPattern, fields) },
    { id: 'gauge', attributes: getLensAttributesGauge(props.defaultIndexPattern, fields) },
  ];

  const isDisabled = charts.every(({ attributes }) => !attributes);

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
            <p>Each chart has a Open in Lens action useful to debug the configuration.</p>
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
                  isDisabled={isDisabled}
                >
                  Change color
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  aria-label="Save visualization into library or embed directly into any dashboard"
                  data-test-subj="lns-example-save"
                  isDisabled={isDisabled}
                  onClick={() => {
                    setIsSaveModalVisible(true);
                  }}
                >
                  Save Visualization
                </EuiButton>
              </EuiFlexItem>
              {props.defaultIndexPattern?.isTimeBased() ? (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    aria-label="Change time range"
                    data-test-subj="lns-example-change-time-range"
                    isDisabled={isDisabled}
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
              ) : null}
              <EuiFlexItem grow={false}>
                <EuiButton
                  aria-label="Enable extra action"
                  data-test-subj="lns-example-extra-action"
                  isDisabled={isDisabled}
                  onClick={() => {
                    setEnableExtraAction((prevState) => !prevState);
                  }}
                >
                  {enableExtraAction ? 'Disable extra action' : 'Enable extra action'}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  aria-label="Enable default actions"
                  data-test-subj="lns-example-default-action"
                  isDisabled={isDisabled}
                  onClick={() => {
                    setEnableDefaultAction((prevState) => !prevState);
                  }}
                >
                  {enableDefaultAction ? 'Disable default action' : 'Enable default action'}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiFlexGrid columns={2}>
              {charts.map(({ id, attributes }) => (
                <EuiFlexItem>
                  <LensComponent
                    id={id}
                    style={{ height: 500 }}
                    timeRange={time}
                    attributes={attributes}
                    onLoad={(val) => {
                      setIsLoading({ ...isLoading, [id]: val });
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
                    withDefaultActions={enableDefaultAction}
                    extraActions={
                      enableExtraAction
                        ? [
                            getOpenInLensAction(id, () =>
                              props.plugins.lens.navigateToPrefilledEditor(
                                {
                                  id: '',
                                  timeRange: time,
                                  attributes,
                                },
                                {
                                  openInNewTab: true,
                                }
                              )
                            ),
                            {
                              id: 'testAction',
                              type: 'link',
                              getIconType: () => 'save',
                              async isCompatible(
                                context: ActionExecutionContext<object>
                              ): Promise<boolean> {
                                return true;
                              },
                              execute: async (context: ActionExecutionContext<object>) => {
                                alert('I am an extra action');
                                return;
                              },
                              getDisplayName: () => 'Extra action',
                            },
                          ]
                        : undefined
                    }
                  />
                </EuiFlexItem>
              ))}
            </EuiFlexGrid>
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
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
