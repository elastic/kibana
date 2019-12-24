/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFieldNumber, EuiFormRow, EuiSelect } from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';

import { FieldHook, getFieldValidityAndErrorMessage } from '../shared_imports';

import * as I18n from './translations';

interface ScheduleItemProps {
  field: FieldHook;
  dataTestSubj: string;
  idAria: string;
  isDisabled: boolean;
}

const timeTypeOptions = [
  { value: 's', text: I18n.SECONDS },
  { value: 'm', text: I18n.MINUTES },
  { value: 'h', text: I18n.HOURS },
];

const StyledEuiFormRow = styled(EuiFormRow)`
  .euiFormControlLayout {
    max-width: 200px !important;
  }
`;

const MyEuiSelect = styled(EuiSelect)`
  width: auto;
`;

export const ScheduleItem = ({ dataTestSubj, field, idAria, isDisabled }: ScheduleItemProps) => {
  const [timeType, setTimeType] = useState('s');
  const [timeVal, setTimeVal] = useState<number>(0);
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

  const onChangeTimeType = useCallback(
    e => {
      setTimeType(e.target.value);
      field.setValue(`${timeVal}${e.target.value}`);
    },
    [timeVal]
  );

  const onChangeTimeVal = useCallback(
    e => {
      const sanitizedValue: number = parseInt(e.target.value, 10);
      setTimeVal(sanitizedValue);
      field.setValue(`${sanitizedValue}${timeType}`);
    },
    [timeType]
  );

  useEffect(() => {
    if (field.value !== `${timeVal}${timeType}`) {
      const filterTimeVal = (field.value as string).match(/\d+/g);
      const filterTimeType = (field.value as string).match(/[a-zA-Z]+/g);
      if (
        !isEmpty(filterTimeVal) &&
        filterTimeVal != null &&
        !isNaN(Number(filterTimeVal[0])) &&
        Number(filterTimeVal[0]) !== Number(timeVal)
      ) {
        setTimeVal(Number(filterTimeVal[0]));
      }
      if (
        !isEmpty(filterTimeType) &&
        filterTimeType != null &&
        ['s', 'm', 'h'].includes(filterTimeType[0]) &&
        filterTimeType[0] !== timeType
      ) {
        setTimeType(filterTimeType[0]);
      }
    }
  }, [field.value]);

  // EUI missing some props
  const rest = { disabled: isDisabled };

  return (
    <StyledEuiFormRow
      label={field.label}
      labelAppend={field.labelAppend}
      helpText={field.helpText}
      error={errorMessage}
      isInvalid={isInvalid}
      fullWidth
      data-test-subj={dataTestSubj}
      describedByIds={idAria ? [idAria] : undefined}
    >
      <EuiFieldNumber
        append={
          <MyEuiSelect
            fullWidth={false}
            options={timeTypeOptions}
            onChange={onChangeTimeType}
            value={timeType}
            {...rest}
          />
        }
        fullWidth
        min={0}
        onChange={onChangeTimeVal}
        value={timeVal}
        {...rest}
      />
    </StyledEuiFormRow>
  );
};
