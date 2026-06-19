/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Connector } from '@kbn/actions-plugin/server';
import { getConnectorSubActions, toConnectorItem } from './utils';

const baseConnector = {
  id: 'conn-1',
  name: 'Restricted GitHub',
  actionTypeId: '.github',
  isPreconfigured: false,
  isDeprecated: false,
  isSystemAction: false,
  isMissingSecrets: false,
  isConnectorTypeDeprecated: false,
  config: {},
} as Connector;

describe('connector route utils', () => {
  it('returns all spec sub-actions when no restriction is configured', () => {
    const subActions = getConnectorSubActions('.github');
    expect(subActions.length).toBeGreaterThan(1);
    expect(subActions.some(({ name }) => name === 'searchIssues')).toBe(true);
  });

  it('returns only allowed sub-actions when restrictions are configured', () => {
    const subActions = getConnectorSubActions('.github', ['searchIssues', 'getIssue']);
    expect(subActions.map(({ name }) => name)).toEqual(
      expect.arrayContaining(['searchIssues', 'getIssue'])
    );
    expect(subActions.some(({ name }) => name === 'listPullRequests')).toBe(false);
    expect(subActions.some(({ name }) => name === 'listTools')).toBe(true);
    expect(subActions.some(({ name }) => name === 'callTool')).toBe(true);
  });

  it('includes restriction metadata on connector items', () => {
    const item = toConnectorItem({
      ...baseConnector,
      allowedSubActions: ['searchIssues'],
    });

    expect(item.allowedSubActions).toEqual(['searchIssues']);
    expect(item.totalSubActionCount).toBeGreaterThan(item.subActions.length);
    expect(item.subActions.map(({ name }) => name)).toEqual(
      expect.arrayContaining(['searchIssues', 'listTools', 'callTool'])
    );
    expect(item.subActions.some(({ name }) => name === 'listPullRequests')).toBe(false);
  });
});
