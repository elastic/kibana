/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolve } from 'path';

export const CA1_CERT_PATH = resolve(__dirname, './test_root_ca.crt');
export const CA2_CERT_PATH = resolve(__dirname, './test_intermediate_ca.crt');
export const EE_P12_PATH = resolve(__dirname, './localhost.p12');
export const EE_P12_PASSWORD = 'storepass';
