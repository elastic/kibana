/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mountWithIntl, nextTick } from 'test_utils/enzyme_helpers';
import { findTestSubject } from 'test_utils/find_test_subject';
import { RoleMappingApi } from '../../../../../lib/role_mapping_api';
import { EditRoleMappingPage } from '.';
import { NoCompatibleRealms, SectionLoading, PermissionDenied } from '../../components';
import { VisualRuleEditor } from './rule_editor/visual_rule_editor';
import { AdvancedRuleEditor } from './rule_editor/advanced_rule_editor';

jest.mock('../../../../../lib/roles_api', () => {
  return {
    RolesApi: {
      getRoles: () => Promise.resolve([{ name: 'foo_role' }, { name: 'bar role' }]),
    },
  };
});
jest.mock('../../../../../lib/role_mapping_api', () => {
  return {
    RoleMappingApi: {
      getRoleMapping: jest.fn(),
      saveRoleMapping: jest.fn(),
      getRoleMappingFeatures: jest.fn(),
    },
  };
});

describe('EditRoleMappingPage', () => {
  // Omitting basic create/update/delete tests as they are covered in the functional test suite.

  it('renders a permission denied message when unauthorized to manage role mappings', async () => {
    (RoleMappingApi as any).getRoleMappingFeatures.mockResolvedValue({
      canManageRoleMappings: false,
      hasCompatibleRealms: true,
    });

    const wrapper = mountWithIntl(<EditRoleMappingPage />);
    expect(wrapper.find(SectionLoading)).toHaveLength(1);
    expect(wrapper.find(PermissionDenied)).toHaveLength(0);

    await nextTick();
    wrapper.update();

    expect(wrapper.find(SectionLoading)).toHaveLength(0);
    expect(wrapper.find(NoCompatibleRealms)).toHaveLength(0);
    expect(wrapper.find(PermissionDenied)).toHaveLength(1);
  });

  it('renders a warning when there are no compatible realms enabled', async () => {
    (RoleMappingApi as any).getRoleMappingFeatures.mockResolvedValue({
      canManageRoleMappings: true,
      hasCompatibleRealms: false,
    });

    const wrapper = mountWithIntl(<EditRoleMappingPage />);
    expect(wrapper.find(SectionLoading)).toHaveLength(1);
    expect(wrapper.find(NoCompatibleRealms)).toHaveLength(0);

    await nextTick();
    wrapper.update();

    expect(wrapper.find(SectionLoading)).toHaveLength(0);
    expect(wrapper.find(NoCompatibleRealms)).toHaveLength(1);
  });

  it('renders a warning when editing a mapping with a stored role template, when stored scripts are disabled', async () => {
    (RoleMappingApi as any).getRoleMappingFeatures.mockResolvedValue({
      canManageRoleMappings: true,
      hasCompatibleRealms: true,
      canUseInlineScripts: true,
      canUseStoredScripts: false,
    });

    (RoleMappingApi as any).getRoleMapping.mockResolvedValue({
      name: 'foo',
      role_templates: [
        {
          template: { id: 'foo' },
        },
      ],
      enabled: true,
      rules: {
        field: { username: '*' },
      },
    });

    const wrapper = mountWithIntl(<EditRoleMappingPage name={'foo'} />);

    expect(findTestSubject(wrapper, 'roleMappingInlineScriptsDisabled')).toHaveLength(0);
    expect(findTestSubject(wrapper, 'roleMappingStoredScriptsDisabled')).toHaveLength(0);

    await nextTick();
    wrapper.update();

    expect(findTestSubject(wrapper, 'roleMappingInlineScriptsDisabled')).toHaveLength(0);
    expect(findTestSubject(wrapper, 'roleMappingStoredScriptsDisabled')).toHaveLength(1);
  });

  it('renders a warning when editing a mapping with an inline role template, when inline scripts are disabled', async () => {
    (RoleMappingApi as any).getRoleMappingFeatures.mockResolvedValue({
      canManageRoleMappings: true,
      hasCompatibleRealms: true,
      canUseInlineScripts: false,
      canUseStoredScripts: true,
    });

    (RoleMappingApi as any).getRoleMapping.mockResolvedValue({
      name: 'foo',
      role_templates: [
        {
          template: { source: 'foo' },
        },
      ],
      enabled: true,
      rules: {
        field: { username: '*' },
      },
    });

    const wrapper = mountWithIntl(<EditRoleMappingPage name={'foo'} />);

    expect(findTestSubject(wrapper, 'roleMappingInlineScriptsDisabled')).toHaveLength(0);
    expect(findTestSubject(wrapper, 'roleMappingStoredScriptsDisabled')).toHaveLength(0);

    await nextTick();
    wrapper.update();

    expect(findTestSubject(wrapper, 'roleMappingInlineScriptsDisabled')).toHaveLength(1);
    expect(findTestSubject(wrapper, 'roleMappingStoredScriptsDisabled')).toHaveLength(0);
  });

  it('renders the visual editor by default for simple rule sets', async () => {
    (RoleMappingApi as any).getRoleMappingFeatures.mockResolvedValue({
      canManageRoleMappings: true,
      hasCompatibleRealms: true,
      canUseInlineScripts: true,
      canUseStoredScripts: true,
    });

    (RoleMappingApi as any).getRoleMapping.mockResolvedValue({
      name: 'foo',
      roles: ['superuser'],
      enabled: true,
      rules: {
        all: [
          {
            field: {
              username: '*',
            },
          },
          {
            field: {
              dn: null,
            },
          },
          {
            field: {
              realm: ['ldap', 'pki', null, 12],
            },
          },
        ],
      },
    });

    const wrapper = mountWithIntl(<EditRoleMappingPage name={'foo'} />);

    await nextTick();
    wrapper.update();

    expect(wrapper.find(VisualRuleEditor)).toHaveLength(1);
    expect(wrapper.find(AdvancedRuleEditor)).toHaveLength(0);
  });

  it('renders the advanced editor by default for complex rule sets', async () => {
    (RoleMappingApi as any).getRoleMappingFeatures.mockResolvedValue({
      canManageRoleMappings: true,
      hasCompatibleRealms: true,
      canUseInlineScripts: true,
      canUseStoredScripts: true,
    });

    const createRule = (depth: number): Record<string, any> => {
      if (depth > 0) {
        const rule = {
          all: [
            {
              field: {
                username: '*',
              },
            },
          ],
        } as Record<string, any>;

        const subRule = createRule(depth - 1);
        if (subRule) {
          rule.all.push(subRule);
        }

        return rule;
      }
      return null as any;
    };

    (RoleMappingApi as any).getRoleMapping.mockResolvedValue({
      name: 'foo',
      roles: ['superuser'],
      enabled: true,
      rules: createRule(10),
    });

    const wrapper = mountWithIntl(<EditRoleMappingPage name={'foo'} />);

    await nextTick();
    wrapper.update();

    expect(wrapper.find(VisualRuleEditor)).toHaveLength(0);
    expect(wrapper.find(AdvancedRuleEditor)).toHaveLength(1);
  });
});
