/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash';
import { PromiseReturnType } from '../../../../typings/common';
import { Setup } from '../../helpers/setup_request';
import { getAgentStatus } from './get_agent_status';
import { getLegacyDataStatus } from './get_legacy_data_status';
import { getServicesItems } from './get_services_items';

export type ServiceListAPIResponse = PromiseReturnType<typeof getServices>;
export async function getServices(setup: Setup) {
  const items = await getServicesItems(setup);
  const hasLegacyData = await getLegacyDataStatus(setup);

  // conditionally check for historical data if no services were found in the current time range
  const noDataInCurrentTimeRange = isEmpty(items);
  let hasHistorialAgentData = true;
  if (noDataInCurrentTimeRange) {
    hasHistorialAgentData = await getAgentStatus(setup);
  }

  return {
    items,
    hasHistoricalData: hasHistorialAgentData,
    hasLegacyData
  };
}
