/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASES_APP_ID, OWNER_INFO } from '../../common/constants';
import { isValidOwner } from '../../common/utils/owner';
import { KibanaServices } from './lib/kibana';

/** Whether Cases runs as the single top-level app at `/app/cases` with the `casesV4` feature. */
export const isTopLevelAppEnabled = (): boolean =>
  KibanaServices.getConfig()?.topLevelApp?.enabled === true;

/**
 * The app (and deep link) that shows a case: the top-level Cases app when it is on, otherwise the
 * app of the case's owner, falling back to `fallbackAppId` for unknown owners.
 */
export const getCaseAppTarget = (
  owner: string,
  fallbackAppId?: string
): { appId: string | undefined; deepLinkId: string | undefined } => {
  if (isTopLevelAppEnabled()) {
    return { appId: CASES_APP_ID, deepLinkId: undefined };
  }

  return {
    appId: isValidOwner(owner) ? OWNER_INFO[owner].appId : fallbackAppId,
    deepLinkId: 'cases',
  };
};
