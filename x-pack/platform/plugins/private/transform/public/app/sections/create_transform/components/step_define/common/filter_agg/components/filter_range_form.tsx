/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, type ComponentProps } from 'react';
import {
  EuiFieldNumber,
  EuiFormRow,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiButtonIcon,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FilterAggConfigRange } from '../types';

// The config prop of the component, to be used for the `updateConfig` function.
type FilterRangeFormConfig = ComponentProps<
  Exclude<FilterAggConfigRange['aggTypeConfig']['FilterAggFormComponent'], undefined>
>['config'];

/**
 * Form component for the range filter aggregation for number type fields.
 */
export const FilterRangeForm: FilterAggConfigRange['aggTypeConfig']['FilterAggFormComponent'] = ({
  config,
  onChange,
}) => {
  const from = config?.from ?? '';
  const to = config?.to ?? '';
  const includeFrom = config?.includeFrom ?? false;
  const includeTo = config?.includeTo ?? false;

  const updateConfig = useCallback(
    (update: FilterRangeFormConfig) => {
      onChange({
        config: {
          ...config,
          ...update,
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config]
  );

  return (
    <>
      <EuiSpacer size="m" />
      <EuiFlexGroup direction="row">
        <EuiFlexItem>
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.transform.agg.popoverForm.filerAgg.range.greaterThanLabel"
                defaultMessage="Greater than"
              />
            }
          >
            <EuiFieldNumber
              value={from}
              max={to !== '' ? to : undefined}
              onChange={(e) => {
                updateConfig({ from: e.target.value === '' ? undefined : Number(e.target.value) });
              }}
              step="any"
              prepend={
                <EuiButtonIcon
                  iconType={includeFrom ? 'arrowEnd' : 'arrowRight'}
                  onClick={(e: any) => {
                    updateConfig({ includeFrom: e.target.checked });
                  }}
                  display={includeFrom ? 'fill' : 'base'}
                  aria-pressed={includeFrom}
                  aria-label={includeFrom ? '≥' : '>'}
                />
              }
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.transform.agg.popoverForm.filerAgg.range.lessThanLabel"
                defaultMessage="Less than"
              />
            }
          >
            <EuiFieldNumber
              value={to}
              min={from !== '' ? from : undefined}
              onChange={(e) => {
                updateConfig({ to: e.target.value === '' ? undefined : Number(e.target.value) });
              }}
              step="any"
              append={
                <EuiButtonIcon
                  iconType={includeTo ? 'arrowStart' : 'arrowLeft'}
                  onClick={() => {
                    updateConfig({ includeTo: !includeTo });
                  }}
                  display={includeTo ? 'fill' : 'base'}
                  aria-pressed={includeTo}
                  aria-label={includeTo ? '≤' : '<'}
                />
              }
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
