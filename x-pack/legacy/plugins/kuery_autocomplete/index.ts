/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { Legacy } from 'kibana';

import { LegacyPluginApi, LegacyPluginInitializer } from '../../../../src/legacy/types';

export const kueryAutocompleteInitializer: LegacyPluginInitializer = ({
  Plugin,
}: LegacyPluginApi) =>
  new Plugin({
    id: 'kuery_autocomplete',
    publicDir: resolve(__dirname, 'public'),
    uiExports: {
      hacks: [resolve(__dirname, 'public/legacy')],
    },
    init: (server: Legacy.Server) => ({}),
  } as Legacy.PluginSpecOptions);
