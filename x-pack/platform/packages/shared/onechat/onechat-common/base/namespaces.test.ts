/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isInProtectedNamespace, hasNamespaceName } from './namespaces';

describe('isInProtectedNamespace', () => {
  it('returns true when the tool id is inside a protected namespace', () => {
    expect(isInProtectedNamespace('platform.core.some_tool')).toBe(true);
  });

  it('returns true when the tool id is nested in a protected namespace', () => {
    expect(isInProtectedNamespace('platform.core.nested.some_tool')).toBe(true);
  });

  it('returns false when the tool id is inside a part of a protected namespace', () => {
    expect(isInProtectedNamespace('platform.some_tool')).toBe(false);
  });

  // MCP namespace protection tests
  it('returns true when the tool id is inside the mcp namespace', () => {
    expect(isInProtectedNamespace('mcp.connector1.some_tool')).toBe(true);
  });

  it('returns true when the tool id is nested in the mcp namespace', () => {
    expect(isInProtectedNamespace('mcp.github.api.get_issues')).toBe(true);
  });

  it('returns false when the tool id starts with mcp but is not in the namespace', () => {
    expect(isInProtectedNamespace('mcptool')).toBe(false);
  });

  it('returns false when the tool id contains mcp but is not in the namespace', () => {
    expect(isInProtectedNamespace('my.mcp.tool')).toBe(false);
  });
});

describe('hasNamespaceName', () => {
  it('returns true when the tool id equals a protected namespace name', () => {
    expect(hasNamespaceName('platform.core')).toBe(true);
    expect(hasNamespaceName('mcp')).toBe(true);
  });

  it('returns false when the tool id does not equal a namespace name', () => {
    expect(hasNamespaceName('platform')).toBe(false);
    expect(hasNamespaceName('core')).toBe(false);
    expect(hasNamespaceName('mcp.connector')).toBe(false);
    expect(hasNamespaceName('platform.core.tool')).toBe(false);
    expect(hasNamespaceName('my-tool')).toBe(false);
  });
});
