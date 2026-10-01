/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAllAvailableConnectors } from './prompts';
import { requiredEisConnectorIds } from './run_helpers';

jest.mock('./prompts', () => ({
  promptForSuite: jest.fn(),
  promptForConnector: jest.fn(),
  promptForProject: jest.fn(),
  isTTY: jest.fn().mockReturnValue(false),
  getAllAvailableConnectors: jest.fn(),
}));

const mockGetAllAvailableConnectors = getAllAvailableConnectors as jest.MockedFunction<
  typeof getAllAvailableConnectors
>;

describe('requiredEisConnectorIds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAllAvailableConnectors.mockReturnValue([]);
  });

  it('includes an EIS judge connector', () => {
    expect(requiredEisConnectorIds('eis-google-gemini-3-1-pro', [], '/repo')).toEqual([
      'eis-google-gemini-3-1-pro',
    ]);
  });

  it('ignores a non-EIS judge connector', () => {
    expect(requiredEisConnectorIds('some-local-connector', [], '/repo')).toEqual([]);
  });

  it('includes only the EIS entries of an explicit model list', () => {
    expect(
      requiredEisConnectorIds('local-judge', ['eis-claude-5-sonnet', 'gpt-5-5'], '/repo')
    ).toEqual(['eis-claude-5-sonnet']);
  });

  it('falls back to every available EIS connector when no model is given', () => {
    mockGetAllAvailableConnectors.mockReturnValue([
      { id: 'eis-claude-5-sonnet', name: 'Claude', source: 'env' },
      { id: 'non-eis-model', name: 'Other', source: 'env' },
      { id: 'eis-gpt-5-5', name: 'GPT', source: 'env' },
    ]);

    expect(requiredEisConnectorIds('local-judge', [], '/repo')).toEqual([
      'eis-claude-5-sonnet',
      'eis-gpt-5-5',
    ]);
  });

  it('does not fall back to available connectors when a model list is given', () => {
    mockGetAllAvailableConnectors.mockReturnValue([
      { id: 'eis-claude-5-sonnet', name: 'Claude', source: 'env' },
    ]);

    // An explicit --model list means only those connectors are resolved, so a
    // cache missing them must fail even though other EIS connectors exist.
    expect(requiredEisConnectorIds('local-judge', ['local-model'], '/repo')).toEqual([]);
    expect(mockGetAllAvailableConnectors).not.toHaveBeenCalled();
  });

  it('de-duplicates when the judge is also in the model list', () => {
    expect(
      requiredEisConnectorIds('eis-claude-5-sonnet', ['eis-claude-5-sonnet'], '/repo')
    ).toEqual(['eis-claude-5-sonnet']);
  });

  it('excludes an eis-* id that is a preconfigured kibana.dev.yml connector', () => {
    // "eis-" on an id is a naming convention only — a connector registered via
    // xpack.actions.preconfigured in kibana.dev.yml is served directly by
    // Kibana and never resolves through the EIS connector cache.
    mockGetAllAvailableConnectors.mockReturnValue([
      { id: 'eis-my-preconfigured-connector', name: 'Preconfigured', source: 'kibana.dev.yml' },
    ]);

    expect(requiredEisConnectorIds('eis-my-preconfigured-connector', [], '/repo')).toEqual([]);
  });

  it('keeps a real EIS id in a mixed model list alongside a preconfigured one', () => {
    mockGetAllAvailableConnectors.mockReturnValue([
      { id: 'eis-my-preconfigured-connector', name: 'Preconfigured', source: 'kibana.dev.yml' },
      { id: 'eis-claude-5-sonnet', name: 'Claude', source: 'env' },
    ]);

    expect(
      requiredEisConnectorIds(
        'local-judge',
        ['eis-my-preconfigured-connector', 'eis-claude-5-sonnet'],
        '/repo'
      )
    ).toEqual(['eis-claude-5-sonnet']);
  });
});
