/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useForm,
  useFormContext,
  useFormData,
  Form,
  type FormConfig,
  type FormHook,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { createFormSchema, REQUIRED_FIELDS } from './integration_form_validation';
import type { IntegrationFormData } from './types';
import { useKibana, getInstalledPackages } from '../../../common';
import * as i18n from './translations';
import { DEFAULT_DATA_STREAM_VALUES, DEFAULT_INTEGRATION_VALUES } from './constants';

export interface IntegrationFormProviderProps {
  children?: React.ReactNode;
  initialValue?: Partial<IntegrationFormData>;
  onSubmit: (data: IntegrationFormData) => Promise<void>;
}

export const IntegrationFormProvider: React.FC<IntegrationFormProviderProps> = ({
  children,
  initialValue,
  onSubmit,
}) => {
  const { http, notifications } = useKibana().services;
  const [packageNames, setPackageNames] = useState<Set<string>>();

  // Load installed package names for duplicate title validation
  useEffect(() => {
    const abortController = new AbortController();
    const deps = { http, abortSignal: abortController.signal };
    (async () => {
      try {
        const packagesResponse = await getInstalledPackages(deps);
        if (abortController.signal.aborted) return;
        if (packagesResponse?.items?.length) {
          setPackageNames(new Set(packagesResponse.items.map((pkg) => pkg.id)));
        }
      } catch (e) {
        if (!abortController.signal.aborted) {
          notifications?.toasts.addError(e, {
            title: i18n.PACKAGE_NAMES_FETCH_ERROR,
          });
        }
      }
    })();
    return () => {
      abortController.abort();
    };
  }, [http, notifications]);

  // For existing integrations, pass the current title to exclude from uniqueness check and
  // avoid validation errors.
  const currentIntegrationTitle = !initialValue?.integrationId ? undefined : initialValue?.title;
  const schema = useMemo(
    () => createFormSchema(packageNames, currentIntegrationTitle),
    [packageNames, currentIntegrationTitle]
  );

  const defaultValue = useMemo((): IntegrationFormData => {
    return {
      integrationId: initialValue?.integrationId,
      ...DEFAULT_INTEGRATION_VALUES,
      ...DEFAULT_DATA_STREAM_VALUES,
      ...initialValue,
    };
  }, [initialValue]);

  const handleSubmit: FormConfig<IntegrationFormData>['onSubmit'] = useCallback(
    async (formData: IntegrationFormData, isValid: boolean) => {
      if (!isValid) {
        return;
      }
      await onSubmit(formData);
    },
    [onSubmit]
  );

  const { form } = useForm<IntegrationFormData>({
    defaultValue,
    schema,
    onSubmit: handleSubmit,
    options: {
      stripEmptyFields: false,
      valueChangeDebounceTime: 300,
    },
  });

  return (
    <Form
      form={form}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) {
          e.preventDefault();
        }
      }}
    >
      {children}
    </Form>
  );
};

export const useIntegrationForm = () => {
  const form = useFormContext<IntegrationFormData>();
  const [formData] = useFormData<IntegrationFormData>();

  // Check if all required fields for the current context are filled
  const isValid = useMemo(() => {
    if (!formData) return false;

    const baseFieldsValid = REQUIRED_FIELDS.every((field) => {
      const value = formData[field as keyof IntegrationFormData];
      if (typeof value === 'string') {
        return value.trim().length > 0;
      }
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return value != null;
    });

    // Additional conditional validation for log source having a sample or an index selected
    const logsSourceOption = formData.logsSourceOption;
    const logSourceValid =
      (logsSourceOption === 'upload' && !!formData.logSample) ||
      (logsSourceOption === 'index' && formData.selectedIndex && formData.selectedIndex.trim());

    return baseFieldsValid && logSourceValid;
  }, [formData]);

  return {
    form: form as FormHook<IntegrationFormData>,
    formData,
    isValid,
    submit: () => form.submit(),
    reset: () => form.reset(),
    validate: () => form.validate(),
  };
};
