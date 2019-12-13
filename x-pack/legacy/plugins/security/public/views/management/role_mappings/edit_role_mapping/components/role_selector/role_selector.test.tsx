/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { findTestSubject } from 'test_utils/find_test_subject';
import { EuiComboBox } from '@elastic/eui';
import { RoleSelector } from './role_selector';
import { RoleMapping } from '../../../../../../../common/model';
import { RoleTemplateEditor } from './role_template_editor';
import { AddRoleTemplateButton } from './add_role_template_button';

jest.mock('../../../../../../lib/roles_api', () => {
  return {
    RolesApi: {
      getRoles: () => Promise.resolve([{ name: 'foo_role' }, { name: 'bar role' }]),
    },
  };
});

describe('RoleSelector', () => {
  it('allows roles to be selected, removing any previously selected role templates', () => {
    const props = {
      roleMapping: {
        roles: [] as string[],
        role_templates: [
          {
            template: { source: '' },
          },
        ],
      } as RoleMapping,
      canUseStoredScripts: true,
      canUseInlineScripts: true,
      onChange: jest.fn(),
      mode: 'roles',
    } as RoleSelector['props'];

    const wrapper = mountWithIntl(<RoleSelector {...props} />);
    (wrapper.find(EuiComboBox).props() as any).onChange([{ label: 'foo_role' }]);

    expect(props.onChange).toHaveBeenCalledWith({
      roles: ['foo_role'],
      role_templates: [],
    });
  });

  it('allows role templates to be created, removing any previously selected roles', () => {
    const props = {
      roleMapping: {
        roles: ['foo_role'],
        role_templates: [] as any,
      } as RoleMapping,
      canUseStoredScripts: true,
      canUseInlineScripts: true,
      onChange: jest.fn(),
      mode: 'templates',
    } as RoleSelector['props'];

    const wrapper = mountWithIntl(<RoleSelector {...props} />);

    wrapper.find(AddRoleTemplateButton).simulate('click');

    expect(props.onChange).toHaveBeenCalledWith({
      roles: [],
      role_templates: [
        {
          template: { source: '' },
        },
      ],
    });
  });

  it('allows role templates to be edited', () => {
    const props = {
      roleMapping: {
        roles: [] as string[],
        role_templates: [
          {
            template: { source: 'foo_role' },
          },
        ],
      } as RoleMapping,
      canUseStoredScripts: true,
      canUseInlineScripts: true,
      onChange: jest.fn(),
      mode: 'templates',
    } as RoleSelector['props'];

    const wrapper = mountWithIntl(<RoleSelector {...props} />);

    wrapper
      .find(RoleTemplateEditor)
      .props()
      .onChange({
        template: { source: '{{username}}_role' },
      });

    expect(props.onChange).toHaveBeenCalledWith({
      roles: [],
      role_templates: [
        {
          template: { source: '{{username}}_role' },
        },
      ],
    });
  });

  it('allows role templates to be deleted', () => {
    const props = {
      roleMapping: {
        roles: [] as string[],
        role_templates: [
          {
            template: { source: 'foo_role' },
          },
        ],
      } as RoleMapping,
      canUseStoredScripts: true,
      canUseInlineScripts: true,
      onChange: jest.fn(),
      mode: 'templates',
    } as RoleSelector['props'];

    const wrapper = mountWithIntl(<RoleSelector {...props} />);

    findTestSubject(wrapper, 'deleteRoleTemplateButton').simulate('click');

    expect(props.onChange).toHaveBeenCalledWith({
      roles: [],
      role_templates: [],
    });
  });
});
