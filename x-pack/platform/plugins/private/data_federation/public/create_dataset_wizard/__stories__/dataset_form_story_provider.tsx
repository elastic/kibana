/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useEffect } from 'react';
import { action } from '@storybook/addon-actions';
import type { Control } from 'react-hook-form';
import { FormProvider, useForm } from 'react-hook-form';

import type {
  CreateDatasetFormValues,
  CreateDatasetSettingsFormValues,
} from '../create_dataset_form_state';
import { emptyDatasetFormValues } from '../dataset_form_initial_values';

interface DatasetFormStoryProviderProps {
  settings: Partial<CreateDatasetSettingsFormValues>;
  children: (control: Control<CreateDatasetFormValues>) => ReactNode;
}

const logSettingsChange = action('settings');

const toFormValues = (
  settings: Partial<CreateDatasetSettingsFormValues>
): CreateDatasetFormValues => {
  const emptyValues = emptyDatasetFormValues();
  return { ...emptyValues, settings: { ...emptyValues.settings, ...settings } };
};

const DatasetFormStoryForm = ({ settings, children }: DatasetFormStoryProviderProps) => {
  const methods = useForm<CreateDatasetFormValues>({ defaultValues: toFormValues(settings) });
  const { watch } = methods;

  useEffect(() => {
    const subscription = watch((values) => logSettingsChange(values.settings));
    return () => subscription.unsubscribe();
  }, [watch]);

  return <FormProvider {...methods}>{children(methods.control)}</FormProvider>;
};

/**
 * Hosts a dataset wizard field in a real form seeded with `settings`. The form remounts whenever
 * `settings` changes so edits made through Storybook controls take effect.
 */
export const DatasetFormStoryProvider = ({ settings, children }: DatasetFormStoryProviderProps) => (
  <DatasetFormStoryForm key={JSON.stringify(settings)} settings={settings}>
    {children}
  </DatasetFormStoryForm>
);
