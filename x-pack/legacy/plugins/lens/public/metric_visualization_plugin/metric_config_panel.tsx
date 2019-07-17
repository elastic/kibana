/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiForm, EuiFormRow } from '@elastic/eui';
import { State } from './types';
import { VisualizationProps, Operation } from '../types';
import { NativeRenderer } from '../native_renderer';

export function MetricConfigPanel(props: VisualizationProps<State>) {
  const { state, datasource } = props;

  return (
    <EuiForm className="lnsConfigPanel">
      <EuiFormRow
        label={i18n.translate('xpack.lens.metric.valueLabel', {
          defaultMessage: 'Value',
        })}
      >
        <NativeRenderer
          data-test-subj={`lns_metric_valueDimensionPanel`}
          render={datasource.renderDimensionPanel}
          nativeProps={{
            columnId: state.accessor,
            dragDropContext: props.dragDropContext,
            filterOperations: (op: Operation) => !op.isBucketed && op.dataType === 'number',
          }}
        />
      </EuiFormRow>
    </EuiForm>
  );
}
