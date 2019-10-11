/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const serve = require('serve-static');
const path = require('path');

// Extend the Storybook Middleware to include a route to access Legacy UI assets
module.exports = function(router) {
  router.get('/ui', serve(path.resolve(__dirname, '../../../../../src/legacy/ui/public/assets')));
};
