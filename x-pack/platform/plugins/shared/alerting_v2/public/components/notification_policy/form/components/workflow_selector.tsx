/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { useDebouncedValue } from '@kbn/react-hooks';
import { useFetchWorkflows } from '../../../../hooks/use_fetch_workflows';
import type { NotificationPolicyFormState } from '../types';

interface SelectedWorkflow {
  id: string;
  name: string;
}

export const WorkflowSelector = () => {
  const { control } = useFormContext<NotificationPolicyFormState>();
  const destinations = useWatch({ control, name: 'destinations' });

  const [selectedWorkflows, setSelectedWorkflows] = useState<SelectedWorkflow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebouncedValue(searchQuery, 300);

  const { data: workflowsData, isLoading } = useFetchWorkflows({ query: debouncedQuery });

  useEffect(() => {
    if (selectedWorkflows.length > 0 || destinations.length === 0 || !workflowsData) {
      return;
    }

    const workflowsById = new Map(workflowsData.results.map((w) => [w.id, w.name]));
    setSelectedWorkflows(
      destinations.map((d) => ({ id: d.id, name: workflowsById.get(d.id) ?? d.id }))
    );
  }, [destinations, workflowsData, selectedWorkflows.length]);

  const workflowOptions = (workflowsData?.results ?? []).map((w) => ({
    label: w.name,
    value: w.id,
  }));

  return (
    <Controller
      name="destinations"
      control={control}
      rules={{
        validate: (value) =>
          value.length > 0
            ? true
            : i18n.translate('xpack.alertingV2.notificationPolicy.form.destination.required', {
                defaultMessage: 'At least one destination is required',
              }),
      }}
      render={({ field, fieldState: { error } }) => (
        <EuiFormRow
          label={i18n.translate('xpack.alertingV2.notificationPolicy.form.destination', {
            defaultMessage: 'Destinations',
          })}
          isInvalid={!!error}
          error={error?.message}
        >
          <EuiComboBox
            fullWidth
            async
            isLoading={isLoading}
            isInvalid={!!error}
            data-test-subj="destinationsInput"
            placeholder={i18n.translate(
              'xpack.alertingV2.notificationPolicy.form.destination.placeholder',
              { defaultMessage: 'Search and select workflows' }
            )}
            selectedOptions={selectedWorkflows.map((w) => ({ label: w.name, value: w.id }))}
            onSearchChange={setSearchQuery}
            onChange={(options) => {
              setSelectedWorkflows(options.map((o) => ({ id: o.value as string, name: o.label })));
              field.onChange(
                options.map((o) => ({ type: 'workflow' as const, id: o.value as string }))
              );
            }}
            options={workflowOptions}
          />
        </EuiFormRow>
      )}
    />
  );
};
