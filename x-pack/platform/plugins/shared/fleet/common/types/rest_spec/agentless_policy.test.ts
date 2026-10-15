/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CreateAgentlessPolicyRequestSchema,
  UpdateAgentlessPolicyRequestSchema,
} from './agentless_policy';

const validBody = {
  name: 'my-agentless-policy',
  namespace: 'default',
  package: {
    name: 'agentless_hello_world',
    version: '0.5.0',
  },
  inputs: {},
};

describe('agentless policy request schemas', () => {
  describe('global_data_tags', () => {
    it.each([
      ['create', CreateAgentlessPolicyRequestSchema.body],
      ['update', UpdateAgentlessPolicyRequestSchema.body],
    ])('should reject oversized tag names on %s', (_name, bodySchema) => {
      expect(() =>
        bodySchema.validate({
          ...validBody,
          global_data_tags: [{ name: 'a'.repeat(1025), value: 'prod' }],
        })
      ).toThrow();
    });

    it.each([
      ['create', CreateAgentlessPolicyRequestSchema.body],
      ['update', UpdateAgentlessPolicyRequestSchema.body],
    ])('should reject oversized string tag values on %s', (_name, bodySchema) => {
      expect(() =>
        bodySchema.validate({
          ...validBody,
          global_data_tags: [{ name: 'env', value: 'a'.repeat(1025) }],
        })
      ).toThrow();
    });
  });

  describe('cloud_connector', () => {
    // The GET response mapper emits `cloud_connector: null` when no connector is attached, so a
    // GET -> edit -> PUT/POST round-trip sends `null`. The request body must accept it.
    it.each([
      ['create', CreateAgentlessPolicyRequestSchema.body],
      ['update', UpdateAgentlessPolicyRequestSchema.body],
    ])('should accept a null cloud_connector on %s (GET round-trip)', (_name, bodySchema) => {
      expect(() => bodySchema.validate({ ...validBody, cloud_connector: null })).not.toThrow();
    });

    it.each([
      ['create', CreateAgentlessPolicyRequestSchema.body],
      ['update', UpdateAgentlessPolicyRequestSchema.body],
    ])('should accept an omitted cloud_connector on %s', (_name, bodySchema) => {
      expect(() => bodySchema.validate(validBody)).not.toThrow();
    });

    it.each([
      ['create', CreateAgentlessPolicyRequestSchema.body],
      ['update', UpdateAgentlessPolicyRequestSchema.body],
    ])('should accept a populated cloud_connector on %s', (_name, bodySchema) => {
      expect(() =>
        bodySchema.validate({
          ...validBody,
          cloud_connector: { enabled: true, target_csp: 'aws', cloud_connector_id: 'cc-1' },
        })
      ).not.toThrow();
    });

    // `enabled` defaults to false, so attach-only fields without an explicit `enabled: true`
    // would silently detach the connector. Reject the contradiction with a 400 instead.
    it.each([
      ['create', CreateAgentlessPolicyRequestSchema.body],
      ['update', UpdateAgentlessPolicyRequestSchema.body],
    ])('should reject attach-only fields when enabled is not true on %s', (_name, bodySchema) => {
      for (const cloudConnector of [
        { cloud_connector_id: 'cc-1' },
        { enabled: false, cloud_connector_id: 'cc-1' },
        { name: 'my-connector' },
        { target_csp: 'aws' },
      ]) {
        expect(() =>
          bodySchema.validate({ ...validBody, cloud_connector: cloudConnector })
        ).toThrow(/enabled must be true/);
      }
    });

    it.each([
      ['create', CreateAgentlessPolicyRequestSchema.body],
      ['update', UpdateAgentlessPolicyRequestSchema.body],
    ])('should accept a disabled connector with no attach fields on %s', (_name, bodySchema) => {
      expect(() =>
        bodySchema.validate({ ...validBody, cloud_connector: { enabled: false } })
      ).not.toThrow();
    });

    // `cloud_connector_id` reuses an existing connector; `name` only applies when creating a new
    // one, so passing both is a silent no-op for `name`. Reject the contradiction instead.
    it.each([
      ['create', CreateAgentlessPolicyRequestSchema.body],
      ['update', UpdateAgentlessPolicyRequestSchema.body],
    ])('should reject name together with cloud_connector_id on %s', (_name, bodySchema) => {
      expect(() =>
        bodySchema.validate({
          ...validBody,
          cloud_connector: { enabled: true, cloud_connector_id: 'cc-1', name: 'my-connector' },
        })
      ).toThrow(/name cannot be set together with cloud_connector_id/);
    });

    it.each([
      ['create', CreateAgentlessPolicyRequestSchema.body],
      ['update', UpdateAgentlessPolicyRequestSchema.body],
    ])(
      'should accept reusing a connector by id with a matching target_csp on %s',
      (_name, bodySchema) => {
        expect(() =>
          bodySchema.validate({
            ...validBody,
            cloud_connector: { enabled: true, cloud_connector_id: 'cc-1', target_csp: 'aws' },
          })
        ).not.toThrow();
      }
    );
  });
});
