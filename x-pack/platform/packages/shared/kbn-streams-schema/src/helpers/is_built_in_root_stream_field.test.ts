/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBuiltInRootStreamField } from './is_built_in_root_stream_field';

describe('isBuiltInRootStreamField', () => {
  it('returns true for built-in fields on logs.otel', () => {
    expect(isBuiltInRootStreamField('logs.otel', '@timestamp')).toBe(true);
    expect(isBuiltInRootStreamField('logs.otel', 'severity_text')).toBe(true);
    expect(isBuiltInRootStreamField('logs.otel', 'resource.attributes.host.name')).toBe(true);
  });

  it('returns true for built-in fields on logs.ecs', () => {
    expect(isBuiltInRootStreamField('logs.ecs', 'log.level')).toBe(true);
    expect(isBuiltInRootStreamField('logs.ecs', 'host.name')).toBe(true);
    expect(isBuiltInRootStreamField('logs.ecs', 'message')).toBe(true);
  });

  it('returns true for built-in OTel fields on the legacy logs root', () => {
    expect(isBuiltInRootStreamField('logs', 'body.text')).toBe(true);
  });

  it('returns false for custom fields on a root stream', () => {
    expect(isBuiltInRootStreamField('logs.otel', 'attributes.organization_id')).toBe(false);
    expect(isBuiltInRootStreamField('logs.ecs', 'organization.id')).toBe(false);
  });

  it('returns false for child streams even when the field name matches a built-in', () => {
    expect(isBuiltInRootStreamField('logs.otel.child', '@timestamp')).toBe(false);
    expect(isBuiltInRootStreamField('logs.ecs.child', 'log.level')).toBe(false);
  });

  it('does not treat ECS-only fields as built-in on OTel roots', () => {
    expect(isBuiltInRootStreamField('logs.otel', 'log.level')).toBe(false);
    expect(isBuiltInRootStreamField('logs.ecs', 'severity_text')).toBe(false);
  });
});
