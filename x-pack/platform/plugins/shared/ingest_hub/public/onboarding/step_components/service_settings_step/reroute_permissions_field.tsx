/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiComboBox, EuiFormRow, EuiIconTip, type EuiComboBoxOptionOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useGetEpmDatastreams } from '@kbn/fleet-plugin/public';

export interface ReroutePermissionsFieldProps {
  value: string[];
  onChange: (permissions: string[]) => void;
  /** Validation error, from `getReroutePermissionsError`. */
  error?: string;
}

/**
 * The extra data streams the integration may write to, for the reroute processor, as Fleet's Add
 * integration offers it (`additional_datastreams_permissions`). It suggests the data streams of the
 * cluster and takes any other name that follows the same rule. Optional: empty adds none.
 */
export function ReroutePermissionsField({ value, onChange, error }: ReroutePermissionsFieldProps) {
  const { data } = useGetEpmDatastreams();

  const options = useMemo<Array<EuiComboBoxOptionOption<string>>>(
    () => data?.items?.map((item) => ({ label: item.name, value: item.name })) ?? [],
    [data]
  );
  const selectedOptions = useMemo<Array<EuiComboBoxOptionOption<string>>>(
    () => value.map((item) => ({ label: item, value: item })),
    [value]
  );

  return (
    <EuiFormRow
      fullWidth
      label={
        <>
          {i18n.translate('xpack.ingestHub.integrationSettings.reroutePermissions.label', {
            defaultMessage: 'Add a reroute processor permission',
          })}{' '}
          <EuiIconTip
            position="right"
            content={i18n.translate(
              'xpack.ingestHub.integrationSettings.reroutePermissions.tooltip',
              {
                defaultMessage:
                  'Use the reroute processor to redirect data flows to another target index or data stream.',
              }
            )}
          />
        </>
      }
      isInvalid={!!error}
      error={error}
    >
      <EuiComboBox
        fullWidth
        compressed
        isInvalid={!!error}
        selectedOptions={selectedOptions}
        options={options}
        onChange={(selected) => onChange(selected.map((option) => option.label))}
        onCreateOption={(option) => {
          const name = option.trim();
          if (name && !value.includes(name)) onChange([...value, name]);
        }}
        placeholder={i18n.translate(
          'xpack.ingestHub.integrationSettings.reroutePermissions.placeholder',
          { defaultMessage: 'Add a permission' }
        )}
        data-test-subj="sharedSettingsReroutePermissions"
      />
    </EuiFormRow>
  );
}
