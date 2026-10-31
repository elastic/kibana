/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createKibanaIsomerRuntime } from '@kbn/isomer';
import { componentsPack } from '@kbn/isomer-components';
import { createIsomerStyleContext } from '@kbn/isomer-theme';

export default {
  title: 'Kibana Isomer Studio',
  // All production packs on main. No frames or image formats: no snapshot, PNG, or PDF host.
  runtime: createKibanaIsomerRuntime({ packs: [componentsPack] }),
  createReactContext: (root: ShadowRoot) => createIsomerStyleContext({ root }),
};
