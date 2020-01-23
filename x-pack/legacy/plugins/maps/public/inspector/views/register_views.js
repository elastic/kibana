/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MapView } from './map_view';

import { viewRegistry } from '../../../../../../../src/plugins/inspector/public';

viewRegistry.register(MapView);
