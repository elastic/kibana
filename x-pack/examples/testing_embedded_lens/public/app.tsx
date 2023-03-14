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
  EuiPageTemplate_Deprecated as EuiPageTemplate,
  EuiPanel,
  EuiCallOut,
  EuiColorPicker,
  EuiFormRow,
  EuiPopover,
  useColorPickerState,
  EuiSwitch,
  EuiNotificationBadge,
  EuiCodeBlock,
  EuiIcon,
  EuiToolTip,
  EuiPopoverTitle,
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
type LensAttributesByType<StateType> = Extract<
  TypedLensByValueInput['attributes'],
  { state: { visualization: StateType } }
>;

function OverrideSwitch<T extends object>({
  rowLabel,
  controlLabel,
  value,
  override,
  setOverrideValue,
  helpText,
}: {
  rowLabel: string;
  controlLabel: string;
  helpText?: string;
  value: T | undefined;
  override: T;
  setOverrideValue: (v: T | undefined) => void;
}) {
  return (
    <EuiFormRow
      label={
        <EuiToolTip
          content={<CodeExample propName="overrides" code={JSON.stringify(override, null, 2)} />}
          position="right"
        >
          <span>
            {rowLabel} <EuiIcon type="questionInCircle" color="subdued" />
          </span>
        </EuiToolTip>
      }
      helpText={helpText}
      display="columnCompressedSwitch"
      hasChildLabel={false}
    >
      <EuiSwitch
        label={controlLabel}
        name="switch"
        checked={Boolean(value)}
        onChange={() => {
          setOverrideValue(value ? undefined : override);
        }}
        compressed
      />
    </EuiFormRow>
  );
}

function CodeExample({ propName, code }: { propName: string; code: string }) {
  return (
    <EuiCodeBlock language="jsx" paddingSize="none">
      {`
<LensEmbeddable ${propName}={${code}} />
      `}
    </EuiCodeBlock>
  );
}

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
          ranges: [
            {
              from: 0,
              to: 1000,
              label: '',
            },
          ],
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
        formBased: {
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
function getLensAttributesXY(
  defaultIndexPattern: DataView,
  fields: FieldsMap,
  chartType: XYState['preferredSeriesType'],
  color: string
): LensAttributesByType<XYState> {
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
    legend: { isVisible: true, position: 'right', showSingleSeries: true },
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
): LensAttributesByType<HeatmapVisualizationState> {
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
): LensAttributesByType<DatatableVisualizationState> {
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
  fields: FieldsMap,
  shape: GaugeVisualizationState['shape'] = 'horizontalBullet'
): LensAttributesByType<GaugeVisualizationState> {
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
    shape,
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
): LensAttributesByType<PieVisualizationState> {
  const baseAttributes = getBaseAttributes(defaultIndexPattern, fields, 'number');
  const pieConfig: PieVisualizationState = {
    layers: [
      {
        primaryGroups: ['col1'],
        metrics: ['col2'],
        layerId: 'layer1',
        layerType: 'data',
        numberDisplay: 'percent',
        categoryDisplay: 'default',
        legendDisplay: 'show',
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

function isXYChart(
  attributes: TypedLensByValueInput['attributes']
): attributes is LensAttributesByType<XYState> {
  return attributes.visualizationType === 'lnsXY';
}

function isPieChart(
  attributes: TypedLensByValueInput['attributes']
): attributes is LensAttributesByType<PieVisualizationState> {
  return attributes.visualizationType === 'lnsPie';
}

function isHeatmapChart(
  attributes: TypedLensByValueInput['attributes']
): attributes is LensAttributesByType<HeatmapVisualizationState> {
  return attributes.visualizationType === 'lnsHeatmap';
}

function isDatatable(
  attributes: TypedLensByValueInput['attributes']
): attributes is LensAttributesByType<DatatableVisualizationState> {
  return attributes.visualizationType === 'lnsDatatable';
}

function isGaugeChart(
  attributes: TypedLensByValueInput['attributes']
): attributes is LensAttributesByType<GaugeVisualizationState> {
  return attributes.visualizationType === 'lnsGague';
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

  const [color, setColor, errors] = useColorPickerState('#D6BF57');

  const defaultCharts = [
    {
      id: 'bar_stacked',
      attributes: getLensAttributesXY(props.defaultDataView, fields, 'bar_stacked', color),
    },
    {
      id: 'line',
      attributes: getLensAttributesXY(props.defaultDataView, fields, 'line', color),
    },
    {
      id: 'area',
      attributes: getLensAttributesXY(props.defaultDataView, fields, 'area', color),
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

  const currentAttributes: TypedLensByValueInput['attributes'] = useMemo(() => {
    try {
      return JSON.parse(currentSO.current);
    } catch (e) {
      return JSON.parse(currentValid);
    }
  }, [currentValid, currentSO]);

  const isDisabled = !currentAttributes;

  useDebounce(() => setErrorDebounced(hasParsingError), 500, [hasParsingError]);

  const [xyOverride, setXYOverride] = useState<
    Record<'axisX' | 'axisLeft' | 'axisRight', { hide: boolean }> | undefined
  >();
  const [settingsOverride, setSettingsOverride] = useState<
    Record<'settings', { legendAction: 'ignore' }> | undefined
  >();
  const [pieOverride, setPieOverride] = useState<
    Record<'partition', { fillOutside: boolean }> | undefined
  >();

  const [attributesPopoverOpen, setAttributesPopoverOpen] = useState(false);
  const [overridesPopoverOpen, setOverridesPopoverOpen] = useState(false);
  const [panelPopoverOpen, setPanelPopoverOpen] = useState(false);

  const hasOverridesEnabled = isXYChart(currentAttributes)
    ? xyOverride || settingsOverride
    : isPieChart(currentAttributes)
    ? pieOverride || settingsOverride
    : false;

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
                      <EuiPopover
                        button={
                          <EuiButton
                            data-test-subj="lns-example-change-attributes"
                            onClick={() => setAttributesPopoverOpen(!attributesPopoverOpen)}
                            iconType="arrowDown"
                            iconSide="right"
                            color="primary"
                          >
                            Lens Attributes
                          </EuiButton>
                        }
                        isOpen={attributesPopoverOpen}
                        closePopover={() => setAttributesPopoverOpen(false)}
                      >
                        <div style={{ width: 300 }}>
                          {isXYChart(currentAttributes) ? (
                            <EuiFormRow label="Pick color" display="columnCompressed">
                              <EuiColorPicker
                                onChange={(newColor, output) => {
                                  setColor(newColor, output);
                                  // for sake of semplicity of this example change it locally and then shallow copy it
                                  const dataLayer = currentAttributes.state.visualization.layers[0];
                                  if ('yConfig' in dataLayer && dataLayer.yConfig) {
                                    dataLayer.yConfig[0].color = newColor;
                                    // this will make a string copy of it
                                    const newAttributes = JSON.stringify(
                                      currentAttributes,
                                      null,
                                      2
                                    );
                                    currentSO.current = newAttributes;
                                    saveValidSO(newAttributes);
                                  }
                                }}
                                color={
                                  currentAttributes.state.visualization.layers[0]?.yConfig[0]
                                    .color ?? 'green'
                                }
                                isInvalid={!!errors}
                              />
                            </EuiFormRow>
                          ) : null}
                          {isPieChart(currentAttributes) ? (
                            <EuiFormRow label="Show values" display="columnCompressedSwitch">
                              <EuiSwitch
                                label="As percentage"
                                name="switch"
                                checked={
                                  currentAttributes.state.visualization.layers[0].numberDisplay ===
                                  'percent'
                                }
                                onChange={() => {
                                  currentAttributes.state.visualization.layers[0].numberDisplay =
                                    currentAttributes.state.visualization.layers[0]
                                      .numberDisplay === 'percent'
                                      ? 'value'
                                      : 'percent';
                                  // this will make a string copy of it
                                  const newAttributes = JSON.stringify(currentAttributes, null, 2);
                                  currentSO.current = newAttributes;
                                  saveValidSO(newAttributes);
                                }}
                                compressed
                              />
                            </EuiFormRow>
                          ) : null}
                        </div>
                      </EuiPopover>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiPopover
                        button={
                          <EuiButton
                            data-test-subj="lns-example-change-overrides"
                            onClick={() => setOverridesPopoverOpen(!overridesPopoverOpen)}
                            iconType="arrowDown"
                            iconSide="right"
                            isDisabled={isDatatable(currentAttributes)}
                          >
                            Overrides{' '}
                            <EuiNotificationBadge
                              color={hasOverridesEnabled ? 'accent' : 'subdued'}
                            >
                              {hasOverridesEnabled ? 'ON' : 'OFF'}
                            </EuiNotificationBadge>
                          </EuiButton>
                        }
                        isOpen={overridesPopoverOpen}
                        closePopover={() => setOverridesPopoverOpen(false)}
                      >
                        <div style={{ width: 400 }}>
                          <EuiPopoverTitle>Overrides</EuiPopoverTitle>
                          <EuiText size="s">
                            <p>
                              Overrides are local to the Embeddable and forgotten when the
                              visualization is open in the Editor. They should be used carefully for
                              specific tweaks within the integration.
                            </p>
                            <p>
                              There are mainly 2 use cases for overrides:
                              <ul>
                                <li>Specific styling/tuning feature missing in Lens</li>
                                <li>Disable specific chart behaviour</li>
                              </ul>
                            </p>
                            <p>Here&#39;s some examples:</p>
                          </EuiText>
                          <EuiSpacer />
                          {isPieChart(currentAttributes) || isXYChart(currentAttributes) ? (
                            <OverrideSwitch
                              override={{
                                settings: { legendAction: 'ignore' },
                              }}
                              value={settingsOverride}
                              setOverrideValue={setSettingsOverride}
                              rowLabel="Legend override"
                              controlLabel="Disable legend popup"
                              helpText={`This override disabled the legend filter popup locally, via the special "ignore" value.`}
                            />
                          ) : null}
                          {isPieChart(currentAttributes) ? (
                            <OverrideSwitch
                              override={{
                                partition: { fillOutside: true },
                              }}
                              value={pieOverride}
                              setOverrideValue={setPieOverride}
                              rowLabel="Partition override"
                              controlLabel="Label outsides"
                            />
                          ) : null}
                          {isXYChart(currentAttributes) ? (
                            <OverrideSwitch
                              override={{
                                axisX: { hide: true },
                                axisLeft: { hide: true },
                                axisRight: { hide: true },
                              }}
                              value={xyOverride}
                              setOverrideValue={setXYOverride}
                              rowLabel="Axis override"
                              controlLabel="Hide all axes"
                            />
                          ) : null}
                        </div>
                      </EuiPopover>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiPopover
                        button={
                          <EuiButton
                            data-test-subj="lns-example-change-overrides"
                            onClick={() => setPanelPopoverOpen(!panelPopoverOpen)}
                            iconType="arrowDown"
                            iconSide="right"
                          >
                            Embeddable settings
                          </EuiButton>
                        }
                        isOpen={panelPopoverOpen}
                        closePopover={() => setPanelPopoverOpen(false)}
                      >
                        <div style={{ width: 400 }}>
                          <EuiPopoverTitle>Embeddable settings</EuiPopoverTitle>
                          <EuiText size="s">
                            <p>
                              It is possible to control and customize how the Embeddables is shown,
                              disabling the interactivity of the chart or filtering out default
                              actions.
                            </p>
                          </EuiText>
                          <EuiSpacer />
                          <EuiFormRow
                            label="Enable triggers"
                            display="columnCompressedSwitch"
                            helpText="This setting controls the interactivity of the chart: when disabled the chart won't bubble any event on user action."
                          >
                            <EuiSwitch
                              showLabel={false}
                              label="Enable triggers"
                              name="switch"
                              checked={enableTriggers}
                              onChange={() => {
                                toggleTriggers(!enableTriggers);
                              }}
                              compressed
                            />
                          </EuiFormRow>
                          <EuiFormRow
                            label="Enable default action"
                            display="columnCompressedSwitch"
                            helpText="When disabled the default panel actions (i.e. CSV download)"
                          >
                            <EuiSwitch
                              showLabel={false}
                              label="Enable default action"
                              name="switch"
                              checked={enableDefaultAction}
                              onChange={() => {
                                setEnableDefaultAction(!enableDefaultAction);
                              }}
                              compressed
                            />
                          </EuiFormRow>
                          <EuiSpacer />
                          <p>It is also possible to pass custom actions to the panel:</p>
                          <EuiSpacer />
                          <EuiFormRow
                            label={
                              <EuiToolTip
                                display="block"
                                content={
                                  <CodeExample
                                    propName="extraActions"
                                    code={`[
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
    getDisplayName: () => 
      'Extra action',
  }
]`}
                                  />
                                }
                                position="right"
                              >
                                <span>
                                  Show custom action{' '}
                                  <EuiIcon type="questionInCircle" color="subdued" />
                                </span>
                              </EuiToolTip>
                            }
                            display="columnCompressedSwitch"
                            helpText="Pass a consumer defined action to show in the panel context menu."
                          >
                            <EuiSwitch
                              showLabel={false}
                              label="Show custom action"
                              name="switch"
                              checked={enableExtraAction}
                              onChange={() => {
                                setEnableExtraAction(!enableExtraAction);
                              }}
                              compressed
                            />
                          </EuiFormRow>
                        </div>
                      </EuiPopover>
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
                        Open in Lens (new tab)
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
                        overrides={{
                          ...settingsOverride,
                          ...xyOverride,
                          ...pieOverride,
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
                        prepend={'Load preset'}
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
