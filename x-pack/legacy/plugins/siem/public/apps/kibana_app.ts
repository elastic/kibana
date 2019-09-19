/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import chrome from 'ui/chrome';
import { SiemRootController } from './start_app';

import 'uiExports/autocompleteProviders';
import 'uiExports/embeddableFactories';

// load the application
chrome.setRootController('siem', SiemRootController);
