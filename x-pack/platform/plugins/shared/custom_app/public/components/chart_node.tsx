/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { EuiPanel, EuiTitle } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { interpolate, type AppNodeOfType } from '@kbn/custom-app-common';
import { useDataLayer } from '../data/data_layer_context';
import { toEsqlVariables } from '../data/esql_variables';
import { useSource } from '../data/use_source';
import { useStateValues } from '../runtime/app_runtime_context';
import { getServices } from '../services';
import { useSubjectValue } from '../utils/use_subject_value';
import { DataState } from './data_state';
import { useChartAttributes } from './use_chart_attributes';
import type { SourceData } from '../data/data_layer';

/** A chart is this tall everywhere: its look is not the author's to decide. */
const CHART_HEIGHT = 280;

const Chart = ({ node, data }: { node: AppNodeOfType<'chart'>; data: SourceData }) => {
  const { lens } = getServices();
  const layer = useDataLayer();
  const state = useStateValues();
  const context = useSubjectValue(layer.context$);
  const { attributes, error } = useChartAttributes(node, data.columns);
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

  return (
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
      />
    </div>
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
          <h4>{interpolate(node.title, values)}</h4>
        </EuiTitle>
      ) : null}
      <DataState state={state} onRetry={layer.retry}>
        {(data) => <Chart node={node} data={data} />}
      </DataState>
    </EuiPanel>
  );
};
