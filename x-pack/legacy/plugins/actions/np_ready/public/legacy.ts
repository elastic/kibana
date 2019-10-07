/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { npStart } from 'ui/new_platform';
import { createShim } from '../../public/shim';
import { plugin } from '.';

const pluginInstance = plugin({} as any);
const { pluginsStart } = createShim();
pluginInstance.start(npStart.core, pluginsStart);
