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
import { useTimeValueInfo } from './anomaly_value_utils';
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
  const singleValue = Array.isArray(value) ? value[0] : value;
  const timeValueInfo = useTimeValueInfo(singleValue, functionName, record);

  // If the function is a time function, return the formatted value and tooltip content
  if (timeValueInfo !== null) {
    return (
      <EuiToolTip
        content={timeValueInfo.tooltipContent}
        position="left"
        anchorProps={{
          'data-test-subj': 'mlAnomalyTimeValue',
        }}
        data-test-subj="mlAnomalyTimeValueTooltip"
      >
        <>
          {timeValueInfo.formattedTime}
          {timeValueInfo.dayOffset !== undefined && timeValueInfo.dayOffset !== 0 && (
            <sub data-test-subj="mlAnomalyTimeValueOffset">
              {timeValueInfo.dayOffset > 0
                ? `+${timeValueInfo.dayOffset}`
                : timeValueInfo.dayOffset}
            </sub>
          )}
        </>
      </EuiToolTip>
    );
  }

  // If the function is not a time function, return just the formatted value
  return (
    <span data-test-subj="mlAnomalyValue">
      {formatValue(value, functionName, fieldFormat, record)}
    </span>
  );
};
