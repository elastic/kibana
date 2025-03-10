/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  ChangeEvent,
  MouseEvent,
  KeyboardEvent,
  FunctionComponent,
  useCallback,
  useEffect,
} from 'react';
import PropTypes from 'prop-types';
import {
  EuiFormRow,
  EuiRange,
  EuiSelect,
  EuiSelectOption,
  EuiSpacer,
  EuiSwitch,
  EuiSwitchEvent,
  EuiText,
} from '@elastic/eui';
import { ExpressionAstExpression } from '@kbn/expressions-plugin/common';
import { set } from '@kbn/safer-lodash-set';
import { defaultExpression } from './default_expression';
import { Fields } from './types';
import { getFieldPath, getFieldValue } from './utils';
import { ArgumentStrings } from '../../../../i18n';

const { PartitionLabels: strings } = ArgumentStrings;

export interface Props {
  onValueChange: (argValue: ExpressionAstExpression) => void;
  argValue: null | ExpressionAstExpression;
}

const SHOW_FIELD = 'show';
const POSITION_FIELD = 'position';
const VALUES_FIELD = 'values';
const VALUES_FORMAT_FIELD = 'valuesFormat';
const PERCENT_DECIMALS_FIELD = 'percentDecimals';

export const ExtendedTemplate: FunctionComponent<Props> = ({ onValueChange, argValue }) => {
  const showLabels = getFieldValue(argValue, SHOW_FIELD);
  const showValues = getFieldValue(argValue, VALUES_FIELD) as boolean;
  const valueFormat = getFieldValue(argValue, VALUES_FORMAT_FIELD) as string;
  const percentDecimals = getFieldValue(argValue, PERCENT_DECIMALS_FIELD) as string;

  const positions: EuiSelectOption[] = [
    { text: strings.getPositionDefaultLabel(), value: 'default' },
    { text: strings.getPositionInsideLabel(), value: 'inside' },
  ];

  const valuesFormats: EuiSelectOption[] = [
    { text: strings.getValuesFormatValueLabel(), value: 'value' },
    { text: strings.getValuesFormatPercentLabel(), value: 'percent' },
  ];

  useEffect(() => {
    if (!argValue) {
      onValueChange(defaultExpression());
    }
  }, [argValue, onValueChange]);

  const onChangeField = useCallback(
    (field: Fields, value: unknown) => {
      const path = getFieldPath(field);
      const oldArgValue = argValue ?? defaultExpression();
      const newArgValue = set(oldArgValue, path, value);

      onValueChange(newArgValue);
    },
    [argValue, onValueChange]
  );

  const onToggleFieldChange = useCallback(
    (field: Fields) => (event: EuiSwitchEvent) => {
      onChangeField(field, event.target.checked);
    },
    [onChangeField]
  );

  const onCommonFieldChange = useCallback(
    (field: Fields) =>
      (
        event:
          | ChangeEvent<HTMLInputElement | HTMLSelectElement>
          | KeyboardEvent<HTMLInputElement>
          | MouseEvent<HTMLButtonElement>
      ) => {
        onChangeField(field, event.currentTarget.value);
      },
    [onChangeField]
  );

  if (!showLabels) {
    return (
      <EuiText color="subdued" size="xs">
        <p>{strings.getSwitchedOffShowLabelsLabel()}</p>
      </EuiText>
    );
  }

  return (
    <>
      <EuiFormRow label={strings.getPositionLabel()} display="columnCompressed">
        <EuiSelect
          compressed
          value={getFieldValue(argValue, POSITION_FIELD) as string}
          options={positions}
          onChange={onCommonFieldChange(POSITION_FIELD)}
        />
      </EuiFormRow>
      <EuiSpacer size="s" />
      <EuiFormRow label={strings.getValuesLabel()} display="columnCompressed">
        <EuiSwitch
          compressed
          checked={showValues}
          onChange={onToggleFieldChange(VALUES_FIELD)}
          label={strings.getValuesToggle()}
        />
      </EuiFormRow>
      {showValues && (
        <EuiFormRow label={strings.getValuesFormatLabel()} display="columnCompressed">
          <EuiSelect
            compressed
            value={valueFormat}
            options={valuesFormats}
            onChange={onCommonFieldChange(VALUES_FORMAT_FIELD)}
          />
        </EuiFormRow>
      )}
      {showValues && valueFormat === 'percent' && (
        <EuiFormRow label={strings.getPercentDecimalsLabel()} display="columnCompressed">
          <EuiRange
            compressed
            min={0}
            max={10}
            step={1}
            showLabels
            showInput
            value={percentDecimals}
            onChange={(e, isValid) => {
              if (isValid) {
                onCommonFieldChange(PERCENT_DECIMALS_FIELD)(e);
              }
            }}
          />
        </EuiFormRow>
      )}
    </>
  );
};

ExtendedTemplate.propTypes = {
  onValueChange: PropTypes.func.isRequired,
  argValue: PropTypes.oneOfType([PropTypes.bool, PropTypes.object]).isRequired,
};

ExtendedTemplate.displayName = 'PartitionLabelsExtendedArg';
