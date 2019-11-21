/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const PLUGIN_ID = 'oss_telemetry'; // prefix used for registering properties with services from this plugin
export const VIS_TELEMETRY_TASK = 'vis_telemetry'; // suffix for the _id of our task instance, which must be `get`-able
export const VIS_USAGE_TYPE = 'visualization_types'; // suffix for the properties of data registered with the usage service
