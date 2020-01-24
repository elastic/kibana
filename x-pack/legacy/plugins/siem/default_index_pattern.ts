/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/** The comma-delimited list of Elasticsearch indices from which the SIEM app collects events */
export const defaultIndexPattern = [
  'apm-*-transaction*',
  'auditbeat-*',
  'endgame-*',
  'filebeat-*',
  'packetbeat-*',
  'winlogbeat-*',
];
