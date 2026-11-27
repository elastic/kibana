/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useState } from 'react';
import type { EuiFieldNumberProps, EuiThemeComputed } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormFieldset,
  EuiFormRow,
  EuiPanel,
  EuiPopover,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { Control, RefCallBack } from 'react-hook-form';
import { useController } from 'react-hook-form';

import type { BoostLimits, MaxAgeUnit } from '../../../common/profile_validation';
import {
  MAX_AGE_MAX_VALUES,
  MAX_AGE_UNITS,
  validateMaxAge,
  validateMaxBoost,
  validateMinBoost,
} from '../../../common/profile_validation';
import type { BoostProfileType } from '../../../common/types';
import type { ValidationError } from '../../../common/validation';
import type { BoostPeriodId } from '../boost_timeline/boost_periods';
import { BOOST_PERIOD_LABELS } from '../boost_timeline/boost_periods';
import type {
  AgedPeriodName,
  BoostRangeFieldsName,
  ProfileFormValues,
} from './profile_form_values';
import { parseNumber, toMaxAge } from './profile_form_values';
import {
  MAX_AGE_LABEL,
  MAX_AGE_UNIT_LABELS,
  MAX_AGE_UNIT_MENU_LABEL,
  MAX_BOOST_LABEL,
  MIN_BOOST_LABEL,
  getMaxAgeUnitButtonLabel,
} from './translations';

const PERIODS: readonly BoostPeriodId[] = ['recent', 'standard', 'background'];

const FIELDS_TYPES: Readonly<Record<BoostRangeFieldsName, BoostProfileType>> = {
  indices: 'indices',
  recent: 'data_streams',
  standard: 'data_streams',
  background: 'data_streams',
};

const toRuleResult = (error?: ValidationError<string>): string | true => error?.message ?? true;

interface NumberFieldProps {
  label: string;
  value: string;
  error?: string;
  min: number;
  max: number;
  step?: number;
  append?: EuiFieldNumberProps['append'];
  isDisabled: boolean;
  inputRef: RefCallBack;
  onChange: (value: string) => void;
  onBlur: () => void;
  'data-test-subj': string;
}

const NumberField = ({
  label,
  value,
  error,
  min,
  max,
  step,
  append,
  isDisabled,
  inputRef,
  onChange,
  onBlur,
  'data-test-subj': dataTestSubj,
}: NumberFieldProps) => (
  <EuiFormRow
    fullWidth
    display="rowCompressed"
    label={label}
    isInvalid={Boolean(error)}
    error={error}
  >
    <EuiFieldNumber
      fullWidth
      compressed
      min={min}
      max={max}
      step={step}
      value={value}
      append={append}
      isInvalid={Boolean(error)}
      disabled={isDisabled}
      inputRef={inputRef}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      data-test-subj={dataTestSubj}
    />
  </EuiFormRow>
);

interface MaxAgeUnitMenuProps {
  name: AgedPeriodName;
  unit: MaxAgeUnit;
  isDisabled: boolean;
  onChange: (unit: MaxAgeUnit) => void;
}

const MaxAgeUnitMenu = ({ name, unit, isDisabled, onChange }: MaxAgeUnitMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <EuiPopover
      aria-label={MAX_AGE_UNIT_MENU_LABEL}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downRight"
      button={
        <EuiButtonEmpty
          size="xs"
          iconType="chevronSingleDown"
          iconSide="right"
          isDisabled={isDisabled}
          aria-label={getMaxAgeUnitButtonLabel(unit)}
          onClick={() => setIsOpen((open) => !open)}
          data-test-subj={`searchBoostProfileFlyoutMaxAgeUnit-${name}`}
        >
          {MAX_AGE_UNIT_LABELS[unit]}
        </EuiButtonEmpty>
      }
    >
      <EuiContextMenuPanel
        items={MAX_AGE_UNITS.map((option) => (
          <EuiContextMenuItem
            key={option}
            icon={option === unit ? 'check' : 'empty'}
            onClick={() => {
              onChange(option);
              setIsOpen(false);
            }}
            data-test-subj={`searchBoostProfileFlyoutMaxAgeUnitOption-${option}`}
          >
            {MAX_AGE_UNIT_LABELS[option]}
          </EuiContextMenuItem>
        ))}
      />
    </EuiPopover>
  );
};

interface MaxAgeFieldProps {
  control: Control<ProfileFormValues>;
  name: AgedPeriodName;
  isDisabled: boolean;
}

/** The whole number of hours or days up to which data is in a period. */
const MaxAgeField = ({ control, name, isDisabled }: MaxAgeFieldProps) => {
  const maxAgeName = `${name}.maxAge` as const;
  const dependentMaxAges = name === 'recent' ? ['standard.maxAge' as const] : [];
  const { field, fieldState } = useController({
    control,
    name: maxAgeName,
    rules: {
      validate: (_maxAge, values) =>
        values.type === 'data_streams'
          ? toRuleResult(
              validateMaxAge(
                toMaxAge(values[name]),
                name === 'standard' ? toMaxAge(values.recent) : undefined
              )
            )
          : true,
      deps: dependentMaxAges,
    },
  });
  const { field: unitField } = useController({
    control,
    name: `${name}.maxAgeUnit` as const,
    rules: { deps: [maxAgeName, ...dependentMaxAges] },
  });

  return (
    <NumberField
      label={MAX_AGE_LABEL}
      value={field.value}
      error={fieldState.error?.message}
      min={0}
      max={MAX_AGE_MAX_VALUES[unitField.value]}
      step={1}
      append={
        <MaxAgeUnitMenu
          name={name}
          unit={unitField.value}
          isDisabled={isDisabled}
          onChange={unitField.onChange}
        />
      }
      isDisabled={isDisabled}
      inputRef={field.ref}
      onChange={field.onChange}
      onBlur={field.onBlur}
      data-test-subj={`searchBoostProfileFlyoutMaxAge-${name}`}
    />
  );
};

interface BoostRangeFieldsProps {
  control: Control<ProfileFormValues>;
  name: BoostRangeFieldsName;
  limits: BoostLimits;
  isDisabled: boolean;
}

// EUI gives the unit menu at most half of the field, so the field needs room for the menu twice.
const getMaxAgeColumnStyles = ({ base }: EuiThemeComputed) => css`
  min-inline-size: ${base * 9}px;
`;

/** Min and max boost side by side, with the max age for the recent and standard periods. */
const BoostRangeFields = ({ control, name, limits, isDisabled }: BoostRangeFieldsProps) => {
  const { euiTheme } = useEuiTheme();
  const isShown = (values: ProfileFormValues) => values.type === FIELDS_TYPES[name];
  const minBoostName = `${name}.minBoost` as const;
  const maxBoostName = `${name}.maxBoost` as const;

  const { field: minField, fieldState: minState } = useController({
    control,
    name: minBoostName,
    rules: {
      validate: (minBoost, values) =>
        isShown(values) ? toRuleResult(validateMinBoost(parseNumber(minBoost), limits)) : true,
      deps: maxBoostName,
    },
  });

  const { field: maxField, fieldState: maxState } = useController({
    control,
    name: maxBoostName,
    rules: {
      validate: (maxBoost, values) =>
        isShown(values)
          ? toRuleResult(
              validateMaxBoost(parseNumber(maxBoost), parseNumber(values[name].minBoost), limits)
            )
          : true,
    },
  });

  return (
    <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
      <EuiFlexItem>
        <NumberField
          label={MIN_BOOST_LABEL}
          value={minField.value}
          error={minState.error?.message}
          min={limits.minBoost}
          max={limits.maxBoost}
          isDisabled={isDisabled}
          inputRef={minField.ref}
          onChange={minField.onChange}
          onBlur={minField.onBlur}
          data-test-subj={`searchBoostProfileFlyoutMinBoost-${name}`}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <NumberField
          label={MAX_BOOST_LABEL}
          value={maxField.value}
          error={maxState.error?.message}
          min={limits.minBoost}
          max={limits.maxBoost}
          isDisabled={isDisabled}
          inputRef={maxField.ref}
          onChange={maxField.onChange}
          onBlur={maxField.onBlur}
          data-test-subj={`searchBoostProfileFlyoutMaxBoost-${name}`}
        />
      </EuiFlexItem>
      {name === 'recent' || name === 'standard' ? (
        <EuiFlexItem css={getMaxAgeColumnStyles(euiTheme)}>
          <MaxAgeField control={control} name={name} isDisabled={isDisabled} />
        </EuiFlexItem>
      ) : null}
      {/* Keeps the background fields as wide as those of the periods above it. */}
      {name === 'background' ? (
        <EuiFlexItem aria-hidden={true} css={getMaxAgeColumnStyles(euiTheme)} />
      ) : null}
    </EuiFlexGroup>
  );
};

const PeriodPanel = ({ period, children }: { period: BoostPeriodId; children: ReactNode }) => {
  const titleId = useGeneratedHtmlId({ prefix: 'searchBoostProfileFlyoutPeriod' });

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="m"
      data-test-subj={`searchBoostProfileFlyoutPeriod-${period}`}
    >
      <EuiFormFieldset aria-labelledby={titleId}>
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xxs">
              <h4 id={titleId}>{BOOST_PERIOD_LABELS[period]}</h4>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{children}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormFieldset>
    </EuiPanel>
  );
};

export interface BoostFieldsProps {
  control: Control<ProfileFormValues>;
  type: BoostProfileType;
  limits: BoostLimits;
  isDisabled: boolean;
}

/** The boost fields of a profile type: one range for indices, one panel per period for data streams. */
export const BoostFields = ({ control, type, limits, isDisabled }: BoostFieldsProps) =>
  type === 'indices' ? (
    <BoostRangeFields control={control} name="indices" limits={limits} isDisabled={isDisabled} />
  ) : (
    <EuiFlexGroup direction="column" gutterSize="s">
      {PERIODS.map((period) => (
        <EuiFlexItem key={period}>
          <PeriodPanel period={period}>
            <BoostRangeFields
              control={control}
              name={period}
              limits={limits}
              isDisabled={isDisabled}
            />
          </PeriodPanel>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
