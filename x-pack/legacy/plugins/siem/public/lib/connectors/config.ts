/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Connector } from './types';
import serviceNowLogo from './logos/servicenow.svg';

const connectors = new Map<string, Connector>();

connectors.set('.servicenow', {
  actionTypeId: '.servicenow',
  logo: serviceNowLogo,
});

export { connectors };
