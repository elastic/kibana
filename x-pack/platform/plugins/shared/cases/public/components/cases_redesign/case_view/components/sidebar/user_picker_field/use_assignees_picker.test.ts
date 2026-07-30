/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { userProfiles } from '../../../../../../containers/user_profiles/api.mock';
import { useAssigneesPicker } from './use_assignees_picker';

const currentUserProfile = userProfiles[0];

describe('useAssigneesPicker', () => {
  it('calls onAssigneesChanged when assign yourself is clicked', async () => {
    const onAssigneesChanged = jest.fn();

    const { result } = renderHook(() =>
      useAssigneesPicker({
        allAssignees: [],
        assigneesWithoutProfiles: [],
        currentUserProfile,
        onAssigneesChanged,
      })
    );

    act(() => {
      result.current.assignSelf();
    });

    await waitFor(() => {
      expect(onAssigneesChanged).toHaveBeenCalledTimes(1);
    });

    expect(onAssigneesChanged.mock.calls[0][0]).toEqual([currentUserProfile]);
  });

  it('calls onAssigneesChanged when the popover closes after users change', async () => {
    const onAssigneesChanged = jest.fn();

    const { result } = renderHook(() =>
      useAssigneesPicker({
        allAssignees: [],
        assigneesWithoutProfiles: [],
        currentUserProfile,
        onAssigneesChanged,
      })
    );

    act(() => {
      result.current.openPopover();
      result.current.onUsersChange([currentUserProfile]);
      result.current.onClosePopover();
    });

    await waitFor(() => {
      expect(onAssigneesChanged).toHaveBeenCalledTimes(1);
    });

    expect(onAssigneesChanged.mock.calls[0][0]).toEqual([currentUserProfile]);
  });

  it('does not call onAssigneesChanged when the popover closes without changes', async () => {
    const onAssigneesChanged = jest.fn();

    const { result } = renderHook(() =>
      useAssigneesPicker({
        allAssignees: [{ uid: currentUserProfile.uid }],
        assigneesWithoutProfiles: [],
        currentUserProfile,
        onAssigneesChanged,
      })
    );

    act(() => {
      result.current.openPopover();
      result.current.onClosePopover();
    });

    await waitFor(() => {
      expect(onAssigneesChanged).not.toHaveBeenCalled();
    });
  });

  it('preserves assignees without profiles when users are selected in the popover', async () => {
    const onAssigneesChanged = jest.fn();
    const unknownAssignee = { uid: 'unknownId1' };

    const { result } = renderHook(() =>
      useAssigneesPicker({
        allAssignees: [unknownAssignee],
        assigneesWithoutProfiles: [unknownAssignee],
        currentUserProfile,
        onAssigneesChanged,
      })
    );

    act(() => {
      result.current.openPopover();
      result.current.onUsersChange([currentUserProfile]);
      result.current.onClosePopover();
    });

    await waitFor(() => {
      expect(onAssigneesChanged).toHaveBeenCalledTimes(1);
    });

    expect(onAssigneesChanged.mock.calls[0][0]).toEqual([currentUserProfile, unknownAssignee]);
  });
});
