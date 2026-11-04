/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';
import type { MlCoreSetup } from '../plugin';

const INFERENCE_CONNECTORS_ROUTE = '/internal/inference/connectors';

/** Suggesting jobs needs an active Enterprise license and at least one AI connector. */
export const hasLicenseAndConnector = async (
  getStartServices: MlCoreSetup['getStartServices']
): Promise<boolean> => {
  const [{ http }, { licensing }] = await getStartServices();
  const license = await firstValueFrom(licensing.license$);
  if (license.status !== 'active' || !license.hasAtLeast('enterprise')) return false;

  try {
    const { connectors } = await http.get<{ connectors: unknown[] }>(INFERENCE_CONNECTORS_ROUTE);
    return connectors.length > 0;
  } catch {
    return false;
  }
};
