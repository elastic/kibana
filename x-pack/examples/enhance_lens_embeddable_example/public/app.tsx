/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiCodeBlock,
  EuiPageTemplate,
  EuiTextColor,
  EuiSpacer,
} from '@elastic/eui';

import type { DataView } from '@kbn/data-views-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type {
  TypedLensByValueInput,
  PersistedIndexPatternLayer,
  XYState,
  FormulaPublicApi,
  DateHistogramIndexPatternColumn,
  TermsIndexPatternColumn,
  RangeIndexPatternColumn,
} from '@kbn/lens-plugin/public';

import { ViewMode } from '@kbn/embeddable-plugin/public';
import {
  AreaSeries,
  Axis,
  BubbleSeries,
  Chart,
  CurveType,
  PointShape,
  Position,
  RectAnnotation,
  ScaleType,
  Settings,
} from '@elastic/charts';
import type { StartDependencies } from './plugin';

export type LensAttributesByType<VizType> = Extract<
  TypedLensByValueInput['attributes'],
  { visualizationType: VizType }
>;

type DataLayer = Extract<XYState['layers'][number], { layerType: 'data' }>;

// Generate a Lens state based on some app-specific input parameters.
// `TypedLensByValueInput` can be used for type-safety - it uses the same interfaces as Lens-internal code.
function getLensAttributes(
  color: string,
  dataView: DataView,
  formula: FormulaPublicApi
): TypedLensByValueInput['attributes'] {
  const baseLayer: PersistedIndexPatternLayer = {
    columnOrder: ['col1'],
    columns: {
      col1: {
        dataType: 'date',
        isBucketed: true,
        label: '@timestamp',
        operationType: 'date_histogram',
        params: { interval: 'auto' },
        scale: 'interval',
        sourceField: dataView.timeFieldName!,
      } as DateHistogramIndexPatternColumn,
    },
  };

  const dataLayer = formula.insertOrReplaceFormulaColumn(
    'col2',
    { formula: 'count()' },
    baseLayer,
    dataView
  );

  const xyConfig: XYState = {
    axisTitlesVisibilitySettings: { x: true, yLeft: true, yRight: true },
    fittingFunction: 'None',
    gridlinesVisibilitySettings: { x: true, yLeft: true, yRight: true },
    layers: [
      {
        accessors: ['col2'],
        layerId: 'layer1',
        layerType: 'data',
        seriesType: 'line',
        xAccessor: 'col1',
        yConfig: [{ forAccessor: 'col2', color }],
      },
    ],
    legend: { isVisible: true, position: 'right' },
    preferredSeriesType: 'line',
    tickLabelsVisibilitySettings: { x: true, yLeft: true, yRight: true },
    valueLabels: 'hide',
  };

  return {
    visualizationType: 'lnsXY',
    title: 'Prefilled from example app',
    references: [
      {
        id: dataView.id!,
        name: 'indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: dataView.id!,
        name: 'indexpattern-datasource-layer-layer1',
        type: 'index-pattern',
      },
    ],
    state: {
      datasourceStates: {
        formBased: {
          layers: {
            layer1: dataLayer!,
          },
        },
      },
      filters: [],
      query: { language: 'kuery', query: '' },
      visualization: xyConfig,
    },
  };
}

type ExampleProps = {
  searchSession: string;
  dataView: DataView;
  formula: FormulaPublicApi;
  embeddable: StartDependencies['lens']['EmbeddableComponent'];
};

function LayeredExample({
  searchSession,
  dataView,
  formula,
  embeddable: LensComponent,
}: ExampleProps) {
  const { title, ...attributes } = getLensAttributes('green', dataView, formula);

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <LensComponent
          id=""
          withDefaultActions
          style={{ height: 600 }}
          timeRange={{
            from: 'now-5d',
            to: 'now',
          }}
          attributes={{ title: 'Lens chart with custom layer stacked', ...attributes }}
          searchSessionId={searchSession}
          onBrushEnd={(_data) => {
            // call back event for on brush end event
          }}
          onFilter={(_data) => {
            // call back event for on filter event
          }}
          onTableRowClick={(_data) => {
            // call back event for on table row click event
          }}
          viewMode={ViewMode.VIEW}
        >
          {({ datatables }) => {
            // pick the x dimension here to add another layer of unsupported chart type in Lens
            const xyConfig = attributes.state.visualization as XYState;
            const dataLayer = xyConfig.layers.find(
              ({ layerType }) => layerType === 'data'
            ) as Extract<XYState['layers'][number], { layerType: 'data' }>;
            const xAccessor = dataLayer.xAccessor!;
            const yAccessor = dataLayer.accessors[0];
            const newSeries = datatables[0].rows.map(
              ({ [xAccessor]: xAccessorValue, [yAccessor]: yAccessorValue }) => ({
                [xAccessor]: xAccessorValue,
                [yAccessor]: yAccessorValue,
                zAccessor: Math.random() * 15,
              })
            );
            return (
              <BubbleSeries
                id="bubbles"
                xScaleType={ScaleType.Time}
                yScaleType={ScaleType.Linear}
                xAccessor={xAccessor}
                yAccessors={[yAccessor]}
                markSizeAccessor="zAccessor"
                data={newSeries}
                bubbleSeriesStyle={{
                  point: {
                    shape: PointShape.Triangle,
                    opacity: 0.7,
                  },
                }}
              />
            );
          }}
        </LensComponent>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiCodeBlock language="jsx" fontSize="s" paddingSize="m">
          {`
<LensComponent>
{({ datatables }) => {
// pick the x dimension here to add another layer of unsupported chart type in Lens
const xyConfig = attributes.state.visualization as XYState;
const dataLayer = xyConfig.layers.find(
({ layerType }) => layerType === 'data'
) as Extract<XYState['layers'][number], { layerType: 'data' }>;
const xAccessor = dataLayer.xAccessor!;
const yAccessor = dataLayer.accessors[0];
const newSeries = datatables[0].rows.map(
({ [xAccessor]: xAccessorValue, [yAccessor]: yAccessorValue }) => ({
  [xAccessor]: xAccessorValue,
  [yAccessor]: yAccessorValue,
  zAccessor: Math.random() * 15,
})
);
return (
<BubbleSeries
  id="bubbles"
  xScaleType={ScaleType.Time}
  yScaleType={ScaleType.Linear}
  xAccessor={xAccessor}
  yAccessors={[yAccessor]}
  markSizeAccessor="zAccessor"
  data={newSeries}
  bubbleSeriesStyle={{
    point: {
      shape: PointShape.Triangle,
      opacity: 0.7,
    },
  }}
/>
);
}}
</LensComponent>
`}
        </EuiCodeBlock>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function LayeredAnnotationExample({
  searchSession,
  dataView,
  formula,
  embeddable: LensComponent,
}: ExampleProps) {
  const numberField = dataView.fields.find(
    ({ type, aggregatable, name, displayName }) =>
      aggregatable && type === 'number' && !displayName?.startsWith('_')
  )!;
  const baseLayer: PersistedIndexPatternLayer = {
    columnOrder: ['col1'],
    columns: {
      col1: {
        label: numberField.displayName,
        dataType: 'number',
        operationType: 'range',
        sourceField: numberField.name,
        isBucketed: true,
        scale: 'interval',
        params: {
          includeEmptyRows: true,
          type: 'histogram',
          ranges: [{ from: 0, to: 1000, label: '' }],
          maxBars: 'auto',
        },
      } as RangeIndexPatternColumn,
    },
  };

  const attributes = {
    visualizationType: 'lnsXY',
    title: 'Lens chart with custom annotation stacked',
    references: [
      {
        id: dataView.id!,
        name: 'indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: dataView.id!,
        name: 'indexpattern-datasource-layer-layer1',
        type: 'index-pattern',
      },
    ],
    state: {
      datasourceStates: {
        formBased: {
          layers: {
            layer1: formula.insertOrReplaceFormulaColumn(
              'col2',
              { formula: 'count()' },
              baseLayer,
              dataView
            )!,
          },
        },
      },
      filters: [],
      query: { language: 'kuery', query: '' },
      visualization: {
        axisTitlesVisibilitySettings: { x: true, yLeft: true, yRight: true },
        fittingFunction: 'None',
        gridlinesVisibilitySettings: { x: true, yLeft: true, yRight: true },
        layers: [
          {
            accessors: ['col2'],
            layerId: 'layer1',
            layerType: 'data',
            seriesType: 'line',
            xAccessor: 'col1',
            yConfig: [{ forAccessor: 'col2', color: 'green' }],
          },
        ],
        legend: { isVisible: true, position: 'right' },
        preferredSeriesType: 'line',
        tickLabelsVisibilitySettings: { x: true, yLeft: true, yRight: true },
        valueLabels: 'hide',
      },
    },
  };

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <LensComponent
          id=""
          withDefaultActions
          style={{ height: 600 }}
          timeRange={{
            from: 'now-5d',
            to: 'now',
          }}
          attributes={attributes}
          searchSessionId={searchSession}
          onBrushEnd={(_data) => {
            // call back event for on brush end event
          }}
          onFilter={(_data) => {
            // call back event for on filter event
          }}
          onTableRowClick={(_data) => {
            // call back event for on table row click event
          }}
          viewMode={ViewMode.VIEW}
        >
          {({ datatables }) => {
            // pick the x dimension here to add another layer of unsupported chart type in Lens
            const xyConfig = attributes.state.visualization as XYState;
            const dataLayer = xyConfig.layers.find(
              ({ layerType }) => layerType === 'data'
            ) as DataLayer;
            const xAccessor = dataLayer.xAccessor!;
            const yAccessor = dataLayer.accessors[0];

            const firstBucket = datatables[0].rows[1][xAccessor];
            // move 2 buckets right
            const endBucket = datatables[0].rows[3][xAccessor];

            // now find the min and max
            const yValues = datatables[0].rows.map(({ [yAccessor]: yValue }) => yValue);
            const maxY = Math.max(...yValues);
            const minY = Math.min(...yValues);
            return (
              <RectAnnotation
                id="rect2"
                groupId="left"
                dataValues={[
                  {
                    coordinates: {
                      x0: firstBucket,
                      x1: endBucket,
                      y0: maxY - (maxY - minY) / 3,
                      y1: maxY,
                    },
                    details: 'details about this custom annotation',
                  },
                ]}
                style={{ fill: 'blue' }}
              />
            );
          }}
        </LensComponent>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiCodeBlock language="jsx" fontSize="s" paddingSize="m">
          {`
<LensComponent>
{({ datatables }) => {
  // pick the x dimension here to add another layer of unsupported chart type in Lens
  const xyConfig = attributes.state.visualization as XYState;
  const dataLayer = xyConfig.layers.find(
    ({ layerType }) => layerType === 'data'
  ) as DataLayer;
  const xAccessor = dataLayer.xAccessor!;
  const yAccessor = dataLayer.accessors[0];

  const firstBucket = datatables[0].rows[1][xAccessor];
  // move 2 buckets right
  const endBucket = datatables[0].rows[3][xAccessor];

  // now find the min and max
  const yValues = datatables[0].rows.map(({ [yAccessor]: yValue }) => yValue);
  const maxY = Math.max(...yValues);
  const minY = Math.min(...yValues);
  return (
    <RectAnnotation
      id="rect2"
      groupId="left"
      dataValues={[
        {
          coordinates: {
            x0: firstBucket,
            x1: endBucket,
            y0: maxY - (maxY - minY) / 3,
            y1: maxY,
          },
          details: 'details about this custom annotation',
        },
      ]}
      style={{ fill: 'blue' }}
    />
  );
}}
</LensComponent>
`}
        </EuiCodeBlock>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function CustomChartExample({
  searchSession,
  dataView,
  formula,
  embeddable: LensComponent,
}: ExampleProps) {
  const { title, ...attributes } = getLensAttributes('green', dataView, formula);
  const keywordField = dataView.fields.find(
    ({ type, aggregatable, name, displayName }) =>
      aggregatable && type === 'string' && !displayName?.startsWith('_')
  );
  const dataLayers = attributes.state.datasourceStates.formBased.layers;
  // add a breakdown dimension
  dataLayers.layer1 = {
    ...dataLayers.layer1,
    columnOrder: ['col1', 'col3', ...dataLayers.layer1.columnOrder.slice(1)],
    columns: {
      ...dataLayers.layer1.columns,
      col3: {
        label: `Top values of ${keywordField?.displayName}`,
        dataType: 'string',
        operationType: 'terms',
        scale: 'ordinal',
        sourceField: keywordField?.displayName,
        isBucketed: true,
        params: {
          size: 5,
          orderBy: { type: 'alphabetical', fallback: true },
          orderDirection: 'desc',
        },
      } as TermsIndexPatternColumn,
    },
  };
  ((attributes.state.visualization as XYState).layers[0] as DataLayer).splitAccessor = 'col3';

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <LensComponent
          id=""
          withDefaultActions
          style={{ height: 600 }}
          timeRange={{
            from: 'now-5d',
            to: 'now',
          }}
          attributes={{ title: 'Lens as data fetching tool + custom chart', ...attributes }}
          searchSessionId={searchSession}
          viewMode={ViewMode.VIEW}
          renderMode={'dataOnly'}
        >
          {({ datatables, onRenderComplete }) => {
            // pick the x dimension here to add another layer of unsupported chart type in Lens
            const xyConfig = attributes.state.visualization as XYState;
            const dataLayer = xyConfig.layers.find(
              ({ layerType }) => layerType === 'data'
            ) as DataLayer;
            const xAccessor = dataLayer.xAccessor!;
            const yAccessor = dataLayer.accessors[0];
            const splitAccessor = dataLayer.splitAccessor!;
            return (
              <Chart>
                <Settings onRenderChange={onRenderComplete} />
                <Axis id="x" position={Position.Bottom} />
                <Axis id="y" position={Position.Left} />
                <AreaSeries
                  id="area1"
                  xScaleType={ScaleType.Time}
                  yScaleType={ScaleType.Linear}
                  xAccessor={xAccessor}
                  yAccessors={[yAccessor]}
                  data={datatables[0].rows}
                  splitSeriesAccessors={[splitAccessor]}
                  stackAccessors={[xAccessor]}
                  curve={CurveType.CURVE_MONOTONE_X}
                  stackMode={'silhouette'}
                  areaSeriesStyle={{
                    area: {
                      opacity: 0.7,
                    },
                    line: {
                      visible: false,
                    },
                  }}
                />
              </Chart>
            );
          }}
        </LensComponent>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiCodeBlock language="jsx" fontSize="s" paddingSize="m">
          {`
<LensComponent renderMode="dataOnly">
  {({ datatables }) => {
    // pick the x dimension here to add another layer of unsupported chart type in Lens
    const xyConfig = attributes.state.visualization as XYState;
    const dataLayer = xyConfig.layers.find(
      ({ layerType }) => layerType === 'data'
    ) as Extract<XYState['layers'][number], { layerType: 'data' }>;
    const xAccessor = dataLayer.xAccessor!;
    const yAccessor = dataLayer.accessors[0];
    return (
      <Chart>
        <Settings />
        <Axis id="x" position={Position.Bottom} />
        <Axis id="y" position={Position.Left} />
        <AreaSeries
          id="area1"
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor={xAccessor}
          yAccessors={[yAccessor]}
          data={datatables[0].rows}
          stackAccessors={[xAccessor]}
          curve={CurveType.CURVE_MONOTONE_X}
          stackMode={'silhouette'}
          areaSeriesStyle={{
            area: {
              opacity: 0.7,
            },
            line: {
              visible: false,
            },
          }}
        />
      </Chart>
    );
  }}
</LensComponent>
`}
        </EuiCodeBlock>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function DataOnlyExample({
  searchSession,
  dataView,
  formula,
  embeddable: LensComponent,
}: ExampleProps) {
  const keywordField = dataView.fields.find(
    ({ type, aggregatable, name, displayName }) =>
      aggregatable && type === 'string' && !displayName?.startsWith('_')
  );
  const baseLayer: PersistedIndexPatternLayer = {
    columnOrder: [],
    columns: {},
  };
  const formulaText = `ifelse(
    unique_count(${keywordField?.displayName}, shift="1m") > 5, 
    unique_count(${keywordField?.displayName}, shift="1m"), 
    0
  )`;

  const dataLayer = formula.insertOrReplaceFormulaColumn(
    'col2',
    { formula: formulaText },
    baseLayer,
    dataView
  );

  const attributes = {
    visualizationType: 'lnsMetric',
    title: 'Lens as data fetching tool + custom render',
    references: [
      {
        id: dataView.id!,
        name: 'indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: dataView.id!,
        name: 'indexpattern-datasource-layer-layer1',
        type: 'index-pattern',
      },
    ],
    state: {
      datasourceStates: {
        formBased: {
          layers: {
            layer1: dataLayer!,
          },
        },
      },
      filters: [],
      query: { language: 'kuery', query: '' },
      visualization: {
        layerId: 'layer1',
        layerType: 'data',
        metricAccessor: 'col2',
        color: undefined,
        breakdownByAccessor: undefined,
      },
    },
  };

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <p>
          Using a Lens embeddable to compute the Lens formula{' '}
          <EuiCodeBlock fontSize="m" paddingSize="m">
            {formulaText}
          </EuiCodeBlock>
          <LensComponent
            id=""
            withDefaultActions
            timeRange={{
              from: 'now-5d',
              to: 'now',
            }}
            attributes={attributes}
            searchSessionId={searchSession}
            viewMode={ViewMode.VIEW}
            renderMode={'dataOnly'}
          >
            {({ datatables, onRenderComplete }) => {
              onRenderComplete?.();

              return (
                <span style={{ background: '#222' }}>
                  <EuiTextColor color="ghost">{datatables[0].rows[0].col2}</EuiTextColor>
                </span>
              );
            }}
          </LensComponent>
        </p>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiCodeBlock language="jsx" fontSize="s" paddingSize="m">
          {`
<LensComponent renderMode="dataOnly">
{({ datatables, onRenderComplete }) => {
  onRenderComplete?.();

  return (
    <span style={{ background: '#222' }}>
      <EuiTextColor color="ghost">{datatables[0].rows[0].col2}</EuiTextColor>
    </span>
  );
}}
</LensComponent>
`}
        </EuiCodeBlock>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export const App = (props: {
  core: CoreStart;
  plugins: StartDependencies;
  defaultDataView: DataView;
  formula: FormulaPublicApi;
}) => {
  const [searchSession] = useMemo(
    () => props.plugins.data.search.session.start(),
    [props.plugins.data.search.session]
  );
  const LensComponent = props.plugins.lens.EmbeddableComponent;

  return (
    <EuiPageTemplate panelled={false} restrictWidth={false} bottomBorder={false} grow>
      <EuiPageTemplate.Header>
        <EuiTitle size="l">
          <h1>Enhanced Lens embeddable via render props</h1>
        </EuiTitle>
      </EuiPageTemplate.Header>
      <EuiPageTemplate.Section grow={false} color="subdued" bottomBorder="extended">
        <LayeredExample
          searchSession={searchSession}
          embeddable={LensComponent}
          dataView={props.defaultDataView}
          formula={props.formula}
        />
        <EuiSpacer size="l" />
        <LayeredAnnotationExample
          searchSession={searchSession}
          embeddable={LensComponent}
          dataView={props.defaultDataView}
          formula={props.formula}
        />
        <EuiSpacer size="l" />
        <CustomChartExample
          searchSession={searchSession}
          embeddable={LensComponent}
          dataView={props.defaultDataView}
          formula={props.formula}
        />
        <EuiSpacer size="l" />
        <DataOnlyExample
          searchSession={searchSession}
          embeddable={LensComponent}
          dataView={props.defaultDataView}
          formula={props.formula}
        />
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
