/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasePostRequest } from '../types/api';
import { CaseSeverity } from '../types/domain';
import { getNoneConnector } from './connectors';
import { getCaseSettings } from './case_settings';

export type GetInitialCaseValueArgs = Partial<Omit<CasePostRequest, 'owner'>> &
  Pick<CasePostRequest, 'owner'>;

export const getInitialCaseValue = ({
  owner,
  connector,
  settings: settingsOverride,
  ...restFields
}: GetInitialCaseValueArgs): CasePostRequest => {
  const ownerSettings = getCaseSettings(owner);

  return {
    title: '',
    assignees: [],
    tags: [],
    category: undefined,
    severity: CaseSeverity.LOW as const,
    description: '',
    settings: {
      syncAlerts: ownerSettings.syncAlerts,
      extractObservables: ownerSettings.extractObservables,
      ...settingsOverride,
    },
    customFields: [],
    ...restFields,
    connector: connector ?? getNoneConnector(),
    owner,
  };
};
