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
import { IntegrationFormSchema, createIntegrationFormSchema } from './integration_form_validation';
import type { IntegrationFormData } from './types';
import { useKibana } from '../../../common/hooks/use_kibana';
import { getInstalledPackages } from '../../../../common/lib/api';
import * as i18n from './translations';

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

  // Load installed package names for duplicate validation
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

  const schema = useMemo(() => createIntegrationFormSchema(packageNames), [packageNames]);

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
    defaultValue: {
      title: '',
      description: '',
      logo: undefined,
      connectorId: '',
      ...initialValue,
    },
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

// Derive required fields from schema (fields with isRequired marker from helper function)
// Check if all required fields are filled instead of a static array without need for manual updates.
const getRequiredFields = (): Array<keyof IntegrationFormData> => {
  return (Object.keys(IntegrationFormSchema) as Array<keyof IntegrationFormData>).filter((key) => {
    const fieldConfig = IntegrationFormSchema[key];
    if (!fieldConfig || typeof fieldConfig !== 'object' || !('validations' in fieldConfig)) {
      return false;
    }
    const validations = fieldConfig.validations as Array<{ isRequired?: boolean }> | undefined;
    return validations?.some((v) => v.isRequired === true) ?? false;
  });
};

const REQUIRED_FIELDS = getRequiredFields();

export const useIntegrationForm = () => {
  const form = useFormContext<IntegrationFormData>();
  const [formData] = useFormData<IntegrationFormData>();

  // Is valid when all required fields (derived from schema) are filled
  const isValid = useMemo(() => {
    return REQUIRED_FIELDS.every((field) => {
      const value = formData[field];
      if (typeof value === 'string') {
        return value.trim().length > 0;
      }
      return value != null;
    });
  }, [formData]);

  return {
    form: form as FormHook<IntegrationFormData>,
    formData,
    submit: () => form.submit(),
    reset: () => form.reset(),
    validate: () => form.validate(),
    isValid,
  };
};
