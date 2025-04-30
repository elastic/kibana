/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import type { Field, AggFieldPair } from '@kbn/ml-anomaly-utils';
import type { DropDownLabel, DropDownProps } from '../agg_select';
import { AggSelect } from '../agg_select';

interface Props {
  fields: Field[];
  detectorChangeHandler: (options: DropDownLabel[]) => void;
  selectedOptions: DropDownProps;
  removeOptions: AggFieldPair[];
}

export const MetricSelector: FC<Props> = ({
  fields,
  detectorChangeHandler,
  selectedOptions,
  removeOptions,
}) => {
  return (
    <EuiFlexGroup>
      <AggSelect
        fields={fields}
        changeHandler={detectorChangeHandler}
        selectedOptions={selectedOptions}
        removeOptions={removeOptions}
      />
    </EuiFlexGroup>
  );
};
