/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useCallback, useMemo } from 'react';
import {
  EuiComboBox,
  type EuiComboBoxOptionOption,
  type EuiComboBoxOptionsListProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isDefined } from '@kbn/ml-is-defined';
import { type ChangePointType, CHANGE_POINT_TYPES } from './constants';

export type ChangePointUIValue = ChangePointType | undefined;

interface ChangePointTypeFilterProps {
  value: ChangePointType[] | undefined;
  onChange: (changePointType: ChangePointType[] | undefined) => void;
}

const changePointTypes: Array<{ value: ChangePointType; description: string }> = [
  {
    value: CHANGE_POINT_TYPES.DIP,
    description: i18n.translate('xpack.aiops.changePointDetection.dipDescription', {
      defaultMessage: 'A significant dip occurs at this point.',
    }),
  },
  {
    value: CHANGE_POINT_TYPES.SPIKE,
    description: i18n.translate('xpack.aiops.changePointDetection.spikeDescription', {
      defaultMessage: 'A significant spike occurs at this point.',
    }),
  },
  {
    value: CHANGE_POINT_TYPES.DISTRIBUTION_CHANGE,
    description: i18n.translate('xpack.aiops.changePointDetection.distributionChangeDescription', {
      defaultMessage: 'The overall distribution of the values has changed significantly.',
    }),
  },
  {
    value: CHANGE_POINT_TYPES.STEP_CHANGE,
    description: i18n.translate('xpack.aiops.changePointDetection.stepChangeDescription', {
      defaultMessage:
        'The change indicates a statistically significant step up or down in value distribution.',
    }),
  },
  {
    value: CHANGE_POINT_TYPES.TREND_CHANGE,
    description: i18n.translate('xpack.aiops.changePointDetection.trendChangeDescription', {
      defaultMessage: 'An overall trend change occurs at this point.',
    }),
  },
];

interface FilterOption {
  value: ChangePointUIValue;
  label: string;
  description: string;
}

type ChangePointTypeFilterOptions = Array<EuiComboBoxOptionOption<ChangePointUIValue>>;

export const ChangePointTypeFilter: FC<ChangePointTypeFilterProps> = ({ value, onChange }) => {
  const options = useMemo<ChangePointTypeFilterOptions>(() => {
    return [{ value: undefined, description: '' }, ...changePointTypes].map((v) => ({
      value: v.value,
      label:
        v.value ??
        i18n.translate('xpack.aiops.changePointDetection.selectAllChangePoints', {
          defaultMessage: 'Select all',
        }),
      description: v.description,
    }));
  }, []);

  const selection: ChangePointTypeFilterOptions = !value
    ? [options[0]]
    : options.filter((v) => value.includes(v.value!));

  const onChangeCallback = useCallback(
    (selectedOptions: ChangePointTypeFilterOptions) => {
      if (
        selectedOptions.length === 0 ||
        selectedOptions[selectedOptions.length - 1].value === undefined
      ) {
        onChange(undefined);
        return;
      }

      onChange(selectedOptions.map((v) => v.value as ChangePointType).filter(isDefined));
    },
    [onChange]
  );

  const renderOption = useCallback((option: FilterOption) => {
    const { label, description } = option;

    if (!description) {
      return <>{label}</>;
    }
    return (
      <EuiToolTip position="left" content={description}>
        <EuiFlexGroup gutterSize={'s'} alignItems={'center'}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="info" color={'primary'} />
          </EuiFlexItem>
          <EuiFlexItem>{label}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiToolTip>
    );
  }, []) as unknown as EuiComboBoxOptionsListProps<ChangePointUIValue>['renderOption'];

  return (
    <EuiFormRow
      label={i18n.translate('xpack.aiops.changePointDetection.changePointTypeLabel', {
        defaultMessage: 'Change point type',
      })}
      display={'columnCompressed'}
      fullWidth
    >
      <EuiComboBox<ChangePointType | undefined>
        options={options}
        selectedOptions={selection}
        onChange={onChangeCallback}
        isClearable
        data-test-subj="aiopsChangePointTypeFilter"
        renderOption={renderOption}
        compressed
      />
    </EuiFormRow>
  );
};
