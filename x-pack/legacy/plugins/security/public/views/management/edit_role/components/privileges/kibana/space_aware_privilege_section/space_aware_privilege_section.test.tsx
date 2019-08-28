/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mountWithIntl, shallowWithIntl } from 'test_utils/enzyme_helpers';
import { KibanaPrivileges } from '../../../../../../../../common/model';
import { KibanaPrivilegeCalculatorFactory } from '../../../../../../../lib/kibana_privilege_calculator';
import { RoleValidator } from '../../../../lib/validate_role';
import { PrivilegeMatrix } from './privilege_matrix';
import { PrivilegeSpaceForm } from './privilege_space_form';
import { PrivilegeSpaceTable } from './privilege_space_table';
import { SpaceAwarePrivilegeSection } from './space_aware_privilege_section';

const buildProps = (customProps: any = {}) => {
  return {
    role: {
      name: '',
      elasticsearch: {
        cluster: ['manage'],
        indices: [],
        run_as: [],
      },
      kibana: [],
    },
    spaces: [
      {
        id: 'default',
        name: 'Default Space',
        _reserved: true,
      },
      {
        id: 'marketing',
        name: 'Marketing',
      },
    ],
    uiCapabilities: {
      navLinks: {},
      spaces: {
        manage: true,
      },
    },
    features: [],
    editable: true,
    onChange: jest.fn(),
    validator: new RoleValidator(),
    privilegeCalculatorFactory: new KibanaPrivilegeCalculatorFactory(
      new KibanaPrivileges({
        features: {
          feature1: {
            all: ['*'],
            read: ['read'],
          },
        },
        global: {},
        space: {},
        reserved: {},
      })
    ),
    ...customProps,
  };
};

describe('<SpaceAwarePrivilegeSection>', () => {
  it('shows the space table if existing space privileges are declared', () => {
    const props = buildProps({
      role: {
        elasticsearch: {
          cluster: ['manage'],
        },
        kibana: [
          {
            spaces: ['default'],
            base: ['all'],
            feature: {},
          },
        ],
      },
    });

    const wrapper = mountWithIntl(<SpaceAwarePrivilegeSection.WrappedComponent {...props} />);

    const table = wrapper.find(PrivilegeSpaceTable);
    expect(table).toHaveLength(1);
  });

  it('hides the space table if there are no existing space privileges', () => {
    const props = buildProps();

    const wrapper = mountWithIntl(<SpaceAwarePrivilegeSection.WrappedComponent {...props} />);

    const table = wrapper.find(PrivilegeSpaceTable);
    expect(table).toHaveLength(0);
  });

  it('Renders flyout after clicking "Add a privilege" button', () => {
    const props = buildProps({
      role: {
        elasticsearch: {
          cluster: ['manage'],
        },
        kibana: [
          {
            spaces: ['default'],
            base: ['all'],
            feature: {},
          },
        ],
      },
    });

    const wrapper = mountWithIntl(<SpaceAwarePrivilegeSection.WrappedComponent {...props} />);
    expect(wrapper.find(PrivilegeSpaceForm)).toHaveLength(0);

    wrapper.find('button[data-test-subj="addSpacePrivilegeButton"]').simulate('click');

    expect(wrapper.find(PrivilegeSpaceForm)).toHaveLength(1);
  });

  it('hides privilege matrix when the role is reserved', () => {
    const props = buildProps({
      role: {
        name: '',
        metadata: {
          _reserved: true,
        },
        elasticsearch: {
          cluster: [],
          indices: [],
          run_as: [],
        },
        kibana: [],
      },
    });

    const wrapper = mountWithIntl(<SpaceAwarePrivilegeSection.WrappedComponent {...props} />);
    expect(wrapper.find(PrivilegeMatrix)).toHaveLength(0);
  });

  describe('with base privilege set to "read"', () => {
    it('allows space privileges to be customized', () => {
      const props = buildProps({
        role: {
          elasticsearch: {
            cluster: ['manage'],
          },
          kibana: [
            {
              spaces: ['default'],
              base: ['read'],
              feature: {},
            },
          ],
        },
      });

      const wrapper = mountWithIntl(<SpaceAwarePrivilegeSection.WrappedComponent {...props} />);

      const table = wrapper.find(PrivilegeSpaceTable);
      expect(table).toHaveLength(1);

      const addPrivilegeButton = wrapper.find('button[data-test-subj="addSpacePrivilegeButton"]');
      expect(addPrivilegeButton).toHaveLength(1);
    });
  });

  describe('with base privilege set to "none"', () => {
    it('allows space privileges to be customized', () => {
      const props = buildProps({
        role: {
          elasticsearch: {
            cluster: ['manage'],
          },
          kibana: [
            {
              spaces: ['default'],
              base: [],
              feature: {},
            },
          ],
        },
      });

      const wrapper = mountWithIntl(<SpaceAwarePrivilegeSection.WrappedComponent {...props} />);

      const table = wrapper.find(PrivilegeSpaceTable);
      expect(table).toHaveLength(1);

      const addPrivilegeButton = wrapper.find('button[data-test-subj="addSpacePrivilegeButton"]');
      expect(addPrivilegeButton).toHaveLength(1);
    });
  });

  describe('with user profile disabling "manageSpaces"', () => {
    it('renders a warning message instead of the privilege form', () => {
      const props = buildProps({
        uiCapabilities: {
          navLinks: {},
          spaces: { manage: false },
        },
      });

      const wrapper = shallowWithIntl(<SpaceAwarePrivilegeSection.WrappedComponent {...props} />);
      expect(wrapper).toMatchSnapshot();
    });
  });
});
