/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceIdentifier } from 'inversify';
import type { RuleDoctorInsightsClient } from './rule_doctor_insights_client';

/**
 * RuleDoctorInsightsClient flavor that uses an Elasticsearch client scoped to the current request user:
 * `elasticsearch.client.asScoped(request).asCurrentUser`
 */
export const InsightsClientScopedToken = Symbol.for(
  'alerting_v2.RuleDoctorInsightsClientScoped'
) as ServiceIdentifier<RuleDoctorInsightsClient>;

/**
 * RuleDoctorInsightsClient flavor that uses the internal Kibana system user:
 * `elasticsearch.client.asInternalUser`
 */
export const InsightsClientInternalToken = Symbol.for(
  'alerting_v2.RuleDoctorInsightsClientInternal'
) as ServiceIdentifier<RuleDoctorInsightsClient>;
