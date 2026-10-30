/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { EuiPanel, EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { getAnnotationsSourceId, interpolate, type AppNodeOfType } from '@kbn/custom-app-common';
import { useDataLayer } from '../data/data_layer_context';
import { toEsqlVariables } from '../data/esql_variables';
import { useSource } from '../data/use_source';
import { useStateValues } from '../runtime/app_runtime_context';
import { useActionRunner } from '../workflows/use_action_runner';
import { getServices } from '../services';
import { useSubjectValue } from '../utils/use_subject_value';
import { getClickedRow } from './clicked_row';
import { DataState } from './data_state';
import { EditableText } from './editable_text';
import { DroppedActions } from './dropped_actions';
import { applyAccentToChart } from '../theme/accent_chart_colors';
import { addAnnotationsToChart } from './chart_annotations';
import { usePageAccent } from './app_frame';
import { useChartAttributes } from './use_chart_attributes';
import type { SourceData } from '../data/data_layer';

/** A chart is this tall everywhere: its look is not the author's to decide. */
const CHART_HEIGHT = 280;

const Chart = ({
  node,
  data,
  annotationData,
}: {
  node: AppNodeOfType<'chart'>;
  data: SourceData;
  /** The rows to mark on the chart, when it has annotations that are to be shown now. */
  annotationData?: SourceData;
}) => {
  const { lens } = getServices();
  const layer = useDataLayer();
  const state = useStateValues();
  const context = useSubjectValue(layer.context$);
  const { attributes: lensAttributes, error } = useChartAttributes(node, data.columns);
  const accent = usePageAccent();
  const { colorMode } = useEuiTheme();
  const annotations = node.annotations;
  const attributes = useMemo(() => {
    if (!lensAttributes) return undefined;
    const coloured = applyAccentToChart(lensAttributes, accent, colorMode === 'DARK');
    return annotations && annotationData
      ? addAnnotationsToChart(coloured, annotationData, annotations)
      : coloured;
  }, [lensAttributes, accent, colorMode, annotations, annotationData]);
  const run = useActionRunner(node.id);
  const [dropped, setDropped] = useState<string[]>([]);
  // One id for as long as the chart is shown, so Lens keeps its own state between refreshes.
  const id = useMemo(() => uuidv4(), []);

  if (error) {
    return (
      <KbnDangerCallout
        size="s"
        announceOnMount={false}
        title={i18n.translate('xpack.customApp.chart.errorTitle', {
          defaultMessage: 'This chart cannot be shown',
        })}
      >
        <p>{error.message}</p>
      </KbnDangerCallout>
    );
  }
  if (!attributes) return null;

  const isClickable = node.onClick.length > 0;

  return (
    <>
      <div css={css({ height: CHART_HEIGHT })} data-test-subj="customAppChart">
        <lens.EmbeddableComponent
          id={id}
          attributes={attributes}
          timeRange={context?.timeRange}
          filters={context?.filters}
          esqlVariables={toEsqlVariables(context ?? { esqlVariables: undefined }, state)}
          searchSessionId={context?.searchSessionId}
          style={{ height: '100%' }}
          noPadding
          // A chart that has actions of its own does them when it is clicked, and not what a
          // dashboard does by default, which is to offer to filter the dashboard by what was clicked.
          {...(isClickable
            ? {
                onFilter: (event) => {
                  event.preventDefault();
                  const row = getClickedRow(event);
                  if (row) setDropped(run(node.onClick, { row }));
                },
              }
            : {})}
        />
      </div>
      <DroppedActions reasons={dropped} onDismiss={() => setDropped([])} />
    </>
  );
};

/** A chart with annotations: it reads their rows, and marks them while the value that shows them is true. */
const AnnotatedChart = ({ node, data }: { node: AppNodeOfType<'chart'>; data: SourceData }) => {
  const source = useSource(getAnnotationsSourceId(node.id));
  const isShown = node.annotations?.visible !== false;

  return (
    <Chart
      node={node}
      data={data}
      annotationData={isShown && source.status === 'success' ? source.data : undefined}
    />
  );
};

export const ChartNode = ({ node }: { node: AppNodeOfType<'chart'> }) => {
  const layer = useDataLayer();
  const state = useSource(node.id);
  const values = useStateValues();

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m" data-node-id={node.id}>
      {node.title ? (
        <EuiTitle size="xxs">
          <h4>
            <EditableText nodeId={node.id} field="title" words={node.title}>
              {interpolate(node.title, values)}
            </EditableText>
          </h4>
        </EuiTitle>
      ) : null}
      <DataState state={state} onRetry={layer.retry}>
        {(data) =>
          node.annotations ? (
            <AnnotatedChart node={node} data={data} />
          ) : (
            <Chart node={node} data={data} />
          )
        }
      </DataState>
    </EuiPanel>
  );
};
