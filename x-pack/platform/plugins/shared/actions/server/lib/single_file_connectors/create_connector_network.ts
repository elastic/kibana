/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorNetwork } from '@kbn/connector-specs';
import type { ActionsConfigurationUtilities } from '../../actions_config';

export const createConnectorNetwork = (
  configUtils: ActionsConfigurationUtilities
): ConnectorNetwork => ({
  ensureUriAllowed: (url) => configUtils.ensureUriAllowed(url),
  ensureHostnameAllowed: (host) => configUtils.ensureHostnameAllowed(host),
});
