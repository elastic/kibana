/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class InvalidCustomResolutionRuleError extends Error {
  constructor(reason: string, attribute?: string) {
    super(
      attribute
        ? `Invalid '${attribute}' in custom resolution rule: ${reason}`
        : `Invalid custom resolution rule: ${reason}`
    );
  }
}
