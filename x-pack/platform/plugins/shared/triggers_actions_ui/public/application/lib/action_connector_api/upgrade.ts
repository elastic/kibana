/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import type { UpgradeConnectorResponse } from '@kbn/actions-plugin/common';
import { transformConnectorResponse } from '@kbn/alerts-ui-shared/src/common/apis/fetch_connector';
import type { ActionConnector } from '../../../types';
import { INTERNAL_BASE_ACTION_API_PATH } from '../../constants';

export interface UpgradeConnectorResult {
  status: UpgradeConnectorResponse['status'];
  fromVersion: string;
  toVersion: string;
  connector: ActionConnector;
}

export const upgradeActionConnector = async ({
  http,
  id,
}: {
  http: HttpSetup;
  id: string;
}): Promise<UpgradeConnectorResult> => {
  const result = await http.post<UpgradeConnectorResponse>(
    `${INTERNAL_BASE_ACTION_API_PATH}/connector/${encodeURIComponent(id)}/_upgrade`
  );

  return {
    status: result.status,
    fromVersion: result.from_version,
    toVersion: result.to_version,
    connector: transformConnectorResponse(result.connector) as ActionConnector,
  };
};
