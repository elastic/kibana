/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  AnonymizationProfile,
  FieldRule,
  RegexRule,
  NerRule,
} from '@kbn/anonymization-common';
import { isGlobalAnonymizationProfileTarget, NER_MODEL_ID } from '@kbn/anonymization-common';
import type { AnonymizationProfilesClient } from '../services/profiles/client';
import { useCreateProfile } from '../services/profiles/hooks/use_create_profile';
import { useUpdateProfile } from '../services/profiles/hooks/use_update_profile';
import { getConflictState } from '../services/profiles/hooks/get_conflict_state';
import { ensureProfilesApiError } from '../services/profiles/errors';
import type { ProfilesApiError } from '../services/profiles/errors';
import type { ProfilesQueryContext, TargetType } from '../types/profiles';
import { TARGET_TYPE_INDEX } from '../target_types';
import type {
  ProfileFormSubmitResult,
  ProfileFormValidationErrors,
  ProfileFormValues,
} from './profile_form_types';
import { validateProfileForm } from './validate_profile_form';

interface UseProfileFormParams {
  client: AnonymizationProfilesClient;
  context: ProfilesQueryContext;
  initialProfile?: AnonymizationProfile;
}

export interface ProfileFormController {
  values: ProfileFormValues;
  validationErrors: ProfileFormValidationErrors;
  submitError?: ProfilesApiError;
  isSubmitting: boolean;
  isEdit: boolean;
  reset: () => void;
  setName: (name: string) => void;
  setDescription: (description: string) => void;
  setTargetType: (targetType: TargetType) => void;
  setTargetId: (targetId: string) => void;
  setFieldRules: (fieldRules: FieldRule[]) => void;
  setRegexRules: (regexRules: RegexRule[]) => void;
  setNerRules: (nerRules: NerRule[]) => void;
  submit: () => Promise<ProfileFormSubmitResult | undefined>;
}

const normalizeNerRules = (nerRules: NerRule[]): NerRule[] =>
  nerRules.map((rule) => ({
    ...rule,
    modelId: rule.modelId ?? NER_MODEL_ID,
  }));

const toInitialValues = (profile?: AnonymizationProfile): ProfileFormValues => ({
  name: profile?.name ?? '',
  description: profile?.description ?? '',
  targetType: profile?.targetType ?? TARGET_TYPE_INDEX,
  targetId: profile?.targetId ?? '',
  fieldRules: profile
    ? isGlobalAnonymizationProfileTarget(profile.targetType, profile.targetId)
      ? []
      : profile.rules.fieldRules ?? []
    : [],
  regexRules: profile?.rules.regexRules ?? [],
  nerRules: normalizeNerRules(profile?.rules.nerRules ?? []),
});

export const useProfileForm = ({
  client,
  context,
  initialProfile,
}: UseProfileFormParams): ProfileFormController => {
  const initialValues = useMemo(() => toInitialValues(initialProfile), [initialProfile]);
  const [values, setValues] = useState<ProfileFormValues>(initialValues);
  const [validationErrors, setValidationErrors] = useState<ProfileFormValidationErrors>({});
  const createMutation = useCreateProfile({ client, context });
  const updateMutation = useUpdateProfile({ client, context });
  const {
    mutateAsync: createProfile,
    error: createError,
    isLoading: isCreateLoading,
  } = createMutation;
  const {
    mutateAsync: updateProfile,
    error: updateError,
    isLoading: isUpdateLoading,
  } = updateMutation;
  const isEdit = Boolean(initialProfile);
  const clearSubmitError = useCallback(() => {
    createMutation.reset();
    updateMutation.reset();
  }, [createMutation, updateMutation]);

  const submitError = useMemo(() => {
    const mutationError = isEdit ? updateError : createError;
    return mutationError
      ? ensureProfilesApiError(mutationError, 'Unable to save anonymization profile')
      : undefined;
  }, [isEdit, createError, updateError]);

  const isSubmitting = isEdit ? isUpdateLoading : isCreateLoading;

  useEffect(() => {
    setValues(initialValues);
    setValidationErrors({});
  }, [initialValues]);

  const submit = useCallback(async (): Promise<ProfileFormSubmitResult | undefined> => {
    const nextErrors = validateProfileForm(values);
    setValidationErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return undefined;
    }

    try {
      if (isEdit && initialProfile) {
        const isGlobalProfile = isGlobalAnonymizationProfileTarget(
          initialProfile.targetType,
          initialProfile.targetId
        );
        const profile = await updateProfile({
          id: initialProfile.id,
          name: values.name,
          description: values.description || undefined,
          rules: {
            fieldRules: isGlobalProfile ? [] : values.fieldRules,
            regexRules: values.regexRules,
            nerRules: normalizeNerRules(values.nerRules),
          },
        });
        return { profile };
      }

      const isGlobalProfile = isGlobalAnonymizationProfileTarget(
        values.targetType,
        values.targetId
      );

      const profile = await createProfile({
        name: values.name,
        description: values.description || undefined,
        targetType: values.targetType,
        targetId: values.targetId,
        rules: {
          fieldRules: isGlobalProfile ? [] : values.fieldRules,
          regexRules: values.regexRules,
          nerRules: normalizeNerRules(values.nerRules),
        },
      });
      return { profile };
    } catch (error) {
      const conflict = getConflictState(error);
      if (conflict.isConflict) {
        return {
          isConflict: true,
        };
      }

      const normalizedError = ensureProfilesApiError(error);
      if (normalizedError.kind === 'conflict') {
        return {
          isConflict: true,
        };
      }

      return undefined;
    }
  }, [values, isEdit, initialProfile, updateProfile, createProfile]);

  const setName = useCallback((name: string) => setValues((prev) => ({ ...prev, name })), []);

  const setDescription = useCallback(
    (description: string) => setValues((prev) => ({ ...prev, description })),
    []
  );

  const setTargetType = useCallback(
    (targetType: TargetType) =>
      setValues((prev) => {
        if (prev.targetType === targetType) {
          return prev;
        }

        clearSubmitError();
        return {
          ...prev,
          targetType,
          targetId: '',
          fieldRules: [],
          regexRules: [],
          nerRules: [],
        };
      }),
    [clearSubmitError]
  );

  const setTargetId = useCallback(
    (targetId: string) =>
      setValues((prev) => {
        if (prev.targetId === targetId) {
          return prev;
        }
        clearSubmitError();
        return { ...prev, targetId };
      }),
    [clearSubmitError]
  );

  const setFieldRules = useCallback(
    (fieldRules: FieldRule[]) => setValues((prev) => ({ ...prev, fieldRules })),
    []
  );

  const setRegexRules = useCallback(
    (regexRules: RegexRule[]) => setValues((prev) => ({ ...prev, regexRules })),
    []
  );

  const setNerRules = useCallback(
    (nerRules: NerRule[]) =>
      setValues((prev) => ({ ...prev, nerRules: normalizeNerRules(nerRules) })),
    []
  );
  const reset = useCallback(() => {
    clearSubmitError();
    setValues(initialValues);
    setValidationErrors({});
  }, [clearSubmitError, initialValues]);

  return useMemo(
    () => ({
      values,
      validationErrors,
      submitError,
      isSubmitting,
      isEdit,
      reset,
      setName,
      setDescription,
      setTargetType,
      setTargetId,
      setFieldRules,
      setRegexRules,
      setNerRules,
      submit,
    }),
    [
      values,
      validationErrors,
      submitError,
      isSubmitting,
      isEdit,
      reset,
      setName,
      setDescription,
      setTargetType,
      setTargetId,
      setFieldRules,
      setRegexRules,
      setNerRules,
      submit,
    ]
  );
};
