/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'ui/kbn_top_nav';
import 'ui/directives/storage';
import 'ui/autoload/all';
import 'plugins/monitoring/filters';
import 'plugins/monitoring/services/clusters';
import 'plugins/monitoring/services/features';
import 'plugins/monitoring/services/executor';
import 'plugins/monitoring/services/license';
import 'plugins/monitoring/services/title';
import 'plugins/monitoring/services/breadcrumbs';
import 'plugins/monitoring/directives/all';
import 'plugins/monitoring/views/all';

import { plugin } from './np_ready';
import { npStart } from 'ui/new_platform';

const pluginInstance = plugin({} as any);
pluginInstance.start(npStart.core);