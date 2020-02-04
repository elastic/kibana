/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npSetup, npStart } from 'ui/new_platform';
import { setup as managementSetup } from '../../../../../src/legacy/core_plugins/management/public/legacy';

const spacesPlugin: SpacesPlugin = plugin();

const pluginsSetup: PluginsSetup = {
  home: npSetup.plugins.home,
  management: managementSetup,
  advancedSettings: npSetup.plugins.advancedSettings,
};
