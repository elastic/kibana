/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Interface for registering an alerting privilege.
 * Alerting privilege registration allows plugins to
 * specify for which rule types and consumers the feature
 * has access to.
 */

export type AlertingKibanaPrivilege = ReadonlyArray<{
  ruleTypeId: string;
  consumers: readonly string[];
}>;
