/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO (http-versioning): This file exists only to provide the type export for
// security solution, once we version all of our types we can remove this file
export interface RuleParamsModifierResult<Params> {
  modifiedParams: Params;
  isParamsUpdateSkipped: boolean;
}
