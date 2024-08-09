require('../../../../src/setup_node_env');

const { generateOAS } = require('./generate.js');
const express = require('express');
const swaggerUi = require('swagger-ui-express');

var app = express();
app.use('/', swaggerUi.serve, swaggerUi.setup(generateOAS()));

const port = 3000;
app.listen(port, () => {
  console.log(`OpenAPI UI available on localhost:${port}`)
});