/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MANAGEMENT_APP_LOCATOR } from '@kbn/deeplinks-management/constants';
import { useKibana } from './use_kibana';

export const useModelSettingsUrl = (): string | undefined => {
  const {
    dependencies: {
      start: { share },
    },
  } = useKibana();

  return share.url.locators.useUrl(() => ({
    id: MANAGEMENT_APP_LOCATOR,
    params: {
      sectionId: 'modelManagement',
      appId: 'model_settings',
    },
  }));
};
