/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { Field, AggFieldPair } from '@kbn/ml-anomaly-utils';
import type { DropDownLabel, DropDownProps } from '../agg_select';
import { AggSelect } from '../agg_select';

interface Props {
  fields: Field[];
  detectorChangeHandler: (options: DropDownLabel[]) => void;
  selectedOptions: DropDownProps;
  maxWidth?: number;
  removeOptions: AggFieldPair[];
}

const MAX_WIDTH = 560;

export const MetricSelector: FC<Props> = ({
  fields,
  detectorChangeHandler,
  selectedOptions,
  maxWidth,
  removeOptions,
}) => {
  return (
    <EuiFlexGroup style={{ maxWidth: maxWidth !== undefined ? maxWidth : MAX_WIDTH }}>
      <EuiFlexItem>
        <EuiFormRow
          label={i18n.translate('xpack.ml.newJob.wizard.pickFieldsStep.metricSelector.addMetric', {
            defaultMessage: 'Add metric',
          })}
        >
          <AggSelect
            fields={fields}
            changeHandler={detectorChangeHandler}
            selectedOptions={selectedOptions}
            removeOptions={removeOptions}
          />
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
