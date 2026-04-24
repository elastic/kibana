/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceIdentifier } from 'inversify';
import type { RuleDoctorFindingsClient } from './rule_doctor_findings_client';

/**
 * RuleDoctorFindingsClient flavor that uses an Elasticsearch client scoped to the current request user:
 * `elasticsearch.client.asScoped(request).asCurrentUser`
 */
export const FindingsClientScopedToken = Symbol.for(
  'alerting_v2.RuleDoctorFindingsClientScoped'
) as ServiceIdentifier<RuleDoctorFindingsClient>;

/**
 * RuleDoctorFindingsClient flavor that uses the internal Kibana system user:
 * `elasticsearch.client.asInternalUser`
 */
export const FindingsClientInternalToken = Symbol.for(
  'alerting_v2.RuleDoctorFindingsClientInternal'
) as ServiceIdentifier<RuleDoctorFindingsClient>;
