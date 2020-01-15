/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mountWithIntl, nextTick } from 'test_utils/enzyme_helpers';
import { DeleteProvider } from '.';
import { RoleMappingsAPI } from '../../../../../lib/role_mappings_api';
import { RoleMapping } from '../../../../../../common/model';
import { EuiConfirmModal } from '@elastic/eui';
import { findTestSubject } from 'test_utils/find_test_subject';
import { act } from '@testing-library/react';
import { toastNotifications } from 'ui/notify';

jest.mock('ui/notify', () => {
  return {
    toastNotifications: {
      addError: jest.fn(),
      addSuccess: jest.fn(),
      addDanger: jest.fn(),
    },
  };
});

describe('DeleteProvider', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('allows a single role mapping to be deleted', async () => {
    const props = {
      roleMappingsAPI: ({
        deleteRoleMappings: jest.fn().mockReturnValue(
          Promise.resolve([
            {
              name: 'delete-me',
              success: true,
            },
          ])
        ),
      } as unknown) as RoleMappingsAPI,
    };

    const roleMappingsToDelete = [
      {
        name: 'delete-me',
      },
    ] as RoleMapping[];

    const onSuccess = jest.fn();

    const wrapper = mountWithIntl(
      <DeleteProvider {...props}>
        {onDelete => (
          <button id="invoker" onClick={() => act(() => onDelete(roleMappingsToDelete, onSuccess))}>
            initiate delete
          </button>
        )}
      </DeleteProvider>
    );

    await act(async () => {
      wrapper.find('#invoker').simulate('click');
      await nextTick();
      wrapper.update();
    });

    const { title, confirmButtonText } = wrapper.find(EuiConfirmModal).props();
    expect(title).toMatchInlineSnapshot(`"Delete role mapping 'delete-me'?"`);
    expect(confirmButtonText).toMatchInlineSnapshot(`"Delete role mapping"`);

    await act(async () => {
      findTestSubject(wrapper, 'confirmModalConfirmButton').simulate('click');
      await nextTick();
      wrapper.update();
    });

    expect(props.roleMappingsAPI.deleteRoleMappings).toHaveBeenCalledWith(['delete-me']);

    const notifications = toastNotifications as jest.Mocked<typeof toastNotifications>;
    expect(notifications.addError).toHaveBeenCalledTimes(0);
    expect(notifications.addDanger).toHaveBeenCalledTimes(0);
    expect(notifications.addSuccess).toHaveBeenCalledTimes(1);
    expect(notifications.addSuccess.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "data-test-subj": "deletedRoleMappingSuccessToast",
          "title": "Deleted role mapping 'delete-me'",
        },
      ]
    `);
  });

  it('allows multiple role mappings to be deleted', async () => {
    const props = {
      roleMappingsAPI: ({
        deleteRoleMappings: jest.fn().mockReturnValue(
          Promise.resolve([
            {
              name: 'delete-me',
              success: true,
            },
            {
              name: 'delete-me-too',
              success: true,
            },
          ])
        ),
      } as unknown) as RoleMappingsAPI,
    };

    const roleMappingsToDelete = [
      {
        name: 'delete-me',
      },
      {
        name: 'delete-me-too',
      },
    ] as RoleMapping[];

    const onSuccess = jest.fn();

    const wrapper = mountWithIntl(
      <DeleteProvider {...props}>
        {onDelete => (
          <button id="invoker" onClick={() => act(() => onDelete(roleMappingsToDelete, onSuccess))}>
            initiate delete
          </button>
        )}
      </DeleteProvider>
    );

    await act(async () => {
      wrapper.find('#invoker').simulate('click');
      await nextTick();
      wrapper.update();
    });

    const { title, confirmButtonText } = wrapper.find(EuiConfirmModal).props();
    expect(title).toMatchInlineSnapshot(`"Delete 2 role mappings?"`);
    expect(confirmButtonText).toMatchInlineSnapshot(`"Delete role mappings"`);

    await act(async () => {
      findTestSubject(wrapper, 'confirmModalConfirmButton').simulate('click');
      await nextTick();
      wrapper.update();
    });

    expect(props.roleMappingsAPI.deleteRoleMappings).toHaveBeenCalledWith([
      'delete-me',
      'delete-me-too',
    ]);
    const notifications = toastNotifications as jest.Mocked<typeof toastNotifications>;
    expect(notifications.addError).toHaveBeenCalledTimes(0);
    expect(notifications.addDanger).toHaveBeenCalledTimes(0);
    expect(notifications.addSuccess).toHaveBeenCalledTimes(1);
    expect(notifications.addSuccess.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "data-test-subj": "deletedRoleMappingSuccessToast",
          "title": "Deleted 2 role mappings",
        },
      ]
    `);
  });

  it('handles mixed success/failure conditions', async () => {
    const props = {
      roleMappingsAPI: ({
        deleteRoleMappings: jest.fn().mockReturnValue(
          Promise.resolve([
            {
              name: 'delete-me',
              success: true,
            },
            {
              name: 'i-wont-work',
              success: false,
              error: new Error('something went wrong. sad.'),
            },
          ])
        ),
      } as unknown) as RoleMappingsAPI,
    };

    const roleMappingsToDelete = [
      {
        name: 'delete-me',
      },
      {
        name: 'i-wont-work',
      },
    ] as RoleMapping[];

    const onSuccess = jest.fn();

    const wrapper = mountWithIntl(
      <DeleteProvider {...props}>
        {onDelete => (
          <button id="invoker" onClick={() => act(() => onDelete(roleMappingsToDelete, onSuccess))}>
            initiate delete
          </button>
        )}
      </DeleteProvider>
    );

    await act(async () => {
      wrapper.find('#invoker').simulate('click');
      await nextTick();
      wrapper.update();
    });

    await act(async () => {
      findTestSubject(wrapper, 'confirmModalConfirmButton').simulate('click');
      await nextTick();
      wrapper.update();
    });

    expect(props.roleMappingsAPI.deleteRoleMappings).toHaveBeenCalledWith([
      'delete-me',
      'i-wont-work',
    ]);

    const notifications = toastNotifications as jest.Mocked<typeof toastNotifications>;
    expect(notifications.addError).toHaveBeenCalledTimes(0);
    expect(notifications.addSuccess).toHaveBeenCalledTimes(1);
    expect(notifications.addSuccess.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "data-test-subj": "deletedRoleMappingSuccessToast",
          "title": "Deleted role mapping 'delete-me'",
        },
      ]
    `);

    expect(notifications.addDanger).toHaveBeenCalledTimes(1);
    expect(notifications.addDanger.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "Error deleting role mapping 'i-wont-work'",
      ]
    `);
  });

  it('handles errors calling the API', async () => {
    const props = {
      roleMappingsAPI: ({
        deleteRoleMappings: jest.fn().mockImplementation(() => {
          throw new Error('AHHHHH');
        }),
      } as unknown) as RoleMappingsAPI,
    };

    const roleMappingsToDelete = [
      {
        name: 'delete-me',
      },
    ] as RoleMapping[];

    const onSuccess = jest.fn();

    const wrapper = mountWithIntl(
      <DeleteProvider {...props}>
        {onDelete => (
          <button id="invoker" onClick={() => act(() => onDelete(roleMappingsToDelete, onSuccess))}>
            initiate delete
          </button>
        )}
      </DeleteProvider>
    );

    await act(async () => {
      wrapper.find('#invoker').simulate('click');
      await nextTick();
      wrapper.update();
    });

    await act(async () => {
      findTestSubject(wrapper, 'confirmModalConfirmButton').simulate('click');
      await nextTick();
      wrapper.update();
    });

    expect(props.roleMappingsAPI.deleteRoleMappings).toHaveBeenCalledWith(['delete-me']);

    const notifications = toastNotifications as jest.Mocked<typeof toastNotifications>;
    expect(notifications.addDanger).toHaveBeenCalledTimes(0);
    expect(notifications.addSuccess).toHaveBeenCalledTimes(0);

    expect(notifications.addError).toHaveBeenCalledTimes(1);
    expect(notifications.addError.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        [Error: AHHHHH],
        Object {
          "title": "Error deleting role mappings",
        },
      ]
    `);
  });
});
