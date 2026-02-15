/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CaseSeverityEnum,
  CaseStatusEnum,
  ConnectorTypesEnum,
  OwnerEnum,
} from '../../docs/openapi/bundled-types.gen';

export const connectorTypeOptions = Object.values(ConnectorTypesEnum);
export const caseSeverityOptions = Object.values(CaseSeverityEnum);
export const caseStatusOptions = Object.values(CaseStatusEnum);
export const ownerOptions = Object.values(OwnerEnum).map((owner) => ({
  value: owner,
  label: owner,
}));
