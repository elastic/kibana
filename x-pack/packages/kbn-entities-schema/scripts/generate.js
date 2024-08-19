/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

require('../../../../src/setup_node_env');

const { generateOAS } = require('./generate_oas');
const { writeFileSync } = require('fs');

const spec = generateOAS({ format: '.yaml' });
writeFileSync('oas.yaml', spec);
