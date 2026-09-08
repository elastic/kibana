/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import type { UseTargetIdFieldResult } from './hooks/use_target_id_field';
import type { ProfileFormProps } from './profile_form_props';

export interface ProfileFormContextValue extends ProfileFormProps {
  targetIdField: UseTargetIdFieldResult;
  includeHiddenAndSystemIndices: boolean;
  onIncludeHiddenAndSystemIndicesChange: (value: boolean) => void;
  submitAttemptCount: number;
}

const ProfileFormContext = createContext<ProfileFormContextValue | undefined>(undefined);

export const ProfileFormContextProvider = ({
  value,
  children,
}: {
  value: ProfileFormContextValue;
  children: React.ReactNode;
}) => <ProfileFormContext.Provider value={value}>{children}</ProfileFormContext.Provider>;

export const useProfileFormContext = (): ProfileFormContextValue => {
  const context = useContext(ProfileFormContext);
  if (context === undefined) {
    throw new Error('useProfileFormContext must be used within ProfileFormContextProvider');
  }
  return context;
};
