/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DrilldownState } from '@kbn/embeddable-plugin/server';
import type { z } from '@kbn/zod';
import type { discoverDrilldownSchema } from './register_discover_drilldown';

export type DiscoverDrilldownState = DrilldownState & z.output<typeof discoverDrilldownSchema>;
