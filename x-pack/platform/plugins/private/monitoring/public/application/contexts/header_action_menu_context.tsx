/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';
import { AppMountParameters, ThemeServiceStart, UserProfileService } from '@kbn/core/public';

interface ContextProps {
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  theme: ThemeServiceStart;
  userProfile: UserProfileService;
}

export const HeaderActionMenuContext = React.createContext<ContextProps | null>(null);

export const useHeaderActionMenu = () => {
  // TODO: throw error if context is null?
  return useContext(HeaderActionMenuContext);
};
