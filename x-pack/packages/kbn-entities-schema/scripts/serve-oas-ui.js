import { generateOAS } from './generate.js';
import express from 'express';
import swaggerUi from 'swagger-ui-express';

var app = express();
app.use('/', swaggerUi.serve, swaggerUi.setup(generateOAS()));

const port = 3000;
app.listen(port, () => {
  console.log(`OpenAPI UI available on localhost:${port}`)
});