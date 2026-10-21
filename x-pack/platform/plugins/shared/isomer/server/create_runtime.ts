/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaIsomerRuntime } from '@kbn/isomer';

/** Loads Kibana's primitive packs and builds a runtime with them. */
export const createRuntime = async (): Promise<KibanaIsomerRuntime> => {
  const [
    { createKibanaIsomerRuntime },
    { componentsPack },
    { vegaPack },
    { chartsPack },
    { mapsPack },
    { dashboardPack },
  ] = await Promise.all([
    import('@kbn/isomer'),
    import('@kbn/isomer-components'),
    import('@kbn/isomer-primitives-vega'),
    import('@kbn/isomer-primitives-charts'),
    import('@kbn/isomer-primitives-maps'),
    import('@kbn/isomer-primitives-dashboard'),
  ]);
  return createKibanaIsomerRuntime({
    packs: [componentsPack, vegaPack, chartsPack, mapsPack, dashboardPack],
  });
};
