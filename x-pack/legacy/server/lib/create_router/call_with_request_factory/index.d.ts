/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { LegacyAPICaller } from '../../../../../../src/core/server';

export type CallWithRequest = (...args: any[]) => LegacyAPICaller;

export declare function callWithRequestFactory(
  server: Legacy.Server,
  pluginId: string,
  config?: {
    plugins: any[];
  }
): CallWithRequest;
