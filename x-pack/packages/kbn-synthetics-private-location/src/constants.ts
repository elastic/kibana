/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';

export const DEFAULTS = {
  LOCATION_NAME: `Default location ${uuidv4()}`,
  AGENT_POLICY_NAME: `Synthetics agent policy ${uuidv4()}`,
  ELASTICSEARCH_HOST: 'http://localhost:9200',
  KIBANA_URL: 'http://localhost:5601',
  KIBANA_USERNAME: 'elastic',
  KIBANA_PASSWORD: 'changeme',
};
