/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

require('../../../../src/setup_node_env');

const { generateOAS } = require('./generate_oas');
const express = require('express');
const swaggerUi = require('swagger-ui-express');

const app = express();
app.use('/', swaggerUi.serve, swaggerUi.setup(generateOAS()));

const port = 3000;
app.listen(port, () => {
  console.log(`OpenAPI UI available on http://localhost:${port}`);
});
