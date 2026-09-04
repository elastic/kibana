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
  ...restFields
}: GetInitialCaseValueArgs): CasePostRequest => {
  const { syncAlerts, extractObservables } = getCaseSettings(owner);

  return {
    title: '',
    assignees: [],
    tags: [],
    category: undefined,
    severity: CaseSeverity.LOW as const,
    description: '',
    settings: { syncAlerts, extractObservables },
    customFields: [],
    ...restFields,
    connector: connector ?? getNoneConnector(),
    owner,
  };
};
