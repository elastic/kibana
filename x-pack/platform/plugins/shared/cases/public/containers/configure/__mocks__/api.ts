/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionConnector, ActionTypeConnector } from '../../../../common/types/domain';

import type { ApiProps, CasesConfigurationUI } from '../../types';
import { casesConfigurationsMock } from '../mock';
import { actionTypesMock, connectorsMock } from '../../../common/mock/connectors';
import type { ConfigurationPatchRequest, ConfigurationRequest } from '../../../../common/types/api';

export const getSupportedActionConnectors = async ({
  signal,
}: ApiProps): Promise<ActionConnector[]> => Promise.resolve(connectorsMock);

export const getCaseConfigure = async ({ signal }: ApiProps): Promise<CasesConfigurationUI> =>
  Promise.resolve(casesConfigurationsMock);

export const postCaseConfigure = async (
  caseConfiguration: ConfigurationRequest,
  signal: AbortSignal
): Promise<CasesConfigurationUI> => Promise.resolve(casesConfigurationsMock);

export const patchCaseConfigure = async (
  caseConfiguration: ConfigurationPatchRequest,
  signal: AbortSignal
): Promise<CasesConfigurationUI> => Promise.resolve(casesConfigurationsMock);

export const fetchActionTypes = async ({ signal }: ApiProps): Promise<ActionTypeConnector[]> =>
  Promise.resolve(actionTypesMock);
