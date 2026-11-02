/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FleetStartServices } from '../../public/plugin';

export const stubbedStartServices = {
  licensing: {} as FleetStartServices['licensing'],
  storage: {} as FleetStartServices['storage'],
  data: {} as FleetStartServices['data'],
  dataViews: {} as FleetStartServices['dataViews'],
  unifiedSearch: {} as FleetStartServices['unifiedSearch'],
  kql: {} as FleetStartServices['kql'],
  deprecations: {} as FleetStartServices['deprecations'],
  fatalErrors: {} as FleetStartServices['fatalErrors'],
  navigation: {} as FleetStartServices['navigation'],
  overlays: {} as FleetStartServices['overlays'],
} as FleetStartServices;
