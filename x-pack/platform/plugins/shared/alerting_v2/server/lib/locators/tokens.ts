/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createToken } from '@kbn/core-di';

/** Absolute Kibana URL used to make alert links absolute. */
export const KibanaBaseUrlToken = createToken<string>('alerting_v2.KibanaBaseUrl');
