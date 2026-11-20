/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Whether a principal may read and change one kind of record. Manage implies read. */
export interface ReadManagePrivileges {
  read: boolean;
  manage: boolean;
}

/**
 * The investigation and escalation API privileges a principal holds, as reported by
 * `INVESTIGATIONS_PRIVILEGES_URL`. A solution feature can grant them without the agentic
 * investigations UI capabilities.
 */
export interface InvestigationsPrivilegesResponse {
  investigations: ReadManagePrivileges;
  escalations: ReadManagePrivileges;
}
