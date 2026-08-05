/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent, Ref } from 'react';
import React, { useMemo } from 'react';
import type { EuiSuperSelectOption } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiSuperSelect } from '@elastic/eui';

import { AWS_REGIONS, getCountryFlagEmoji, type AwsRegionOption } from './aws_regions';

const RegionOptionDisplay: FunctionComponent<{ region: AwsRegionOption }> = ({ region }) => {
  const flag = getCountryFlagEmoji(region.countryCode);

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      {flag ? (
        <EuiFlexItem grow={false}>
          <span aria-hidden="true">{flag}</span>
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem grow={false}>{region.label}</EuiFlexItem>
    </EuiFlexGroup>
  );
};

export interface RegionSuperSelectProps {
  value?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder: string;
  'aria-label': string;
  'data-test-subj'?: string;
  name?: string;
  buttonRef?: Ref<HTMLButtonElement>;
  isInvalid?: boolean;
  fullWidth?: boolean;
}

export const RegionSuperSelect: FunctionComponent<RegionSuperSelectProps> = ({
  value,
  onChange,
  onBlur,
  placeholder,
  'aria-label': ariaLabel,
  'data-test-subj': dataTestSubj,
  name,
  buttonRef,
  isInvalid = false,
  fullWidth = false,
}) => {
  const options = useMemo(
    (): Array<EuiSuperSelectOption<string>> =>
      AWS_REGIONS.map((region) => ({
        value: region.id,
        inputDisplay: <RegionOptionDisplay region={region} />,
        dropdownDisplay: <RegionOptionDisplay region={region} />,
      })),
    []
  );

  return (
    <EuiSuperSelect
      options={options}
      data-test-subj={dataTestSubj}
      fullWidth={fullWidth}
      aria-label={ariaLabel}
      placeholder={placeholder}
      valueOfSelected={value || undefined}
      onChange={(nextValue) => {
        onChange(nextValue);
        onBlur?.();
      }}
      name={name}
      buttonRef={buttonRef}
      isInvalid={isInvalid}
    />
  );
};
