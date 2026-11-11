/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ACTION_TYPE_SOURCES } from '@kbn/actions-types';
import type { PluginSetupContract } from '../../plugin';
import { actionsConfigMock } from '../../actions_config.mock';
import { DeclarativeConnectorSpecError } from '../declarative_connectors';
import { loadFixture } from '../declarative_connectors/__fixtures__/load_fixture';
import { buildTypeFromStoredSpec } from './build_type_from_stored_spec';
import type { StoredCatalogDefinition } from './types';

const actions = {
  getActionsConfigurationUtilities: () => actionsConfigMock.create(),
  getAxiosInstanceWithAuth: jest.fn(),
  getCredential: jest.fn(),
  getClientLeasePool: jest.fn(),
  getRelayClient: jest.fn(),
  getConnectorJwtSigner: jest.fn(),
} as unknown as PluginSetupContract;

const createDefinition = (yaml: string): StoredCatalogDefinition => ({
  connectorId: '.declarative-test',
  version: '1.0.0',
  yaml,
  contentHash: 'sha256:test',
  catalogVersion: '2026.11.1',
});

describe('buildTypeFromStoredSpec', () => {
  it('takes the id, name, description and feature ids from the YAML', () => {
    const type = buildTypeFromStoredSpec(
      createDefinition(loadFixture('abuseipdb-1.1.0.yaml')),
      actions
    );

    expect(type.id).toBe('.declarative-abuseipdb');
    expect(type.name).toBe('AbuseIPDB (Declarative PoC)');
    expect(type.description).toBe(
      'IP reputation checking with optional verbose reports and abuse reporting'
    );
    expect(type.supportedFeatureIds).toEqual(['workflows', 'agentBuilder']);
    expect(type.isExperimental).toBe(true);
  });

  it('forces the enterprise license even when the YAML says gold', () => {
    const yaml = loadFixture('abuseipdb-1.1.0.yaml');
    expect(yaml).toContain('minimumLicense: gold');

    const type = buildTypeFromStoredSpec(createDefinition(yaml), actions);

    expect(type.minimumLicenseRequired).toBe('enterprise');
  });

  it('marks the type as a spec source', () => {
    const type = buildTypeFromStoredSpec(
      createDefinition(loadFixture('abuseipdb-1.1.0.yaml')),
      actions
    );

    expect(type.source).toBe(ACTION_TYPE_SOURCES.spec);
  });

  it('does not make a network call while building', () => {
    buildTypeFromStoredSpec(createDefinition(loadFixture('abuseipdb-1.1.0.yaml')), actions);

    expect(actions.getAxiosInstanceWithAuth).not.toHaveBeenCalled();
  });

  it('throws for invalid YAML', () => {
    expect(() => buildTypeFromStoredSpec(createDefinition('id: [unclosed'), actions)).toThrow(
      DeclarativeConnectorSpecError
    );
  });

  it('throws for a definition the parser rejects', () => {
    expect(() =>
      buildTypeFromStoredSpec(createDefinition(loadFixture('okta-1.0.0.yaml')), actions)
    ).toThrow(DeclarativeConnectorSpecError);
  });

  it('throws for a YAML that does not match the contract', () => {
    expect(() => buildTypeFromStoredSpec(createDefinition('id: .only-an-id'), actions)).toThrow(
      DeclarativeConnectorSpecError
    );
  });
});
