/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import { SECURITY_ENTITY_ATTACHMENT_TYPE } from '../../../../common/constants/attachments';
import type { UnifiedAttachmentAttributes } from '../../../common/types/attachments_v2';
import {
  collectEntityAssociatedNames,
  mergeAlertMetricsWithEntityNames,
} from './entity_associated';

const basicAttrs = {
  owner: 'securitySolution',
  created_at: '2020-01-01T00:00:00.000Z',
  created_by: { username: 'elastic', full_name: null, email: null },
  pushed_at: null,
  pushed_by: null,
  updated_at: null,
  updated_by: null,
};

const entitySo = (
  overrides: Partial<UnifiedAttachmentAttributes> & {
    attachmentId: string;
    metadata: Record<string, string | number>;
  }
): SavedObject<UnifiedAttachmentAttributes> => ({
  id: `so-${overrides.attachmentId}`,
  type: 'cases-attachments',
  references: [],
  attributes: {
    type: SECURITY_ENTITY_ATTACHMENT_TYPE,
    ...basicAttrs,
    ...overrides,
  },
});

describe('collectEntityAssociatedNames', () => {
  it('collects unique user and host entity display names', () => {
    const result = collectEntityAssociatedNames([
      entitySo({
        attachmentId: 'user:alice@default',
        metadata: { entityName: 'alice', entityType: 'user' },
      }),
      entitySo({
        attachmentId: 'user:alice@default-dup',
        metadata: { entityName: 'alice', entityType: 'user' },
      }),
      entitySo({
        attachmentId: 'host:web01@default',
        metadata: { entityName: 'web01', entityType: 'host' },
      }),
    ]);

    expect([...result.userNames]).toEqual(['alice']);
    expect([...result.hostsByName.entries()]).toEqual([['web01', 'host:web01@default']]);
  });

  it('ignores service and generic entity types', () => {
    const result = collectEntityAssociatedNames([
      entitySo({
        attachmentId: 'service:nginx@default',
        metadata: { entityName: 'nginx', entityType: 'service' },
      }),
      entitySo({
        attachmentId: 'generic:thing@default',
        metadata: { entityName: 'thing', entityType: 'generic' },
      }),
    ]);

    expect(result.userNames.size).toBe(0);
    expect(result.hostsByName.size).toBe(0);
  });

  it('skips attachments missing entity metadata', () => {
    const result = collectEntityAssociatedNames([
      entitySo({
        attachmentId: 'user:incomplete@default',
        metadata: { entityType: 'user' },
      }),
      {
        id: 'other',
        type: 'cases-attachments',
        references: [],
        attributes: {
          type: 'security.alert',
          attachmentId: 'alert-1',
          metadata: { index: 'alerts' },
          ...basicAttrs,
        },
      },
    ]);

    expect(result.userNames.size).toBe(0);
    expect(result.hostsByName.size).toBe(0);
  });
});

describe('mergeAlertMetricsWithEntityNames', () => {
  it('unions overlapping alert and entity user names', () => {
    const merged = mergeAlertMetricsWithEntityNames(
      {
        alerts: {
          users: {
            total: 1,
            values: [{ name: 'alice', count: 3 }],
          },
        },
      },
      {
        userNames: new Set(['alice', 'bob']),
        hostsByName: new Map(),
      },
      { userNames: new Set(['alice']), hostNames: new Set() }
    );

    expect(merged.alerts?.users).toEqual({
      total: 2,
      values: [
        { name: 'alice', count: 3 },
        { name: 'bob', count: 1 },
      ],
    });
  });

  it('does not double count an entity name that matches an alert identity hidden beyond the displayed top-N', () => {
    // Alert total is 5, but only 1 name ("alice") is in the displayed top-N `values`.
    // "bob" is one of the other 4 alert-derived identities that ISN'T displayed — the
    // exhaustive `knownAlertNames.userNames` set is what lets us recognize that and avoid
    // double-counting it.
    const merged = mergeAlertMetricsWithEntityNames(
      {
        alerts: {
          users: {
            total: 5,
            values: [{ name: 'alice', count: 1 }],
          },
        },
      },
      {
        userNames: new Set(['bob']),
        hostsByName: new Map(),
      },
      { userNames: new Set(['alice', 'bob', 'carol', 'dave', 'erin']), hostNames: new Set() }
    );

    expect(merged.alerts?.users?.total).toBe(5);
  });

  it('adds an entity name that is genuinely absent from all alert-derived identities', () => {
    const merged = mergeAlertMetricsWithEntityNames(
      {
        alerts: {
          users: {
            total: 5,
            values: [{ name: 'alice', count: 1 }],
          },
        },
      },
      {
        userNames: new Set(['frank']),
        hostsByName: new Map(),
      },
      { userNames: new Set(['alice', 'bob', 'carol', 'dave', 'erin']), hostNames: new Set() }
    );

    expect(merged.alerts?.users?.total).toBe(6);
  });

  it('unions host display names and appends entity-only hosts', () => {
    const merged = mergeAlertMetricsWithEntityNames(
      {
        alerts: {
          hosts: {
            total: 1,
            values: [{ id: 'id-1', name: 'web01', count: 2 }],
          },
        },
      },
      {
        userNames: new Set(),
        hostsByName: new Map([
          ['web01', 'host:web01@default'],
          ['db01', 'host:db01@default'],
        ]),
      },
      { userNames: new Set(), hostNames: new Set(['web01']) }
    );

    expect(merged.alerts?.hosts).toEqual({
      total: 2,
      values: [
        { id: 'id-1', name: 'web01', count: 2 },
        { id: 'host:db01@default', name: 'db01', count: 1 },
      ],
    });
  });

  it('returns metrics unchanged when there are no entity names', () => {
    const metrics = {
      alerts: {
        users: { total: 1, values: [{ name: 'alice', count: 1 }] },
      },
    };

    expect(
      mergeAlertMetricsWithEntityNames(
        metrics,
        {
          userNames: new Set(),
          hostsByName: new Map(),
        },
        { userNames: new Set(['alice']), hostNames: new Set() }
      )
    ).toBe(metrics);
  });
});
