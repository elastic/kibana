/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOutboundSubmitValues, isOutboundActionsEnabledPayload } from './outbound_actions';

jest.mock('@kbn/connector-specs', () => {
  const actual = jest.requireActual('@kbn/connector-specs');
  return {
    ...actual,
    connectorTypeIsDual: jest.fn((id: string) => id === '.dual'),
  };
});

describe('isOutboundActionsEnabledPayload', () => {
  it('sends true for a dual type when the cluster flag is on and the switch is on or unset', () => {
    expect(isOutboundActionsEnabledPayload('.dual', true, true)).toEqual({
      isOutboundActionsEnabled: true,
    });
    expect(isOutboundActionsEnabledPayload('.dual', undefined, true)).toEqual({
      isOutboundActionsEnabled: true,
    });
  });

  it('sends false only when the switch is off', () => {
    expect(isOutboundActionsEnabledPayload('.dual', false, true)).toEqual({
      isOutboundActionsEnabled: false,
    });
  });

  it('sends nothing when the cluster flag is off', () => {
    expect(isOutboundActionsEnabledPayload('.dual', false, false)).toEqual({});
  });

  it('sends nothing for a type that is not dual', () => {
    expect(isOutboundActionsEnabledPayload('.slack', false, true)).toEqual({});
  });
});

describe('getOutboundSubmitValues', () => {
  const formConfig = { instanceUrl: 'https://new.example.com' };
  const formSecrets = { token: 'new' };
  const savedConfig = { instanceUrl: 'https://saved.example.com', authType: 'bearer' };

  it('uses the form config and secrets when the switch is on', () => {
    expect(
      getOutboundSubmitValues({
        isOutboundActionsEnabled: true,
        formConfig,
        formSecrets,
        savedConfig,
      })
    ).toEqual({ config: formConfig, secrets: formSecrets });
  });

  it('uses the form config and secrets when the switch is not shown', () => {
    expect(
      getOutboundSubmitValues({
        isOutboundActionsEnabled: undefined,
        formConfig,
        formSecrets,
      })
    ).toEqual({ config: formConfig, secrets: formSecrets });
  });

  it('falls back to empty objects when the form has none and the switch is on', () => {
    expect(
      getOutboundSubmitValues({
        isOutboundActionsEnabled: true,
        formConfig: undefined,
        formSecrets: undefined,
      })
    ).toEqual({ config: {}, secrets: {} });
  });

  it('sends the saved config and empty secrets in edit mode when the switch is off', () => {
    expect(
      getOutboundSubmitValues({
        isOutboundActionsEnabled: false,
        formConfig,
        formSecrets,
        savedConfig,
      })
    ).toEqual({ config: savedConfig, secrets: {} });
  });

  it('sends empty config and secrets in create mode when the switch is off', () => {
    expect(
      getOutboundSubmitValues({
        isOutboundActionsEnabled: false,
        formConfig,
        formSecrets,
      })
    ).toEqual({ config: {}, secrets: {} });
  });
});
