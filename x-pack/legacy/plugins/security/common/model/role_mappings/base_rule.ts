/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export abstract class BaseRule {
  constructor(public readonly isNegated: boolean) {}

  abstract toRaw(): Record<string, any>;

  abstract getType(): string;

  abstract getDisplayTitle(): string;

  abstract clone(): BaseRule;
}
