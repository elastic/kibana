/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// These items are defined both in [Elastic Agent integrations](https://www.elastic.co/integrations/data-integrations) and [Beats modules](https://www.elastic.co/guide/en/beats/metricbeat/current/metricbeat-modules.html).

/**
 * Deprecated - use agent.name or agent.id to identify an agent.
 *
 * @deprecated
 * @see https://www.elastic.co/guide/en/beats/filebeat/current/exported-fields-beat-common.html
 */
export const ATTR_AGENT_HOSTNAME = 'agent.hostname' as const;
