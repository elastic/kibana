/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { selectTarget, type TargetSelectionEntity } from './target_selection';

describe('selectTarget', () => {
  it('prefers AD over Okta', () => {
    const entities: TargetSelectionEntity[] = [
      { entityId: 'user-okta', namespace: 'okta' },
      { entityId: 'user-ad', namespace: 'active_directory' },
    ];
    expect(selectTarget(entities).entityId).toBe('user-ad');
  });

  it('prefers Okta over Entra', () => {
    const entities: TargetSelectionEntity[] = [
      { entityId: 'user-entra', namespace: 'entra_id' },
      { entityId: 'user-okta', namespace: 'okta' },
    ];
    expect(selectTarget(entities).entityId).toBe('user-okta');
  });

  it('prefers Entra over an unknown namespace', () => {
    const entities: TargetSelectionEntity[] = [
      { entityId: 'user-github', namespace: 'github' },
      { entityId: 'user-entra', namespace: 'entra_id' },
    ];
    expect(selectTarget(entities).entityId).toBe('user-entra');
  });

  it('uses alphabetical entity.id as the tiebreaker in one namespace', () => {
    const entities: TargetSelectionEntity[] = [
      { entityId: 'z-user@okta', namespace: 'okta' },
      { entityId: 'a-user@okta', namespace: 'okta' },
    ];
    expect(selectTarget(entities).entityId).toBe('a-user@okta');
  });

  it('falls back to alphabetical entity.id when no known namespace is present', () => {
    const entities: TargetSelectionEntity[] = [
      { entityId: 'z-user@github', namespace: 'github' },
      { entityId: 'a-user@slack', namespace: 'slack' },
    ];
    expect(selectTarget(entities).entityId).toBe('a-user@slack');
  });

  it('does not treat a substring of a known namespace as a match', () => {
    const entities: TargetSelectionEntity[] = [
      { entityId: 'user-1', namespace: 'not_okta' },
      { entityId: 'user-2', namespace: 'active_directory_custom' },
    ];
    expect(selectTarget(entities).entityId).toBe('user-1');
  });

  it('picks Active Directory over windows/system for the SID bridge', () => {
    const entities: TargetSelectionEntity[] = [
      { entityId: 'user-windows', namespace: 'windows' },
      { entityId: 'user-ad', namespace: 'active_directory' },
      { entityId: 'user-system', namespace: 'system' },
    ];
    expect(selectTarget(entities).entityId).toBe('user-ad');
  });

  it('picks Entra over m365_defender and microsoft_365', () => {
    const entities: TargetSelectionEntity[] = [
      { entityId: 'user-defender', namespace: 'm365_defender' },
      { entityId: 'user-m365', namespace: 'microsoft_365' },
      { entityId: 'user-entra', namespace: 'entra_id' },
    ];
    expect(selectTarget(entities).entityId).toBe('user-entra');
  });

  it('picks Active Directory over crowdstrike', () => {
    const entities: TargetSelectionEntity[] = [
      { entityId: 'user-cs', namespace: 'crowdstrike' },
      { entityId: 'user-ad', namespace: 'active_directory' },
    ];
    expect(selectTarget(entities).entityId).toBe('user-ad');
  });
});
