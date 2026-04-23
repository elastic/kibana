/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import type { RawAction } from '../types';
import { createMockInMemoryConnector } from '../application/connector/mocks';
import {
  getImportWarnings,
  getPreconfiguredConflictWarnings,
  getInvalidConnectorIdWarnings,
} from './get_import_warnings';

describe('getImportWarnings', () => {
  it('return warning message with total imported connectors and the proper secrets need to update', () => {
    const savedObjectConnectors = [
      {
        type: 'action',
        id: 'ed02cb70-a6ef-11eb-bd58-6b2eae02c6ef',
        attributes: {
          actionTypeId: '.server-log',
          config: {},
          isMissingSecrets: false,
          name: 'test',
        },
        references: [],
        migrationVersion: { action: '7.14.0' },
        coreMigrationVersion: '8.0.0',
        updated_at: '2021-04-27T04:10:33.043Z',
        version: 'WzcxLDFd',
        namespaces: ['default'],
      },
      {
        type: 'action',
        id: 'e8aa94e0-a6ef-11eb-bd58-6b2eae02c6ef',
        attributes: {
          actionTypeId: '.email',
          config: {},
          isMissingSecrets: true,
          name: 'test',
        },
        references: [],
        migrationVersion: { action: '7.14.0' },
        coreMigrationVersion: '8.0.0',
        updated_at: '2021-04-27T04:10:33.043Z',
        version: 'WzcyLDFd',
        namespaces: ['default'],
      },
    ];
    const warnings = getImportWarnings(
      savedObjectConnectors as unknown as Array<SavedObject<RawAction>>
    );
    expect(warnings[0].message).toBe('1 connector has sensitive information that require updates.');
  });

  it('does not return the warning message if all of the imported connectors do not have secrets to update', () => {
    const savedObjectConnectors = [
      {
        type: 'action',
        id: 'ed02cb70-a6ef-11eb-bd58-6b2eae02c6ef',
        attributes: {
          actionTypeId: '.server-log',
          config: {},
          isMissingSecrets: false,
          name: 'test',
        },
        references: [],
        migrationVersion: { action: '7.14.0' },
        coreMigrationVersion: '8.0.0',
        updated_at: '2021-04-27T04:10:33.043Z',
        version: 'WzcxLDFd',
        namespaces: ['default'],
      },
      {
        type: 'action',
        id: 'e8aa94e0-a6ef-11eb-bd58-6b2eae02c6ef',
        attributes: {
          actionTypeId: '.email',
          config: {
            hasAuth: false,
          },
          isMissingSecrets: false,
          name: 'test',
        },
        references: [],
        migrationVersion: { action: '7.14.0' },
        coreMigrationVersion: '8.0.0',
        updated_at: '2021-04-27T04:10:33.043Z',
        version: 'WzcyLDFd',
        namespaces: ['default'],
      },
    ];
    const warnings = getImportWarnings(
      savedObjectConnectors as unknown as Array<SavedObject<RawAction>>
    );
    expect(warnings.length).toBe(0);
  });
});

describe('getPreconfiguredConflictWarnings', () => {
  const createConnector = (id: string, destinationId?: string) =>
    ({
      type: 'action',
      id,
      ...(destinationId && { destinationId }),
      attributes: {
        actionTypeId: '.server-log',
        config: {},
        isMissingSecrets: false,
        name: 'test',
      },
      references: [],
      migrationVersion: { action: '7.14.0' },
      coreMigrationVersion: '8.0.0',
      updated_at: '2021-04-27T04:10:33.043Z',
      version: 'WzcxLDFd',
      namespaces: ['default'],
    } as unknown as SavedObject<RawAction> & { destinationId?: string });

  it('returns empty array when no connectors conflict with preconfigured', () => {
    const connectors = [createConnector('custom-1'), createConnector('custom-2')];
    const inMemoryConnectors = [
      createMockInMemoryConnector({ id: 'preconfigured-slack', isPreconfigured: true }),
    ];
    expect(getPreconfiguredConflictWarnings(connectors, inMemoryConnectors)).toEqual([]);
  });

  it('returns warning when connector conflicts and was created with original id', () => {
    const connectors = [createConnector('preconfigured-slack'), createConnector('custom-1')];
    const inMemoryConnectors = [
      createMockInMemoryConnector({ id: 'preconfigured-slack', isPreconfigured: true }),
    ];
    const warnings = getPreconfiguredConflictWarnings(connectors, inMemoryConnectors);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toMatch(/preconfigured/);
  });

  it('returns empty array when conflicting connector has destinationId (createNewCopies)', () => {
    const connectors = [
      createConnector('preconfigured-slack', 'new-uuid-12345'),
      createConnector('custom-1'),
    ];
    const inMemoryConnectors = [
      createMockInMemoryConnector({ id: 'preconfigured-slack', isPreconfigured: true }),
    ];
    expect(getPreconfiguredConflictWarnings(connectors, inMemoryConnectors)).toEqual([]);
  });
});

describe('getInvalidConnectorIdWarnings', () => {
  const createConnector = (id: string, destinationId?: string) =>
    ({
      type: 'action',
      id,
      ...(destinationId && { destinationId }),
      attributes: {
        actionTypeId: '.server-log',
        config: {},
        isMissingSecrets: false,
        name: 'test',
      },
      references: [],
      namespaces: ['default'],
    } as unknown as SavedObject<RawAction> & { destinationId?: string });

  it('returns empty array when all connector ids are valid slugs', () => {
    const connectors = [createConnector('my-connector'), createConnector('another-one')];
    expect(getInvalidConnectorIdWarnings(connectors)).toEqual([]);
  });

  it('returns empty array for standard UUID ids', () => {
    const connectors = [createConnector('ed02cb70-a6ef-11eb-bd58-6b2eae02c6ef')];
    expect(getInvalidConnectorIdWarnings(connectors)).toEqual([]);
  });

  it('returns warning for uppercase ids', () => {
    const connectors = [createConnector('My-Connector')];
    const warnings = getInvalidConnectorIdWarnings(connectors);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toMatch(/My-Connector/);
    expect(warnings[0].message).toMatch(/invalid/i);
  });

  it('returns warning for ids with spaces', () => {
    const connectors = [createConnector('my connector')];
    const warnings = getInvalidConnectorIdWarnings(connectors);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toMatch(/my connector/);
  });

  it('returns warning for ids exceeding max length', () => {
    const longId = 'a'.repeat(37);
    const connectors = [createConnector(longId)];
    const warnings = getInvalidConnectorIdWarnings(connectors);
    expect(warnings).toHaveLength(1);
  });

  it('skips connectors with destinationId (regenerated id)', () => {
    const connectors = [createConnector('My-Connector', 'new-uuid')];
    expect(getInvalidConnectorIdWarnings(connectors)).toEqual([]);
  });

  it('lists multiple invalid ids in a single warning', () => {
    const connectors = [
      createConnector('Bad Id'),
      createConnector('UPPER'),
      createConnector('valid-one'),
    ];
    const warnings = getInvalidConnectorIdWarnings(connectors);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toMatch(/Bad Id/);
    expect(warnings[0].message).toMatch(/UPPER/);
    expect(warnings[0].message).not.toMatch(/valid-one/);
  });
});
