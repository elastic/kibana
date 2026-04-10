/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ConnectorOrInferenceIdConflictError,
  CONNECTOR_OR_INFERENCE_ID_CONFLICT_MESSAGE_REST,
  normalizeOptionalConnectorOrInferenceParam,
  resolveConnectorOrInferenceId,
} from './resolve_connector_or_inference_id';

describe('normalizeOptionalConnectorOrInferenceParam', () => {
  it('returns undefined for null, undefined, empty string, and whitespace-only', () => {
    expect(normalizeOptionalConnectorOrInferenceParam(undefined)).toBeUndefined();
    expect(normalizeOptionalConnectorOrInferenceParam(null)).toBeUndefined();
    expect(normalizeOptionalConnectorOrInferenceParam('')).toBeUndefined();
    expect(normalizeOptionalConnectorOrInferenceParam('   ')).toBeUndefined();
    expect(normalizeOptionalConnectorOrInferenceParam('\t\n')).toBeUndefined();
  });

  it('trims meaningful strings', () => {
    expect(normalizeOptionalConnectorOrInferenceParam('  id-1  ')).toBe('id-1');
  });

  it('returns undefined for non-strings', () => {
    expect(normalizeOptionalConnectorOrInferenceParam(42)).toBeUndefined();
    expect(normalizeOptionalConnectorOrInferenceParam({})).toBeUndefined();
  });
});

describe('resolveConnectorOrInferenceId', () => {
  it('returns undefined when both inputs are omitted after normalization', () => {
    expect(
      resolveConnectorOrInferenceId({
        connectorId: '',
        inferenceId: null,
      })
    ).toBeUndefined();
  });

  it('returns connector when only connector is meaningful', () => {
    expect(
      resolveConnectorOrInferenceId({
        connectorId: 'c-1',
        inferenceId: '',
      })
    ).toBe('c-1');
  });

  it('returns inference when only inference is meaningful', () => {
    expect(
      resolveConnectorOrInferenceId({
        connectorId: undefined,
        inferenceId: 'inf-1',
      })
    ).toBe('inf-1');
  });

  it('treats whitespace connector as omitted and returns inference', () => {
    expect(
      resolveConnectorOrInferenceId({
        connectorId: '   ',
        inferenceId: 'inf-1',
      })
    ).toBe('inf-1');
  });

  it('throws when both are meaningful, even if identical', () => {
    const conflict = () =>
      resolveConnectorOrInferenceId({
        connectorId: 'same',
        inferenceId: 'same',
      });
    expect(conflict).toThrow(ConnectorOrInferenceIdConflictError);
    expect(conflict).toThrow(CONNECTOR_OR_INFERENCE_ID_CONFLICT_MESSAGE_REST);
  });

  it('uses custom conflict message when provided', () => {
    expect(() =>
      resolveConnectorOrInferenceId(
        { connectorId: 'a', inferenceId: 'b' },
        'custom workflow message'
      )
    ).toThrow('custom workflow message');
  });
});
