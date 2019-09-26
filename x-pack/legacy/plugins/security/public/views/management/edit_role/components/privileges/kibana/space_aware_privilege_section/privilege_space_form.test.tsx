/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { merge } from 'lodash';
// @ts-ignore
import { findTestSubject } from '@elastic/eui/lib/test';
import { shallowWithIntl, mountWithIntl } from 'test_utils/enzyme_helpers';
import { KibanaPrivileges } from '../../../../../../../../common/model';
import { KibanaPrivilegeCalculatorFactory } from '../../../../../../../lib/kibana_privilege_calculator';
import { PrivilegeSpaceForm } from './privilege_space_form';
import { rawKibanaPrivileges } from './__fixtures__';

type RecursivePartial<T> = {
  [P in keyof T]?: RecursivePartial<T[P]>;
};

const buildProps = (
  overrides?: RecursivePartial<PrivilegeSpaceForm['props']>
): PrivilegeSpaceForm['props'] => {
  const kibanaPrivileges = new KibanaPrivileges(rawKibanaPrivileges);
  const defaultProps: PrivilegeSpaceForm['props'] = {
    spaces: [
      {
        id: 'default',
        name: 'Default Space',
        description: '',
        disabledFeatures: [],
        _reserved: true,
      },
      {
        id: 'marketing',
        name: 'Marketing',
        description: '',
        disabledFeatures: [],
      },
    ],
    kibanaPrivileges,
    privilegeCalculatorFactory: new KibanaPrivilegeCalculatorFactory(kibanaPrivileges),
    features: [],
    role: {
      name: 'test role',
      elasticsearch: {
        cluster: ['all'],
        indices: [] as any[],
        run_as: [] as string[],
      },
      kibana: [{ spaces: [], base: [], feature: {} }],
    },
    onChange: jest.fn(),
    onCancel: jest.fn(),
    intl: {} as any,
    editingIndex: 0,
  };
  return merge(defaultProps, overrides || {});
};

describe('<PrivilegeSpaceForm>', () => {
  it('renders without crashing', () => {
    expect(shallowWithIntl(<PrivilegeSpaceForm {...buildProps()} />)).toMatchSnapshot();
  });

  it(`defaults to "Custom" for new global entries`, () => {
    const props = buildProps({
      role: {
        kibana: [
          {
            spaces: ['*'],
            base: [],
            feature: {},
          },
        ],
      },
      editingIndex: 0,
    });
    const component = mountWithIntl(<PrivilegeSpaceForm {...props} />);
    const basePrivilegeComboBox = findTestSubject(component, `basePrivilegeComboBox`);
    expect(basePrivilegeComboBox.text()).toBe('Custom');
  });

  it(`defaults to "Custom" for new space entries`, () => {
    const props = buildProps({
      role: {
        kibana: [
          {
            spaces: ['space:default'],
            base: [],
            feature: {},
          },
        ],
      },
      editingIndex: 0,
    });
    const component = mountWithIntl(<PrivilegeSpaceForm {...props} />);
    const basePrivilegeComboBox = findTestSubject(component, `basePrivilegeComboBox`);
    expect(basePrivilegeComboBox.text()).toBe('Custom');
  });

  describe('when an existing global all privilege', () => {
    it(`defaults to "Custom" for new entries`, () => {
      const props = buildProps({
        role: {
          kibana: [
            {
              spaces: ['*'],
              base: ['all'],
              feature: {},
            },
            {
              spaces: ['default'],
              base: [],
              feature: {},
            },
          ],
        },
        editingIndex: 1,
      });
      const component = mountWithIntl(<PrivilegeSpaceForm {...props} />);
      const basePrivilegeComboBox = findTestSubject(component, `basePrivilegeComboBox`);
      expect(basePrivilegeComboBox.text()).toBe('Custom');
    });
  });
});
