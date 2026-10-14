/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { agentConfigurationIntakeSchema } from './agent_configuration_intake_rt';

describe('agentConfigurationIntakeSchema', () => {
  it('is valid when "transaction_sample_rate" is a string', () => {
    expectParseSuccess(
      agentConfigurationIntakeSchema.safeParse({
        service: { name: 'my-service', environment: 'my-environment' },
        settings: { transaction_sample_rate: '0.5' },
      })
    );
  });

  it('is invalid when "transaction_sample_rate" is a number', () => {
    expectParseError(
      agentConfigurationIntakeSchema.safeParse({
        service: {},
        settings: { transaction_sample_rate: 0.5 },
      })
    );
  });

  it('is invalid when "transaction_sample_rate" is out of range (per-setting refinement)', () => {
    expectParseError(
      agentConfigurationIntakeSchema.safeParse({
        service: {},
        settings: { transaction_sample_rate: '5' },
      })
    );
  });

  it('is invalid when a known enum setting has an unknown value', () => {
    expectParseError(
      agentConfigurationIntakeSchema.safeParse({
        service: {},
        settings: { capture_body: 'sometimes' },
      })
    );
  });

  it('is valid when a known enum setting has an allowed value', () => {
    expectParseSuccess(
      agentConfigurationIntakeSchema.safeParse({
        service: {},
        settings: { capture_body: 'all' },
      })
    );
  });

  it('is valid when unknown setting is a string', () => {
    expectParseSuccess(
      agentConfigurationIntakeSchema.safeParse({
        service: { name: 'my-service', environment: 'my-environment' },
        settings: { my_unknown_setting: '0.5' },
      })
    );
  });

  it('is invalid when unknown setting is a boolean', () => {
    expectParseError(
      agentConfigurationIntakeSchema.safeParse({
        service: { name: 'my-service', environment: 'my-environment' },
        settings: { my_unknown_setting: false },
      })
    );
  });

  it('accepts an optional agent_name', () => {
    expectParseSuccess(
      agentConfigurationIntakeSchema.safeParse({
        agent_name: 'java',
        service: { name: 'my-service' },
        settings: {},
      })
    );
  });

  it('rejects a missing service', () => {
    expectParseError(agentConfigurationIntakeSchema.safeParse({ settings: {} }));
  });
});
