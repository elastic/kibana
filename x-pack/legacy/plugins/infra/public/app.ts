/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './apps/kibana_app';

import { npSetup } from 'ui/new_platform';

console.log('\n\nINFRA PLUGIN\n\n\n');
console.log(npSetup);
console.log(npSetup.plugins.observability.getBP());
console.log('\n\n\nINFRA PLUGIN\n\n');
