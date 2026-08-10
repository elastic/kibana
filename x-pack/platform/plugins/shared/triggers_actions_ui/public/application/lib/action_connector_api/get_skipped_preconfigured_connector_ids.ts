/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpSetup } from '@kbn/core/public';

export interface SkippedPreconfiguredConnectorIdsResponse {
  skippedPreconfiguredConnectorIds: string[];
}

export const getSkippedPreconfiguredConnectorIds = async ({
  http,
}: {
  http: HttpSetup;
}): Promise<SkippedPreconfiguredConnectorIdsResponse> => {
  const { skippedPreconfiguredConnectorIds } = await http.get<{
    isAlertsAvailable: boolean;
    skippedPreconfiguredConnectorIds: string[];
  }>('/internal/triggers_actions_ui/_health');
  return { skippedPreconfiguredConnectorIds };
};
