/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { ProfileFormContextProvider } from './profile_form_context';
import { useTargetIdField } from './hooks/use_target_id_field';
import type { ProfileFormProps } from './profile_form_props';

interface ProfileFormProviderProps extends ProfileFormProps {
  children: React.ReactNode;
}

export const ProfileFormProvider = ({ children, ...props }: ProfileFormProviderProps) => {
  const {
    fetch,
    onFieldRulesChange,
    onTargetIdChange,
    targetId,
    targetType,
    unavailableTargetIds,
  } = props;
  const [includeHiddenAndSystemIndices, setIncludeHiddenAndSystemIndices] = useState(false);
  const [submitAttemptCount, setSubmitAttemptCount] = useState(0);

  const targetIdField = useTargetIdField({
    targetType,
    targetId,
    includeHiddenAndSystemIndices,
    fetch,
    onFieldRulesChange,
    onTargetIdChange,
    unavailableTargetIds,
  });

  const onSubmitWithTargetValidation = async () => {
    setSubmitAttemptCount((count) => count + 1);
    const isTargetValid = await targetIdField.validateAndHydrateTargetId();
    if (!isTargetValid) {
      return;
    }
    await props.onSubmit();
  };

  return (
    <ProfileFormContextProvider
      value={{
        ...props,
        onSubmit: onSubmitWithTargetValidation,
        targetIdField,
        includeHiddenAndSystemIndices,
        onIncludeHiddenAndSystemIndicesChange: setIncludeHiddenAndSystemIndices,
        submitAttemptCount,
      }}
    >
      {children}
    </ProfileFormContextProvider>
  );
};
