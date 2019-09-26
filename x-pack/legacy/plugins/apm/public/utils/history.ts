/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createHashHistory } from 'history';

// Make history singleton available across APM project
// TODO: Explore using React context or hook instead?
const history = createHashHistory();

export { history };
