/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npSetup, npStart } from 'ui/new_platform';
import { plugin } from '../index';
import { SpacesPlugin } from '../plugin';

const spacesPlugin: SpacesPlugin = plugin({});

export const waitForSpacesNPInit = spacesPlugin
  .start(npStart.core)
  .then(() => spacesPlugin.setup(npSetup.core));
