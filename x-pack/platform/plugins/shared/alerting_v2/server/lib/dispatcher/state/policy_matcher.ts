/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeQuotes } from '@kbn/es-query';
import type { PolicyMatcherAttributes } from '../types';

const buildClause = (field: string, values: string[]): string => {
  if (values.length === 1) return `${field} : "${escapeQuotes(values[0])}"`;
  return `(${values.map((v) => `${field} : "${escapeQuotes(v)}"`).join(' OR ')})`;
};

export class PolicyMatcher {
  private constructor(private readonly data: PolicyMatcherAttributes | null) {}

  public static of(data: PolicyMatcherAttributes | null | undefined): PolicyMatcher {
    return new PolicyMatcher(data ?? null);
  }

  public isCatchAll(): boolean {
    if (!this.data) return true;
    const { tags, expression } = this.data;
    return (!tags || tags.length === 0) && (!expression || !expression.trim());
  }

  public toKql(): string | null {
    if (!this.data || this.isCatchAll()) return null;
    const { tags, expression } = this.data;
    const parts: string[] = [];

    if (tags && tags.length > 0) parts.push(buildClause('rule.tags', tags));
    if (expression && expression.trim()) parts.push(`(${expression.trim()})`);

    return parts.join(' AND ');
  }
}
