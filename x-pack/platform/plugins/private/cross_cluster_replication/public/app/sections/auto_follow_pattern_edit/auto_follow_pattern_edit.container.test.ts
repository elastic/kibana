/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

vi.mock('../../store/actions', () => {
  const mocked = {
    getAutoFollowPattern: vi.fn(() => ({ type: 'MOCK/GET_AUTO_FOLLOW_PATTERN' })),
    updateAutoFollowPattern: vi.fn(() => ({ type: 'MOCK/UPDATE_AUTO_FOLLOW_PATTERN' })),
    selectEditAutoFollowPattern: vi.fn(() => ({ type: 'MOCK/SELECT_EDIT_AUTO_FOLLOW_PATTERN' })),
    clearApiError: vi.fn((scope: string) => ({ type: 'MOCK/CLEAR_API_ERROR', payload: scope })),
  };
  return { ...mocked, default: mocked };
});

import { mapDispatchToProps } from './auto_follow_pattern_edit.container';
import {
  updateAutoFollowPattern,
  clearApiError,
  selectEditAutoFollowPattern,
  getAutoFollowPattern,
} from '../../store/actions';

const mockedUpdateAutoFollowPattern = vi.mocked(updateAutoFollowPattern);
const mockedClearApiError = vi.mocked(clearApiError);
const mockedSelectEditAutoFollowPattern = vi.mocked(selectEditAutoFollowPattern);
const mockedGetAutoFollowPattern = vi.mocked(getAutoFollowPattern);

describe('auto_follow_pattern_edit.container mapDispatchToProps', () => {
  const dispatch = vi.fn();

  beforeEach(() => {
    dispatch.mockClear();
    mockedUpdateAutoFollowPattern.mockClear();
    mockedClearApiError.mockClear();
    mockedSelectEditAutoFollowPattern.mockClear();
    mockedGetAutoFollowPattern.mockClear();
  });

  describe('updateAutoFollowPattern', () => {
    it('should strip unknown fields from the update payload (defense-in-depth against strict backend schema)', () => {
      const actions = mapDispatchToProps(dispatch);

      // Upstream sources of the pattern object (selectors, reducers, caller
      // code) may include extra fields such as `name` or `errors`. The backend
      // update route rejects unknown fields via
      // `schema.object({...}).unknowns: 'forbid'` (default), so the container
      // must not forward anything outside the documented contract.
      const enrichedPayload = {
        active: true,
        remoteCluster: 'cluster-a',
        leaderIndexPatterns: ['logs-*'],
        followIndexPattern: 'replica-{{leader_index}}',
        name: 'should-not-leak',
        errors: ['should-not-leak'],
        unexpected: 42,
      } as unknown as Parameters<
        ReturnType<typeof mapDispatchToProps>['updateAutoFollowPattern']
      >[1];

      actions.updateAutoFollowPattern('my-pattern', enrichedPayload);

      expect(mockedUpdateAutoFollowPattern).toHaveBeenCalledTimes(1);
      expect(mockedUpdateAutoFollowPattern).toHaveBeenCalledWith('my-pattern', {
        active: true,
        remoteCluster: 'cluster-a',
        leaderIndexPatterns: ['logs-*'],
        followIndexPattern: 'replica-{{leader_index}}',
      });
    });
  });

  describe('clearApiError', () => {
    it('should clear both the -get and -save scopes', () => {
      const actions = mapDispatchToProps(dispatch);
      actions.clearApiError();

      const calledScopes = mockedClearApiError.mock.calls.map(([scope]) => scope);
      expect(calledScopes).toEqual(
        expect.arrayContaining(['autoFollowPattern-get', 'autoFollowPattern-save'])
      );
    });
  });
});
