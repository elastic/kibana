/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useMlKibana } from '../contexts/kibana';
import { getEmptyFunctionComponent } from '../components/empty_component/get_empty_function_component';

export const useCanManageSpacesAndSavedObjects = () => {
  const {
    services: { spaces, application },
  } = useMlKibana();

  const canManageSpacesAndSavedObjects = useMemo(
    () =>
      spaces !== undefined &&
      spaces.ui.components.getSpacesContextProvider &&
      application.capabilities &&
      application.capabilities.spaces?.manage === true &&
      application.capabilities.savedObjectsManagement?.shareIntoSpace === true,
    [spaces, application]
  );

  return canManageSpacesAndSavedObjects;
};

export const useSpacesContextProvider = () => {
  const canManageSpacesAndSavedObjects = useCanManageSpacesAndSavedObjects();

  return useMemo(
    () =>
      canManageSpacesAndSavedObjects
        ? spaces.ui.components.getSpacesContextProvider
        : getEmptyFunctionComponent,
    [canManageSpacesAndSavedObjects]
  );
};
