/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { ProjectRoutingAccess, useCpsPickerAccess } from '@kbn/cps-utils';
import { useAppDependencies } from '../app_dependencies';

export const getTransformCpsPickerAccess = (_location: string): ProjectRoutingAccess => {
  // TODO: Enable read-only access on create/clone routes once the create form has a
  // project scope selector that can keep the CPS header, source searches, preview,
  // and create payload in sync.
  return ProjectRoutingAccess.DISABLED;
};

export const useTransformCpsPickerAccess = () => {
  const { application, cps } = useAppDependencies();

  const resolver = useCallback(getTransformCpsPickerAccess, []);

  useCpsPickerAccess({
    resolver,
    currentAppId$: application.currentAppId$,
    cpsManager: cps?.cpsManager,
  });
};
