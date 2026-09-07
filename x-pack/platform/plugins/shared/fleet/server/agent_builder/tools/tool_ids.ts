/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';

export const PLATFORM_FLEET_GET_INTEGRATION_DETAILS_TOOL_ID =
  `${internalNamespaces.platformFleet}.get_integration_details` as const;
