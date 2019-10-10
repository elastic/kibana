/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { npStart, npSetup } from 'ui/new_platform';
import { createShim } from '../../public/shim';
import { plugin } from '.';

const pluginInstance = plugin({} as any);
const { pluginsSetup, pluginsStart } = createShim();
pluginInstance.setup(npSetup.core, pluginsSetup);
pluginInstance.start(npStart.core, pluginsStart);
