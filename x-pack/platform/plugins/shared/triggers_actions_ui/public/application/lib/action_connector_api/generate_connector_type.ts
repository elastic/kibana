/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import type { GenerateConnectorTypeResponse } from '../../../../common/connector_type_generation';
import { GENERATE_CONNECTOR_TYPE_PATH } from '../../../../common/connector_type_generation';

export async function generateConnectorType({
  http,
  url,
}: {
  http: HttpSetup;
  url: string;
}): Promise<GenerateConnectorTypeResponse> {
  return http.post<GenerateConnectorTypeResponse>(GENERATE_CONNECTOR_TYPE_PATH, {
    body: JSON.stringify({ url }),
  });
}
