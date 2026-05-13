/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, pickBy } from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { EuiCheckboxGroupOption } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiCheckboxGroup } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { useController } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import type { FormFieldProps } from '../../form/types';
import { PlatformIcon } from './platforms/platform_icon';

type Props = Omit<FormFieldProps<string[]>, 'name' | 'label'>;

export const PlatformCheckBoxGroupField = (props: Props) => {
  const { euiFieldProps = {}, idAria, helpText, ...rest } = props;
  const { isDisabled, ...restEuiFieldProps } = euiFieldProps;
  const {
    field: { onChange, value },
    fieldState: { error },
  } = useController({
    name: 'platform',
    defaultValue: [],
  });
  const options = useMemo(
    () => [
      {
        id: 'linux',
        label: (
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem>
              <PlatformIcon platform="linux" />
            </EuiFlexItem>
            <EuiFlexItem>
              <FormattedMessage
                id="xpack.osquery.pack.queryFlyoutForm.platformMacOSLabel"
                defaultMessage="Linux"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      },
      {
        id: 'darwin',
        label: (
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem>
              <PlatformIcon platform="darwin" />
            </EuiFlexItem>
            <EuiFlexItem>
              <FormattedMessage
                id="xpack.osquery.pack.queryFlyoutForm.platformLinusLabel"
                defaultMessage="macOS"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      },
      {
        id: 'windows',
        label: (
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem>
              <PlatformIcon platform="windows" />
            </EuiFlexItem>
            <EuiFlexItem>
              <FormattedMessage
                id="xpack.osquery.pack.queryFlyoutForm.platformWindowsLabel"
                defaultMessage="Windows"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      },
    ],
    []
  );

  const [checkboxIdToSelectedMap, setCheckboxIdToSelectedMap] = useState<Record<string, boolean>>(
    () =>
      (options as EuiCheckboxGroupOption[]).reduce((acc, option) => {
        acc[option.id] = isEmpty(value) ? true : value?.includes(option.id) ?? false;

        return acc;
      }, {} as Record<string, boolean>)
  );

  const handleChange = useCallback(
    (optionId: string) => {
      const newCheckboxIdToSelectedMap = {
        ...checkboxIdToSelectedMap,
        [optionId]: !checkboxIdToSelectedMap[optionId],
      };
      setCheckboxIdToSelectedMap(newCheckboxIdToSelectedMap);

      onChange(
        Object.keys(
          pickBy(newCheckboxIdToSelectedMap, (checkboxValue) => checkboxValue === true)
        ).join(',')
      );
    },
    [checkboxIdToSelectedMap, onChange]
  );

  const describedByIds = useMemo(() => (idAria ? [idAria] : []), [idAria]);

  useEffect(() => {
    setCheckboxIdToSelectedMap(() =>
      (options as EuiCheckboxGroupOption[]).reduce((acc, option) => {
        acc[option.id] = isEmpty(value) ? true : value?.includes(option.id) ?? false;

        return acc;
      }, {} as Record<string, boolean>)
    );
  }, [value, options]);

  const hasError = useMemo(() => !!error?.message, [error?.message]);

  return (
    <EuiFormRow
      label={i18n.translate('xpack.osquery.pack.queryFlyoutForm.platformFieldLabel', {
        defaultMessage: 'Platform',
      })}
      helpText={typeof helpText === 'function' ? helpText() : helpText}
      error={error?.message}
      isInvalid={hasError}
      fullWidth
      describedByIds={describedByIds}
      {...rest}
    >
      <EuiCheckboxGroup
        idToSelectedMap={checkboxIdToSelectedMap}
        options={options}
        onChange={handleChange}
        data-test-subj="osquery-platform-checkbox-group"
        disabled={!!isDisabled}
        {...restEuiFieldProps}
      />
    </EuiFormRow>
  );
};
