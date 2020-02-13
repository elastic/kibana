/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow } from '@elastic/eui';
import { State } from './types';
import { VisualizationLayerConfigProps, OperationMetadata } from '../types';
import { NativeRenderer } from '../native_renderer';

const isMetric = (op: OperationMetadata) => !op.isBucketed && op.dataType === 'number';

export function MetricConfigPanel(props: VisualizationLayerConfigProps<State>) {
  const { state, frame, layerId } = props;
  const datasource = frame.datasourceLayers[layerId];

  return (
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
  );
}
