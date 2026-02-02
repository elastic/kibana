/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { request } from '@kbn/actions-plugin/server/lib/axios_utils';
import type { ExecutorSubActionAddEventParams } from '@kbn/connector-schemas/servicenow_itom';
import type { ServiceFactory, ExternalServiceITOM } from '../lib/servicenow/types';

import { createExternalService as createExternalServiceCommon } from '../lib/servicenow/service';
import { addServiceMessageToError } from '../lib/servicenow/utils';

const getAddEventURL = (url: string) => `${url}/api/global/em/jsonv2`;

export const createExternalService: ServiceFactory<ExternalServiceITOM> = ({
  credentials,
  logger,
  configurationUtilities,
  serviceConfig,
  axiosInstance,
  connectorUsageCollector,
}): ExternalServiceITOM => {
  const snService = createExternalServiceCommon({
    credentials,
    logger,
    configurationUtilities,
    serviceConfig,
    axiosInstance,
    connectorUsageCollector,
  });

  const addEvent = async (params: ExecutorSubActionAddEventParams) => {
    try {
      const res = await request({
        axios: axiosInstance,
        url: getAddEventURL(snService.getUrl()),
        logger,
        method: 'post',
        data: { records: [params] },
        configurationUtilities,
        connectorUsageCollector,
      });

      snService.checkInstance(res);
    } catch (error) {
      throw addServiceMessageToError(error, `Unable to add event`);
    }
  };

  return {
    addEvent,
    getChoices: snService.getChoices,
  };
};
