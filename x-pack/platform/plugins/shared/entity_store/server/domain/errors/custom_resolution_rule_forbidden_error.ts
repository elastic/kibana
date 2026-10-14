/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class CustomResolutionRuleForbiddenError extends Error {
  constructor(index: string) {
    super(
      `An enabled custom resolution rule links entities in '${index}', so enabling or changing one requires the 'write' index privilege there`
    );
  }
}
