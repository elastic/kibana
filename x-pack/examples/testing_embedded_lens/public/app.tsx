/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelect,
  EuiText,
  EuiSpacer,
  EuiPageTemplate,
  EuiPanel,
  EuiCallOut,
} from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import useDebounce from 'react-use/lib/useDebounce';
import { DOCUMENT_FIELD_NAME } from '@kbn/lens-plugin/common/constants';
import type { DataView } from '@kbn/data-views-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/public';
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
  PieVisualizationState,
  MedianIndexPatternColumn,
} from '@kbn/lens-plugin/public';
import type { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import { CodeEditor, HJsonLang, KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { StartDependencies } from './plugin';

type RequiredType = 'date' | 'string' | 'number';
type FieldsMap = Record<RequiredType, string>;

function getInitialType(dataView: DataView) {
  return dataView.isTimeBased() ? 'date' : 'number';
}

function getColumnFor(type: RequiredType, fieldName: string, isBucketed: boolean = true) {
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
    if (isBucketed) {
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
      label: `Median of ${fieldName}`,
      dataType: 'number',
      operationType: 'median',
      sourceField: fieldName,
      isBucketed: false,
      scale: 'ratio',
    } as MedianIndexPatternColumn;
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

function getDataLayer(
  type: RequiredType,
  field: string,
  isBucketed: boolean = true
): PersistedIndexPatternLayer {
  return {
    columnOrder: ['col1', 'col2'],
    columns: {
      col2: {
        dataType: 'number',
        isBucketed: false,
        label: 'Count of records',
        operationType: 'count',
        scale: 'ratio',
        sourceField: DOCUMENT_FIELD_NAME,
      },
      col1: getColumnFor(type, field, isBucketed),
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
  const finalDataLayer = dataLayer ?? getDataLayer(finalType, fields[finalType]);
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
  chartType: 'bar_stacked' | 'line' | 'area',
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
        seriesType: chartType,
        xAccessor: 'col1',
        yConfig: [{ forAccessor: 'col2', color }],
      },
    ],
    legend: { isVisible: true, position: 'right' },
    preferredSeriesType: chartType,
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
      col3: getColumnFor('string', fields.string) as TermsIndexPatternColumn,
    },
  };

  const baseAttributes = getBaseAttributes(
    defaultIndexPattern,
    fields,
    initialType,
    heatmapDataLayer
  );

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
      isYAxisTitleVisible: true,
      isXAxisTitleVisible: true,
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
  defaultIndexPattern: DataView,
  fields: FieldsMap
): TypedLensByValueInput['attributes'] {
  const initialType = getInitialType(defaultIndexPattern);
  const baseAttributes = getBaseAttributes(defaultIndexPattern, fields, initialType);

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
  defaultIndexPattern: DataView,
  fields: FieldsMap
): TypedLensByValueInput['attributes'] {
  const dataLayer = getDataLayer('number', fields.number, false);
  const gaugeDataLayer = {
    columnOrder: ['col1'],
    columns: {
      col1: dataLayer.columns.col1,
    },
  };

  const baseAttributes = getBaseAttributes(defaultIndexPattern, fields, 'number', gaugeDataLayer);
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

function getLensAttributesPartition(
  defaultIndexPattern: DataView,
  fields: FieldsMap
): TypedLensByValueInput['attributes'] {
  const baseAttributes = getBaseAttributes(defaultIndexPattern, fields, 'number');
  const pieConfig: PieVisualizationState = {
    layers: [
      {
        groups: ['col1'],
        metric: 'col2',
        layerId: 'layer1',
        layerType: 'data',
        numberDisplay: 'percent',
        categoryDisplay: 'default',
        legendDisplay: 'default',
      },
    ],
    shape: 'pie',
  };
  return {
    ...baseAttributes,
    visualizationType: 'lnsPie',
    state: {
      ...baseAttributes.state,
      visualization: pieConfig,
    },
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
  for (const type of ['string', 'number', 'date'] as const) {
    if (typeof fields[type] == null) {
      delete fields[type];
    }
  }
  return fields as FieldsMap;
}

function isXYChart(attributes: TypedLensByValueInput['attributes']) {
  return attributes.visualizationType === 'lnsXY';
}

function checkAndParseSO(newSO: string) {
  try {
    return JSON.parse(newSO) as TypedLensByValueInput['attributes'];
  } catch (e) {
    // do nothing
  }
}
let chartCounter = 1;

export const App = (props: {
  core: CoreStart;
  plugins: StartDependencies;
  defaultDataView: DataView;
  stateHelpers: Awaited<ReturnType<LensPublicStart['stateHelperApi']>>;
  preloadedVisualization: TypedLensByValueInput['attributes'];
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaveModalVisible, setIsSaveModalVisible] = useState(false);
  const [enableExtraAction, setEnableExtraAction] = useState(false);
  const [enableDefaultAction, setEnableDefaultAction] = useState(false);
  const [enableTriggers, toggleTriggers] = useState(false);
  const [loadedCharts, addChartConfiguration] = useState<
    Array<{ id: string; attributes: TypedLensByValueInput['attributes'] }>
  >(
    props.preloadedVisualization
      ? [{ id: 'from_lens', attributes: props.preloadedVisualization }]
      : []
  );
  const [hasParsingError, setErrorFlag] = useState(false);
  const [hasParsingErrorDebounced, setErrorDebounced] = useState(hasParsingError);
  const LensComponent = props.plugins.lens.EmbeddableComponent;
  const LensSaveModalComponent = props.plugins.lens.SaveModalComponent;

  const fields = getFieldsByType(props.defaultDataView);

  const [time, setTime] = useState({
    from: 'now-5d',
    to: 'now',
  });

  const defaultCharts = [
    {
      id: 'bar_stacked',
      attributes: getLensAttributes(props.defaultDataView, fields, 'bar_stacked', 'green'),
    },
    {
      id: 'line',
      attributes: getLensAttributes(props.defaultDataView, fields, 'line', 'green'),
    },
    {
      id: 'area',
      attributes: getLensAttributes(props.defaultDataView, fields, 'area', 'green'),
    },
    { id: 'pie', attributes: getLensAttributesPartition(props.defaultDataView, fields) },
    { id: 'table', attributes: getLensAttributesDatatable(props.defaultDataView, fields) },
    { id: 'heatmap', attributes: getLensAttributesHeatmap(props.defaultDataView, fields) },
    { id: 'gauge', attributes: getLensAttributesGauge(props.defaultDataView, fields) },
  ];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const charts = useMemo(() => [...defaultCharts, ...loadedCharts], [loadedCharts]);

  const initialAttributes = useMemo(
    () => JSON.stringify(props.preloadedVisualization ?? charts[0].attributes, null, 2),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const currentSO = useRef<string>(initialAttributes);
  const [currentValid, saveValidSO] = useState(initialAttributes);
  const switchChartPreset = useCallback(
    (newIndex) => {
      const newChart = charts[newIndex];
      const newAttributes = JSON.stringify(newChart.attributes, null, 2);
      currentSO.current = newAttributes;
      saveValidSO(newAttributes);
    },
    [charts]
  );

  const currentAttributes = useMemo(() => {
    try {
      return JSON.parse(currentSO.current);
    } catch (e) {
      return JSON.parse(currentValid);
    }
  }, [currentValid, currentSO]);

  const isDisabled = !currentAttributes;
  const isColorDisabled = isDisabled || !isXYChart(currentAttributes);

  useDebounce(() => setErrorDebounced(hasParsingError), 500, [hasParsingError]);

  return (
    <KibanaContextProvider services={{ uiSettings: props.core.uiSettings }}>
      <EuiPageTemplate fullHeight template="empty">
        <EuiFlexGroup
          className="eui-fullHeight"
          gutterSize="none"
          direction="column"
          responsive={false}
        >
          <EuiFlexItem className="eui-fullHeight">
            <EuiFlexGroup className="eui-fullHeight" gutterSize="l">
              <EuiFlexItem grow={3}>
                <EuiPanel hasShadow={false}>
                  <p>
                    This app embeds a Lens visualization by specifying the configuration. Data
                    fetching and rendering is completely managed by Lens itself.
                  </p>
                  <p>
                    The editor on the right hand side make it possible to paste a Lens attributes
                    configuration, and have it rendered. Presets are available to have a starting
                    configuration, and new presets can be saved as well (not persisted).
                  </p>
                  <p>
                    The Open with Lens button will take the current configuration and navigate to a
                    prefilled editor.
                  </p>
                  <EuiSpacer />
                  <EuiFlexGroup wrap>
                    <EuiFlexItem grow={false}>
                      <EuiButton
                        data-test-subj="lns-example-change-color"
                        onClick={() => {
                          const newColor = `rgb(${[1, 2, 3].map(() =>
                            Math.floor(Math.random() * 256)
                          )})`;
                          const newAttributes = JSON.stringify(
                            getLensAttributes(
                              props.defaultDataView,
                              fields,
                              currentAttributes.state.visualization.preferredSeriesType,
                              newColor
                            ),
                            null,
                            2
                          );
                          currentSO.current = newAttributes;
                          saveValidSO(newAttributes);
                        }}
                        isDisabled={isColorDisabled}
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
                    {props.defaultDataView?.isTimeBased() ? (
                      <EuiFlexItem grow={false}>
                        <EuiButton
                          aria-label="Change time range"
                          data-test-subj="lns-example-change-time-range"
                          isDisabled={isDisabled}
                          onClick={() => {
                            setTime(
                              time.to === 'now'
                                ? {
                                    from: '2015-09-18T06:31:44.000Z',
                                    to: '2015-09-23T18:31:44.000Z',
                                  }
                                : {
                                    from: 'now-5d',
                                    to: 'now',
                                  }
                            );
                          }}
                        >
                          {time.to === 'now' ? 'Change time range' : 'Reset time range'}
                        </EuiButton>
                      </EuiFlexItem>
                    ) : null}
                    <EuiFlexItem grow={false}>
                      <EuiButton
                        aria-label="Open lens in new tab"
                        isDisabled={!props.plugins.lens.canUseEditor()}
                        onClick={() => {
                          props.plugins.lens.navigateToPrefilledEditor(
                            {
                              id: '',
                              timeRange: time,
                              attributes: currentAttributes,
                            },
                            {
                              openInNewTab: true,
                            }
                          );
                        }}
                      >
                        Edit in Lens (new tab)
                      </EuiButton>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButton
                        aria-label="Enable triggers"
                        data-test-subj="lns-example-triggers"
                        isDisabled={isDisabled}
                        onClick={() => {
                          toggleTriggers((prevState) => !prevState);
                        }}
                      >
                        {enableTriggers ? 'Disable triggers' : 'Enable triggers'}
                      </EuiButton>
                    </EuiFlexItem>
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
                    <EuiFlexItem>
                      <p>State: {isLoading ? 'Loading...' : 'Rendered'}</p>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  <EuiFlexGroup>
                    <EuiFlexItem>
                      <LensComponent
                        id="myLens"
                        style={{ height: 500 }}
                        timeRange={time}
                        attributes={currentAttributes}
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
                        disableTriggers={!enableTriggers}
                        viewMode={ViewMode.VIEW}
                        withDefaultActions={enableDefaultAction}
                        extraActions={
                          enableExtraAction
                            ? [
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
                  </EuiFlexGroup>
                </EuiPanel>
                {isSaveModalVisible && (
                  <LensSaveModalComponent
                    initialInput={currentAttributes as unknown as LensEmbeddableInput}
                    onSave={() => {}}
                    onClose={() => setIsSaveModalVisible(false)}
                  />
                )}
              </EuiFlexItem>
              <EuiFlexItem grow={2}>
                <EuiPanel hasShadow={false}>
                  <EuiFlexGroup>
                    <EuiFlexItem>
                      <EuiText>
                        <p>Paste or edit here your Lens document</p>
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  <EuiFlexGroup>
                    <EuiFlexItem grow={false}>
                      <EuiSelect
                        options={charts.map(({ id }, i) => ({ value: i, text: id }))}
                        value={undefined}
                        onChange={(e) => switchChartPreset(Number(e.target.value))}
                        aria-label="Load from a preset"
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButton
                        aria-label="Save the preset"
                        data-test-subj="lns-example-save"
                        isDisabled={isDisabled || hasParsingError}
                        onClick={() => {
                          const attributes = checkAndParseSO(currentSO.current);
                          if (attributes) {
                            const label = `custom-chart-${chartCounter}`;
                            addChartConfiguration([
                              ...loadedCharts,
                              {
                                id: label,
                                attributes,
                              },
                            ]);
                            chartCounter++;
                            alert(`The preset has been saved as "${label}"`);
                          }
                        }}
                      >
                        Save as preset
                      </EuiButton>
                    </EuiFlexItem>
                    {hasParsingErrorDebounced && currentSO.current !== currentValid && (
                      <EuiCallOut title="Error" color="danger" iconType="alert">
                        <p>Check the spec</p>
                      </EuiCallOut>
                    )}
                  </EuiFlexGroup>
                  <EuiFlexGroup style={{ height: '75vh' }} direction="column">
                    <EuiFlexItem>
                      <CodeEditor
                        languageId={HJsonLang}
                        options={{
                          fontSize: 14,
                          wordWrap: 'on',
                        }}
                        value={currentSO.current}
                        onChange={(newSO) => {
                          const isValid = Boolean(checkAndParseSO(newSO));
                          setErrorFlag(!isValid);
                          currentSO.current = newSO;
                          if (isValid) {
                            // reset the debounced error
                            setErrorDebounced(isValid);
                            saveValidSO(newSO);
                          }
                        }}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPanel>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageTemplate>
    </KibanaContextProvider>
  );
};
