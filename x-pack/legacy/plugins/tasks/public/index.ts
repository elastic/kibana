/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createShim } from './legacy';
import { TasksPlugin } from './plugin';

export const plugin = () => new TasksPlugin();

const { coreStart, pluginsStart } = createShim();
plugin().start(coreStart, pluginsStart);
