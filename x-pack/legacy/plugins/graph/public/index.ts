/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npSetup, npStart } from 'ui/new_platform';
import { start as data } from '../../../../../src/legacy/core_plugins/data/public/legacy';
import { GraphPlugin } from './plugin';

const instance = new GraphPlugin();
instance.setup(npSetup.core);
instance.start(npStart.core, { data, npData: npStart.plugins.data });
