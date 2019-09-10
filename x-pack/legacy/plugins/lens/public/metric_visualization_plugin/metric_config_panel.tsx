/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiPanel, EuiSpacer } from '@elastic/eui';
import { State } from './types';
import { VisualizationProps, OperationMetadata } from '../types';
import { NativeRenderer } from '../native_renderer';

const isMetric = (op: OperationMetadata) => !op.isBucketed && op.dataType === 'number';

export function MetricConfigPanel(props: VisualizationProps<State>) {
  const { state, frame } = props;
  const [datasource] = Object.values(frame.datasourceLayers);
  const [layerId] = Object.keys(frame.datasourceLayers);

  return (
    <EuiPanel className="lnsConfigPanel__panel" paddingSize="s">
      <NativeRenderer render={datasource.renderLayerPanel} nativeProps={{ layerId }} />

      <EuiSpacer size="s" />

      <EuiFormRow
        className="lnsConfigPanel__axis"
        label={i18n.translate('xpack.lens.metric.valueLabel', {
          defaultMessage: 'Value',
        })}
      >
        <NativeRenderer
          data-test-subj={'lns_metric_valueDimensionPanel'}
          render={datasource.renderDimensionPanel}
          nativeProps={{
            layerId,
            columnId: state.accessor,
            dragDropContext: props.dragDropContext,
            filterOperations: isMetric,
          }}
        />
      </EuiFormRow>
    </EuiPanel>
  );
}
