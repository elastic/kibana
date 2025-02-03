/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useToasts, useKibana } from '../../common/lib/kibana';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import * as api from './api';
import { useBulkGetUserProfiles } from './use_bulk_get_user_profiles';
import { userProfilesIds } from './api.mock';
import { createStartServicesMock } from '../../common/lib/kibana/kibana_react.mock';

jest.mock('../../common/lib/kibana');
jest.mock('./api');

const useKibanaMock = useKibana as jest.Mock;

// FLAKY: https://github.com/elastic/kibana/issues/176335
describe.skip('useBulkGetUserProfiles', () => {
  const props = {
    uids: userProfilesIds,
  };

  const addSuccess = jest.fn();
  (useToasts as jest.Mock).mockReturnValue({ addSuccess, addError: jest.fn() });

  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
    useKibanaMock.mockReturnValue({
      services: { ...createStartServicesMock() },
    });
  });

  it('calls bulkGetUserProfiles with correct arguments', async () => {
    const spyOnBulkGetUserProfiles = jest.spyOn(api, 'bulkGetUserProfiles');

    renderHook(() => useBulkGetUserProfiles(props), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitFor(() =>
      expect(spyOnBulkGetUserProfiles).toBeCalledWith({
        ...props,
        security: expect.anything(),
      })
    );
  });

  it('returns a mapping with user profiles', async () => {
    const { result } = renderHook(() => useBulkGetUserProfiles(props), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitFor(() =>
      expect(result.current.data).toMatchInlineSnapshot(`
      Map {
        "u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0" => Object {
          "data": Object {},
          "enabled": true,
          "uid": "u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0",
          "user": Object {
            "email": "damaged_raccoon@elastic.co",
            "full_name": "Damaged Raccoon",
            "username": "damaged_raccoon",
          },
        },
        "u_A_tM4n0wPkdiQ9smmd8o0Hr_h61XQfu8aRPh9GMoRoc_0" => Object {
          "data": Object {},
          "enabled": true,
          "uid": "u_A_tM4n0wPkdiQ9smmd8o0Hr_h61XQfu8aRPh9GMoRoc_0",
          "user": Object {
            "email": "physical_dinosaur@elastic.co",
            "full_name": "Physical Dinosaur",
            "username": "physical_dinosaur",
          },
        },
        "u_9xDEQqUqoYCnFnPPLq5mIRHKL8gBTo_NiKgOnd5gGk0_0" => Object {
          "data": Object {},
          "enabled": true,
          "uid": "u_9xDEQqUqoYCnFnPPLq5mIRHKL8gBTo_NiKgOnd5gGk0_0",
          "user": Object {
            "email": "wet_dingo@elastic.co",
            "full_name": "Wet Dingo",
            "username": "wet_dingo",
          },
        },
      }
    `)
    );
  });

  it('shows a toast error message when an error occurs in the response', async () => {
    const spyOnBulkGetUserProfiles = jest.spyOn(api, 'bulkGetUserProfiles');

    spyOnBulkGetUserProfiles.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    const addError = jest.fn();
    (useToasts as jest.Mock).mockReturnValue({ addSuccess, addError });

    renderHook(() => useBulkGetUserProfiles(props), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitFor(() => expect(addError).toHaveBeenCalled());
  });

  it('does not call the bulkGetUserProfiles if the array of uids is empty', async () => {
    const spyOnBulkGetUserProfiles = jest.spyOn(api, 'bulkGetUserProfiles');

    renderHook(() => useBulkGetUserProfiles({ uids: [] }), {
      wrapper: appMockRender.AppWrapper,
    });

    expect(spyOnBulkGetUserProfiles).not.toHaveBeenCalled();
  });
});
