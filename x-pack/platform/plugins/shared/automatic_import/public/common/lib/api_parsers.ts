/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EpmPackageResponse } from './api';

/**
 * This is a hacky way to get the integration name from the response.
 * Since the integration name is not returned in the response we have to parse it from the ingest pipeline name.
 * TODO: Return the package name from the fleet API: https://github.com/elastic/kibana/issues/185932
 */
export const getIntegrationNameFromResponse = (response: EpmPackageResponse) => {
  return (
    response?.items
      ?.find((item) => item.type === 'ingest_pipeline')
      ?.id?.match(/^.*-([a-z\d_]+)\..*-([\d\.]+)\-*([a-z]*)$/)
      ?.slice(1, 3)
      ?.join('-') ?? ''
  );
};
