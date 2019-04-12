/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import storeProd from './configureStore.prod';
import storeDev from './configureStore.dev';

const store = process.env.NODE_ENV === 'production' ? storeProd : storeDev;
export default store;
