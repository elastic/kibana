/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PolicyMatcherAttributes } from '../types';

export class PolicyMatcher {
  private constructor(private readonly data: PolicyMatcherAttributes | null) {}

  public static of(data: PolicyMatcherAttributes | null | undefined): PolicyMatcher {
    return new PolicyMatcher(data ?? null);
  }

  public isCatchAll(): boolean {
    return !this.hasTags() && this.expressionKql() === null;
  }

  public hasTags(): boolean {
    return !!(this.data?.tags && this.data.tags.length > 0);
  }

  public matchesTags(ruleTags?: readonly string[]): boolean {
    if (!this.hasTags()) return true;
    if (!ruleTags || ruleTags.length === 0) return false;
    const ruleTagSet = new Set(ruleTags);
    return this.data?.tags?.some((tag) => ruleTagSet.has(tag)) ?? false;
  }

  public expressionKql(): string | null {
    if (!this.data) return null;
    const { expression } = this.data;
    if (!expression) return null;
    const trimmed = expression.trim();
    return trimmed || null;
  }
}
