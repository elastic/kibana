/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { MlAnomalyRecordDoc } from '@kbn/ml-anomaly-utils/types';
import type { FC } from 'react';
import { EuiToolTip } from '@elastic/eui';
import type { FieldFormat } from '@kbn/field-formats-plugin/common';
import { getTimeValueInfo, isTimeFunction } from './anomaly_value_utils';
import { formatValue } from '../../formatters/format_value';

interface AnomalyDateValueProps {
  value: number | number[];
  function: string;
  record?: MlAnomalyRecordDoc;
  fieldFormat?: FieldFormat;
}

export const AnomalyValueDisplay: FC<AnomalyDateValueProps> = ({
  value,
  function: functionName,
  record,
  fieldFormat,
}) => {
  // If the function is not a time function, format the value using the formatValue function
  // and return just the formatted value
  if (!isTimeFunction(functionName)) {
    return (
      <span data-test-subj="mlAnomalyValue">
        {formatValue(value, functionName, fieldFormat, record)}
      </span>
    );
  }

  // If the function is a time function, format the value using the getTimeValueInfo function
  // and return the formatted value and tooltip content
  const singleValue = Array.isArray(value) ? value[0] : value;
  const { formattedTime, tooltipContent, dayOffset } = getTimeValueInfo(
    singleValue,
    functionName,
    record
  );

  return (
    <EuiToolTip
      content={tooltipContent}
      position="left"
      anchorProps={{
        'data-test-subj': 'mlAnomalyTimeValue',
      }}
      data-test-subj="mlAnomalyTimeValueTooltip"
    >
      <>
        {formattedTime}
        {dayOffset !== undefined && dayOffset !== 0 && (
          <sub data-test-subj="mlAnomalyTimeValueOffset">
            {dayOffset > 0 ? `+${dayOffset}` : dayOffset}
          </sub>
        )}
      </>
    </EuiToolTip>
  );
};
