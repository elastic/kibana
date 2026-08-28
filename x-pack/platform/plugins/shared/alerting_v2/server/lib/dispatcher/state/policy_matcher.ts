/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PolicyMatcherAttributes } from '../types';

const escapeKqlValue = (v: string): string => v.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const buildClause = (field: string, values: string[]): string => {
  if (values.length === 0) return '';
  if (values.length === 1) return `${field} : "${escapeKqlValue(values[0])}"`;
  return `(${values.map((v) => `${field} : "${escapeKqlValue(v)}"`).join(' OR ')})`;
};

export class PolicyMatcher {
  private constructor(private readonly data: PolicyMatcherAttributes | null) {}

  public static of(data: PolicyMatcherAttributes | null | undefined): PolicyMatcher {
    return new PolicyMatcher(data ?? null);
  }

  public isCatchAll(): boolean {
    if (!this.data) return true;
    const { tags, rules, statuses, expression } = this.data;
    return (
      (!tags || tags.length === 0) &&
      (!rules || rules.length === 0) &&
      (!statuses || statuses.length === 0) &&
      (!expression || !expression.trim())
    );
  }

  public toKql(): string | null {
    if (this.isCatchAll()) return null;
    const { tags, rules, statuses, expression } = this.data!;
    const parts: string[] = [];

    if (tags && tags.length > 0) parts.push(buildClause('rule.tags', tags));
    if (rules && rules.length > 0) parts.push(buildClause('rule.id', rules));
    if (statuses && statuses.length > 0) parts.push(buildClause('episode_status', statuses));
    if (expression && expression.trim()) parts.push(`(${expression.trim()})`);

    if (parts.length === 0) return null;
    return parts.join(' AND ');
  }
}
