/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EpmPackageResponse } from './api';

/**
 * Gets the integration name from the response.
 * First tries to get it from the _meta.name field, then falls back to parsing it from ingest pipeline names.
 * Since the integration name is not always returned in the response we have to parse it from the ingest pipeline name.
 * TODO: Return the package name from the fleet API: https://github.com/elastic/kibana/issues/185932
 */
export const getIntegrationNameFromResponse = (response: EpmPackageResponse) => {
  // First try to get the name from the _meta field
  if (response?._meta?.name) {
    return response._meta.name;
  }

  // Fall back to parsing from ingest pipeline name (legacy behavior)
  return (
    response?.items
      ?.find((item) => item.type === 'ingest_pipeline')
      ?.id?.match(/^.*-([a-z\d_]+)\..*-([\d\.]+)\-*([a-z]*)$/)
      ?.slice(1, 3)
      ?.join('-') ?? ''
  );
};
