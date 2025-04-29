/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Make sure to only export the component we can lazy load here.
// Code from other files in this directory should be imported directly from the file,
// otherwise we break the bundling approach using lazy loading.
export { VegaChart } from './vega_chart';
