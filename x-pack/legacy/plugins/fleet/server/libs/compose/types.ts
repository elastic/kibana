/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FleetServerLib } from '../types';
import { FrameworkRequest } from '../adapters/framework/adapter_types';

export type FleetServerLibRequestFactory = (request: FrameworkRequest) => FleetServerLib;
