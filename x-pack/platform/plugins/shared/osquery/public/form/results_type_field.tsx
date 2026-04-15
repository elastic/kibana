/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiBetaBadge,
  EuiFormRow,
  EuiSuperSelect,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
} from '@elastic/eui';
import { useController, useFormState } from 'react-hook-form';
import { FormattedMessage } from '@kbn/i18n-react';
import deepEqual from 'fast-deep-equal';
import { i18n } from '@kbn/i18n';

const SNAPSHOT_OPTION = {
  value: 'snapshot',
  inputDisplay: (
    <FormattedMessage
      id="xpack.osquery.pack.queryFlyoutForm.resultsTypeField.snapshotValueLabel"
      defaultMessage="Snapshot"
    />
  ),
};

const DIFFERENTIAL_OPTION = {
  value: 'differential',
  inputDisplay: (
    <FormattedMessage
      id="xpack.osquery.pack.queryFlyoutForm.resultsTypeField.differentialValueLabel"
      defaultMessage="Differential"
    />
  ),
};

const DIFFERENTIAL_ADDED_ONLY_OPTION = {
  value: 'added_only',
  inputDisplay: (
    <FormattedMessage
      id="xpack.osquery.pack.queryFlyoutForm.resultsTypeField.differentialAddedOnlyValueLabel"
      defaultMessage="Differential (Ignore removals)"
    />
  ),
};

const FIELD_OPTIONS = [SNAPSHOT_OPTION, DIFFERENTIAL_OPTION, DIFFERENTIAL_ADDED_ONLY_OPTION];

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

  const handleChange = useCallback(
    (newValue: any) => {
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
    [onRemovedChange, onSnapshotChange]
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
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.osquery.queryFlyoutForm.fieldOptionalLabel"
              defaultMessage="(optional)"
            />
          </EuiText>
        </EuiFlexItem>
      }
      fullWidth
    >
      <EuiSuperSelect
        data-test-subj={'resultsTypeField'}
        options={FIELD_OPTIONS}
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
