/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'plugins/monitoring/filters';
import 'plugins/monitoring/services/clusters';
import 'plugins/monitoring/services/features';
import 'plugins/monitoring/services/executor';
import 'plugins/monitoring/services/license';
import 'plugins/monitoring/services/title';
import 'plugins/monitoring/services/breadcrumbs';
import 'plugins/monitoring/directives/all';
import 'plugins/monitoring/views/all';
import { npSetup, npStart } from '../public/np_imports/legacy_imports';
import { plugin } from './np_ready';
import { localApplicationService } from '../../../../../src/legacy/core_plugins/kibana/public/local_application_service';

const pluginInstance = plugin({} as any);
pluginInstance.setup(npSetup.core, npSetup.plugins);
pluginInstance.start(npStart.core, {
  ...npStart.plugins,
  __LEGACY: {
    localApplicationService,
  },
});
