/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PLATFORM_INDEX_MGMT_V2 } from '../../../common/constants';
import { useAppContext } from '../app_context';

export const useIsPlatformIndexManagementV2Enabled = (): boolean => {
  const { settings } = useAppContext();
  return settings.client.get<boolean>(PLATFORM_INDEX_MGMT_V2, false);
};
