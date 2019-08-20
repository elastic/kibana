/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const del = require('del');
const { DLL_OUTPUT } = require('../.storybook/constants');

del.sync([DLL_OUTPUT], { force: true });
