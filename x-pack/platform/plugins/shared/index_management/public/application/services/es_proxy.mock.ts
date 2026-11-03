/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import type { EsProxyPluginStart } from '@kbn/es-proxy-plugin/public';
import { plugin } from '@kbn/es-proxy-plugin/public';

/** Creates an es_proxy contract whose requests go through `http.fetch` of the given client. */
export const createEsProxyMock = (http: HttpSetup): EsProxyPluginStart =>
  plugin().setup({ ...coreMock.createSetup(), http });
