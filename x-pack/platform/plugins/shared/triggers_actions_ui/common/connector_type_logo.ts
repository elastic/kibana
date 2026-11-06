/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CONNECTOR_TYPE_LOGO_PATH = '/internal/triggers_actions_ui/connector_types/_logo';

export interface FetchConnectorTypeLogoRequest {
  url: string;
}

export interface FetchConnectorTypeLogoResponse {
  /** The fetched image as a base64 `data:` URI, ready to send as a connector type's `icon`. */
  icon: string;
}
