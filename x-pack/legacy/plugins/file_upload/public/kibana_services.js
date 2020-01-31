/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';

export let indexPatternService;

uiModules.get('app/file_upload').run($injector => {
  indexPatternService = $injector.get('indexPatterns');
});
