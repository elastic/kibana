/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// @ts-ignore
import { EuiButtonGroup, EuiButtonGroupProps, EuiComboBox, EuiSuperSelect } from '@elastic/eui';
import React from 'react';
import { mountWithIntl, shallowWithIntl } from 'test_utils/enzyme_helpers';
import { Feature } from '../../../../../../../../../../../plugins/features/public';
import { KibanaPrivileges, Role } from '../../../../../../../../common/model';
import { KibanaPrivilegeCalculatorFactory } from '../../../../../../../lib/kibana_privilege_calculator';
import { SimplePrivilegeSection } from './simple_privilege_section';
import { UnsupportedSpacePrivilegesWarning } from './unsupported_space_privileges_warning';

const buildProps = (customProps: any = {}) => {
  const kibanaPrivileges = new KibanaPrivileges({
    features: {
      feature1: {
        all: ['*'],
        read: ['read'],
      },
    },
    global: {},
    space: {},
    reserved: {},
  });

  const role = {
    name: '',
    elasticsearch: {
      cluster: ['manage'],
      indices: [],
      run_as: [],
    },
    kibana: [],
    ...customProps.role,
  };

  return {
    editable: true,
    kibanaPrivileges,
    privilegeCalculatorFactory: new KibanaPrivilegeCalculatorFactory(kibanaPrivileges),
    features: [
      {
        id: 'feature1',
        name: 'Feature 1',
        app: ['app'],
        privileges: {
          all: {
            app: ['app'],
            savedObject: {
              all: ['foo'],
              read: [],
            },
            ui: ['app-ui'],
          },
          read: {
            app: ['app'],
            savedObject: {
              all: [],
              read: [],
            },
            ui: ['app-ui'],
          },
        },
      },
    ] as Feature[],
    onChange: jest.fn(),
    ...customProps,
    role,
  };
};

describe('<SimplePrivilegeForm>', () => {
  it('renders without crashing', () => {
    expect(shallowWithIntl(<SimplePrivilegeSection {...buildProps()} />)).toMatchSnapshot();
  });

  it('displays "none" when no privilege is selected', () => {
    const props = buildProps();
    const wrapper = shallowWithIntl(<SimplePrivilegeSection {...props} />);
    const selector = wrapper.find(EuiSuperSelect);
    expect(selector.props()).toMatchObject({
      valueOfSelected: 'none',
    });
    expect(wrapper.find(UnsupportedSpacePrivilegesWarning)).toHaveLength(0);
  });

  it('displays "custom" when feature privileges are customized', () => {
    const props = buildProps({
      role: {
        elasticsearch: {},
        kibana: [
          {
            spaces: ['*'],
            base: [],
            feature: {
              feature1: ['foo'],
            },
          },
        ],
      },
    });
    const wrapper = shallowWithIntl(<SimplePrivilegeSection {...props} />);
    const selector = wrapper.find(EuiSuperSelect);
    expect(selector.props()).toMatchObject({
      valueOfSelected: 'custom',
    });
    expect(wrapper.find(UnsupportedSpacePrivilegesWarning)).toHaveLength(0);
  });

  it('displays the selected privilege', () => {
    const props = buildProps({
      role: {
        elasticsearch: {},
        kibana: [
          {
            spaces: ['*'],
            base: ['read'],
            feature: {},
          },
        ],
      },
    });
    const wrapper = shallowWithIntl(<SimplePrivilegeSection {...props} />);
    const selector = wrapper.find(EuiSuperSelect);
    expect(selector.props()).toMatchObject({
      valueOfSelected: 'read',
    });
    expect(wrapper.find(UnsupportedSpacePrivilegesWarning)).toHaveLength(0);
  });

  it('displays the reserved privilege', () => {
    const props = buildProps({
      role: {
        elasticsearch: {},
        kibana: [
          {
            spaces: ['*'],
            base: [],
            feature: {},
            _reserved: ['foo'],
          },
        ],
      },
    });
    const wrapper = shallowWithIntl(<SimplePrivilegeSection {...props} />);
    const selector = wrapper.find(EuiComboBox);
    expect(selector.props()).toMatchObject({
      isDisabled: true,
      selectedOptions: [{ label: 'foo' }],
    });
    expect(wrapper.find(UnsupportedSpacePrivilegesWarning)).toHaveLength(0);
  });

  it('fires its onChange callback when the privilege changes', () => {
    const props = buildProps();
    const wrapper = mountWithIntl(<SimplePrivilegeSection {...props} />);
    const selector = wrapper.find(EuiSuperSelect);
    (selector.props() as any).onChange('all');

    expect(props.onChange).toHaveBeenCalledWith({
      name: '',
      elasticsearch: {
        cluster: ['manage'],
        indices: [],
        run_as: [],
      },
      kibana: [{ feature: {}, base: ['all'], spaces: ['*'] }],
    });
    expect(wrapper.find(UnsupportedSpacePrivilegesWarning)).toHaveLength(0);
  });

  it('allows feature privileges to be customized', () => {
    const props = buildProps({
      onChange: (role: Role) => {
        wrapper.setProps({
          role,
        });
      },
    });
    const wrapper = mountWithIntl(<SimplePrivilegeSection {...props} />);
    const selector = wrapper.find(EuiSuperSelect);
    (selector.props() as any).onChange('custom');

    wrapper.update();

    const featurePrivilegeToggles = wrapper.find(EuiButtonGroup);
    expect(featurePrivilegeToggles).toHaveLength(1);
    expect(featurePrivilegeToggles.find('button')).toHaveLength(3);

    (featurePrivilegeToggles.props() as EuiButtonGroupProps).onChange('feature1_all', null);

    wrapper.update();

    expect(wrapper.props().role).toEqual({
      elasticsearch: {
        cluster: ['manage'],
        indices: [],
        run_as: [],
      },
      kibana: [
        {
          base: [],
          feature: {
            feature1: ['all'],
          },
          spaces: ['*'],
        },
      ],
      name: '',
    });

    expect(wrapper.find(UnsupportedSpacePrivilegesWarning)).toHaveLength(0);
  });

  it('renders a warning when space privileges are found', () => {
    const props = buildProps({
      role: {
        elasticsearch: {},
        kibana: [
          {
            spaces: ['*'],
            base: ['read'],
            feature: {},
          },
          {
            spaces: ['marketing'],
            base: ['read'],
            feature: {},
          },
        ],
      },
    });
    const wrapper = mountWithIntl(<SimplePrivilegeSection {...props} />);
    expect(wrapper.find(UnsupportedSpacePrivilegesWarning)).toHaveLength(1);
  });
});
