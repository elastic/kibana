/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

let mockSimulate403 = false;
const mock403 = () => ({ body: { statusCode: 403 } });
jest.mock('../../../../lib/roles_api', () => {
  return {
    RolesApi: {
      async getRoles() {
        if (mockSimulate403) {
          throw mock403();
        }
        return [
          {
            name: 'test-role-1',
            elasticsearch: { cluster: [], indices: [], run_as: [] },
            kibana: { global: [], space: {} },
          },
          {
            name: 'reserved-role',
            elasticsearch: { cluster: [], indices: [], run_as: [] },
            kibana: { global: [], space: {} },
            metadata: {
              _reserved: true,
            },
          },
          {
            name: 'disabled-role',
            elasticsearch: { cluster: [], indices: [], run_as: [] },
            kibana: { global: [], space: {} },
            transient_metadata: {
              enabled: false,
            },
          },
        ];
      },
    },
  };
});

import { EuiIcon } from '@elastic/eui';
import { ReactWrapper } from 'enzyme';
import React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { PermissionDenied } from './permission_denied';
import { RolesGridPage } from './roles_grid_page';

const waitForRender = async (
  wrapper: ReactWrapper<any>,
  condition: (wrapper: ReactWrapper<any>) => boolean
) => {
  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      await Promise.resolve();
      wrapper.update();
      if (condition(wrapper)) {
        resolve();
      }
    }, 10);

    setTimeout(() => {
      clearInterval(interval);
      reject(new Error('waitForRender timeout after 2000ms'));
    }, 2000);
  });
};

describe('<RolesGridPage />', () => {
  beforeEach(() => {
    mockSimulate403 = false;
  });

  it(`renders reserved roles as such`, async () => {
    const wrapper = mountWithIntl(<RolesGridPage />);
    const initialIconCount = wrapper.find(EuiIcon).length;

    await waitForRender(wrapper, updatedWrapper => {
      return updatedWrapper.find(EuiIcon).length > initialIconCount;
    });

    expect(wrapper.find(PermissionDenied)).toHaveLength(0);
    expect(wrapper.find('EuiIcon[data-test-subj="reservedRole"]')).toHaveLength(1);
    expect(wrapper.find('EuiCheckbox[title="Role is reserved"]')).toHaveLength(1);
  });

  it('renders permission denied if required', async () => {
    mockSimulate403 = true;
    const wrapper = mountWithIntl(<RolesGridPage />);
    await waitForRender(wrapper, updatedWrapper => {
      return updatedWrapper.find(PermissionDenied).length > 0;
    });
    expect(wrapper.find(PermissionDenied)).toMatchSnapshot();
  });

  it('renders role actions as appropriate', async () => {
    const wrapper = mountWithIntl(<RolesGridPage />);
    const initialIconCount = wrapper.find(EuiIcon).length;

    await waitForRender(wrapper, updatedWrapper => {
      return updatedWrapper.find(EuiIcon).length > initialIconCount;
    });

    expect(wrapper.find(PermissionDenied)).toHaveLength(0);
    expect(
      wrapper.find('EuiButtonIcon[data-test-subj="edit-role-action-test-role-1"]')
    ).toHaveLength(1);
    expect(
      wrapper.find('EuiButtonIcon[data-test-subj="edit-role-action-disabled-role"]')
    ).toHaveLength(1);

    expect(
      wrapper.find('EuiButtonIcon[data-test-subj="clone-role-action-test-role-1"]')
    ).toHaveLength(1);
    expect(
      wrapper.find('EuiButtonIcon[data-test-subj="clone-role-action-disabled-role"]')
    ).toHaveLength(1);
  });
});
