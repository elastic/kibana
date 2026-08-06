/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent, Ref } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import type { EuiSuperSelectOption, EuiSelectableOption } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiInputPopover,
  EuiPopoverTitle,
  EuiSelectable,
  EuiSuperSelectControl,
} from '@elastic/eui';

import { AWS_REGIONS, getCountryFlagEmoji, type AwsRegionOption } from './aws_regions';

const selectableListProps = {
  onFocusBadge: false,
  paddingSize: 's' as const,
  css: css`
    max-block-size: 300px;
    overflow-y: auto;
  `,
  bordered: false,
};

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

const getRegionPrepend = (region: AwsRegionOption) => {
  const flag = getCountryFlagEmoji(region.countryCode);

  return flag ? <span aria-hidden="true">{flag}</span> : undefined;
};

export interface RegionSuperSelectProps {
  value?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder: string;
  searchPlaceholder: string;
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
  searchPlaceholder,
  'aria-label': ariaLabel,
  'data-test-subj': dataTestSubj,
  name,
  buttonRef,
  isInvalid = false,
  fullWidth = false,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const controlOptions = useMemo(
    (): Array<EuiSuperSelectOption<string>> =>
      AWS_REGIONS.map((region) => ({
        value: region.id,
        inputDisplay: <RegionOptionDisplay region={region} />,
      })),
    []
  );

  const selectableOptions = useMemo(
    (): EuiSelectableOption[] =>
      AWS_REGIONS.map((region) => ({
        key: region.id,
        label: region.label,
        searchableLabel: `${region.label} ${region.id}`,
        checked: value === region.id ? 'on' : undefined,
        prepend: getRegionPrepend(region),
      })),
    [value]
  );

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const togglePopover = useCallback(() => {
    setIsPopoverOpen((open) => !open);
  }, []);

  const control = (
    <EuiSuperSelectControl
      options={controlOptions}
      value={value}
      placeholder={placeholder}
      onClick={togglePopover}
      className="euiSuperSelectControl"
      fullWidth={fullWidth}
      isInvalid={isInvalid}
      isDropdownOpen={isPopoverOpen}
      name={name}
      buttonRef={buttonRef}
      aria-label={ariaLabel}
      data-test-subj={dataTestSubj}
    />
  );

  return (
    <EuiInputPopover
      className="euiSuperSelect"
      input={control}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      fullWidth={fullWidth}
      disableFocusTrap
    >
      <EuiSelectable
        searchable
        searchProps={{
          placeholder: searchPlaceholder,
          'data-test-subj': `${dataTestSubj ?? 'regionSuperSelect'}Search`,
        }}
        singleSelection="always"
        options={selectableOptions}
        listProps={selectableListProps}
        onChange={(_newOptions, _event, changedOption) => {
          if (changedOption?.key) {
            onChange(String(changedOption.key));
            onBlur?.();
            closePopover();
          }
        }}
      >
        {(list, search) => (
          <>
            <EuiPopoverTitle paddingSize="s">{search}</EuiPopoverTitle>
            {list}
          </>
        )}
      </EuiSelectable>
    </EuiInputPopover>
  );
};
