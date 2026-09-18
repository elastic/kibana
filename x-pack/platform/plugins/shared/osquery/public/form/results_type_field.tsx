/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiBetaBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSuperSelect,
  EuiText,
  type EuiSuperSelectOption,
} from '@elastic/eui';
import { useController, useFormState } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import deepEqual from 'fast-deep-equal';
import { isResultType, type ResultType } from '../../common/result_type';

export const SNAPSHOT_OPTION: EuiSuperSelectOption<ResultType> = {
  value: 'snapshot',
  inputDisplay: (
    <FormattedMessage
      id="xpack.osquery.pack.queryFlyoutForm.resultsTypeField.snapshotValueLabel"
      defaultMessage="Snapshot"
    />
  ),
};

export const DIFFERENTIAL_OPTION: EuiSuperSelectOption<ResultType> = {
  value: 'differential',
  inputDisplay: (
    <FormattedMessage
      id="xpack.osquery.pack.queryFlyoutForm.resultsTypeField.differentialValueLabel"
      defaultMessage="Differential"
    />
  ),
};

export const DIFFERENTIAL_ADDED_ONLY_OPTION: EuiSuperSelectOption<ResultType> = {
  value: 'differential_added_only',
  inputDisplay: (
    <FormattedMessage
      id="xpack.osquery.pack.queryFlyoutForm.resultsTypeField.differentialAddedOnlyLabel"
      defaultMessage="Differential (ignore removals)"
    />
  ),
};

export const RESULT_TYPE_SELECT_OPTIONS: Array<EuiSuperSelectOption<ResultType>> = [
  SNAPSHOT_OPTION,
  DIFFERENTIAL_OPTION,
  DIFFERENTIAL_ADDED_ONLY_OPTION,
];

interface ResultsTypeFieldProps {
  euiFieldProps?: Record<string, unknown>;
}

const ResultsTypeFieldComponent: React.FC<ResultsTypeFieldProps> = ({ euiFieldProps = {} }) => {
  const [selectedOption, setSelectedOption] = useState(SNAPSHOT_OPTION.value);
  const { defaultValues } = useFormState();
  const { isDisabled, ...restEuiFieldProps } = euiFieldProps;

  const {
    field: { onChange: onSnapshotChange, value: snapshotValue },
  } = useController({
    name: 'snapshot',
    defaultValue: defaultValues?.snapshot,
  });

  const {
    field: { onChange: onRemovedChange, value: removedValue },
  } = useController({
    name: 'removed',
    defaultValue: defaultValues?.removed,
  });

  // `result_type` is the canonical field the serializer reads. The
  // `snapshot`/`removed` booleans remain the display source (and the legacy
  // wire encoding), but writing only those left `result_type` undefined, so a
  // per-query Differential override was silently dropped on save.
  const {
    field: { onChange: onResultTypeChange },
  } = useController({
    name: 'result_type',
    defaultValue: defaultValues?.result_type,
  });

  const handleChange = useCallback(
    (newValue: string) => {
      if (isResultType(newValue)) {
        onResultTypeChange(newValue);
      }

      if (newValue === SNAPSHOT_OPTION.value) {
        onSnapshotChange(true);
        onRemovedChange(false);
      }

      if (newValue === DIFFERENTIAL_OPTION.value) {
        onSnapshotChange(false);
        onRemovedChange(true);
      }

      if (newValue === DIFFERENTIAL_ADDED_ONLY_OPTION.value) {
        onSnapshotChange(false);
        onRemovedChange(false);
      }
    },
    [onRemovedChange, onSnapshotChange, onResultTypeChange]
  );

  useEffect(() => {
    setSelectedOption(() => {
      if (snapshotValue) {
        return SNAPSHOT_OPTION.value;
      }

      if (!snapshotValue && removedValue) {
        return DIFFERENTIAL_OPTION.value;
      }

      if (!snapshotValue && !removedValue) {
        return DIFFERENTIAL_ADDED_ONLY_OPTION.value;
      }

      return SNAPSHOT_OPTION.value;
    });
  }, [removedValue, snapshotValue]);

  return (
    <EuiFormRow
      label={
        <EuiFlexGroup gutterSize="s" alignItems="flexEnd">
          <EuiFlexItem grow={false}>
            <FormattedMessage
              id="xpack.osquery.pack.queryFlyoutForm.resultTypeFieldLabel"
              defaultMessage="Result type"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBetaBadge
              label={i18n.translate('xpack.osquery.betaBadgeLabel', {
                defaultMessage: 'Beta',
              })}
              size="s"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      labelAppend={
        <EuiText size="xs" color="subdued">
          <FormattedMessage
            id="xpack.osquery.queryFlyoutForm.optionalLabel"
            defaultMessage="optional"
          />
        </EuiText>
      }
      fullWidth
    >
      <EuiSuperSelect
        data-test-subj={'resultsTypeField'}
        options={RESULT_TYPE_SELECT_OPTIONS}
        fullWidth
        valueOfSelected={selectedOption}
        onChange={handleChange}
        disabled={!!isDisabled}
        {...restEuiFieldProps}
      />
    </EuiFormRow>
  );
};

export const ResultsTypeField = React.memo(ResultsTypeFieldComponent, deepEqual);
