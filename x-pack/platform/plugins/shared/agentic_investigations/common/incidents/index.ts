/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  INCIDENT_BY_ID_URL,
  INCIDENT_LINKED_INVESTIGATIONS_FIELD,
  INCIDENT_TEMPLATE_ID,
  INCIDENTS_INTERNAL_URL,
  INCIDENTS_UI_CAPABILITY_MANAGE,
  INVESTIGATION_TEMPLATE_ID,
  MAX_INCIDENT_LINKED_INVESTIGATIONS,
} from './constants';

export {
  createIncidentRequestSchema,
  incidentVisibilitySchema,
  updateIncidentRequestSchema,
} from './incident';

export type {
  CreateIncidentRequest,
  IncidentConversation,
  IncidentVisibility,
  UpdateIncidentRequest,
} from './incident';
