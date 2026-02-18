/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import type { UseTargetIdFieldResult } from './hooks/use_target_id_field';
import type { ProfileFormProps } from './profile_form_props';

export interface ProfileFlyoutContextValue extends ProfileFormProps {
  targetIdField: UseTargetIdFieldResult;
}

const ProfileFlyoutContext = createContext<ProfileFlyoutContextValue | undefined>(undefined);

export const ProfileFlyoutContextProvider = ({
  value,
  children,
}: {
  value: ProfileFlyoutContextValue;
  children: React.ReactNode;
}) => <ProfileFlyoutContext.Provider value={value}>{children}</ProfileFlyoutContext.Provider>;

export const useProfileFlyoutContext = (): ProfileFlyoutContextValue => {
  const context = useContext(ProfileFlyoutContext);
  if (context === undefined) {
    throw new Error('useProfileFlyoutContext must be used within ProfileFlyoutContextProvider');
  }
  return context;
};
