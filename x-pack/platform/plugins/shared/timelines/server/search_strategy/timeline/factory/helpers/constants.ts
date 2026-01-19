/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EVENTS_FIELDS as TIMELINE_EVENTS_FIELDS } from '@kbn/alerts-as-data-utils';

const ECS_METADATA_FIELDS = ['_id', '_index', '_type', '_score'];

export { TIMELINE_EVENTS_FIELDS, ECS_METADATA_FIELDS };
