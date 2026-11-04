/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import type { FetchConnectorTypeLogoResponse } from '../../../../common/connector_type_logo';
import { CONNECTOR_TYPE_LOGO_PATH } from '../../../../common/connector_type_logo';

/** Asks the server to read an image URL and return it as a `data:` URI for the connector type. */
export async function fetchConnectorTypeLogo({
  http,
  url,
}: {
  http: HttpSetup;
  url: string;
}): Promise<FetchConnectorTypeLogoResponse> {
  return http.post<FetchConnectorTypeLogoResponse>(CONNECTOR_TYPE_LOGO_PATH, {
    body: JSON.stringify({ url }),
  });
}
