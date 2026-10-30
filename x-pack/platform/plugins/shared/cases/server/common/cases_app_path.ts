/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASES_APP_PATH, GENERAL_CASES_OWNER, OWNER_INFO } from '../../common/constants';
import { isValidOwner } from '../../common/utils/owner';

let topLevelAppEnabled = false;

/**
 * Set once at plugin setup from `xpack.cases.topLevelApp.enabled`. Links built on the server
 * (push, notifications, Agent Builder) are generated far from the plugin config, so they read it here.
 */
export const setTopLevelAppEnabled = (enabled: boolean): void => {
  topLevelAppEnabled = enabled;
};

/** The path cases live under: `/app/cases`, or the owner's solution app when the top-level app is off. */
export const getCasesAppBasePath = (owner: string): string => {
  if (topLevelAppEnabled) {
    return CASES_APP_PATH;
  }

  const ownerInfo = isValidOwner(owner) ? OWNER_INFO[owner] : OWNER_INFO[GENERAL_CASES_OWNER];
  return `${ownerInfo.appBasePath}${ownerInfo.casesBasePath}`;
};
