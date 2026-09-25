/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Generates OTel-native Kubernetes observability sample data for the Custom Apps
 * prototype.
 *
 * Usage: node x-pack/platform/plugins/private/custom_apps/scripts/k8s_otel_data.js --clean
 ******************************/

require('@kbn/setup-node-env');
require('./k8s_otel_data/cli');
