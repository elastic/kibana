/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';
import { coreMock } from '@kbn/core/public/mocks';
import { getSharedComponents } from '@kbn/reporting-public/share';
import { ReportingAPIClient } from '@kbn/reporting-public/reporting_api_client';
import { ReportingSetup } from '.';

type Setup = jest.Mocked<ReportingSetup>;

const createSetupContract = (): Setup => {
  const coreSetup = coreMock.createSetup();
  const apiClient = new ReportingAPIClient(coreSetup.http, coreSetup.uiSettings, '7.15.0');
  return {
    components: getSharedComponents(apiClient, Rx.from(coreSetup.getStartServices())),
  };
};

export const reportingPluginMock = {
  createSetupContract,
  createStartContract: createSetupContract,
};
