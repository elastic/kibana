/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const TEST_PIPELINE_NAME = 'test_pipeline';
export const TREE_PIPELINE_NAME = 'tree_pipeline';
export const MANAGED_PIPELINE_NAME = 'managed_test_pipeline';

export const PIPELINE = {
  name: TEST_PIPELINE_NAME,
  description: 'My pipeline description.',
  version: 1,
};

export const TREE_PIPELINE = {
  name: TREE_PIPELINE_NAME,
  description: 'Pipeline that has Pipeline processors.',
  version: 1,
  processors: [
    {
      pipeline: {
        name: TEST_PIPELINE_NAME,
      },
    },
  ],
};

export const PIPELINE_CSV = {
  name: TEST_PIPELINE_NAME,
};

export const MAXMIND_DATABASE_NAME = 'GeoIP2-Anonymous-IP';
export const MAXMIND_DATABASE_ID = 'geoip2-anonymous-ip';
export const IPINFO_DATABASE_NAME = 'Free IP to ASN';
export const IPINFO_DATABASE_ID = 'asn';

export const INGEST_PIPELINES_USER_ROLE = {
  elasticsearch: {
    cluster: ['manage_pipeline', 'monitor'],
  },
  kibana: [
    {
      base: [],
      feature: {
        advancedSettings: ['read'],
      },
      spaces: ['*'],
    },
  ],
};

export const MANAGE_PROCESSORS_USER_ROLE = {
  elasticsearch: {
    cluster: ['manage'],
  },
  kibana: [
    {
      base: [],
      feature: {
        advancedSettings: ['read'],
      },
      spaces: ['*'],
    },
  ],
};

export const GLOBAL_DASHBOARD_READ_WITH_INGEST_PIPELINES_ROLE = {
  elasticsearch: INGEST_PIPELINES_USER_ROLE.elasticsearch,
  kibana: [
    {
      base: [],
      feature: {
        advancedSettings: ['read'],
        dashboard: ['read'],
      },
      spaces: ['*'],
    },
  ],
};

export const GLOBAL_DEVTOOLS_READ_WITH_INGEST_PIPELINES_ROLE = {
  elasticsearch: {
    indices: [
      {
        names: ['*'],
        privileges: ['read', 'all'],
      },
    ],
    cluster: INGEST_PIPELINES_USER_ROLE.elasticsearch.cluster,
  },
  kibana: [
    {
      base: [],
      feature: {
        advancedSettings: ['read'],
        dev_tools: ['read'],
      },
      spaces: ['*'],
    },
  ],
};
