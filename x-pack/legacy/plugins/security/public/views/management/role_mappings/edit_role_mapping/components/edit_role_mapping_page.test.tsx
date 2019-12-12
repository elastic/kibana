/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mountWithIntl, nextTick } from 'test_utils/enzyme_helpers';
import { findTestSubject } from 'test_utils/find_test_subject';

// brace/ace uses the Worker class, which is not currently provided by JSDOM.
// This is not required for the tests to pass, but it rather suppresses lengthy
// warnings in the console which adds unnecessary noise to the test output.
import 'test_utils/stub_web_worker';

import { RoleMappingsAPI } from '../../../../../lib/role_mappings_api';
import { EditRoleMappingPage } from '.';
import { NoCompatibleRealms, SectionLoading, PermissionDenied } from '../../components';
import { VisualRuleEditor } from './rule_editor_panel/visual_rule_editor';
import { AdvancedRuleEditor } from './rule_editor_panel/advanced_rule_editor';

jest.mock('../../../../../lib/roles_api', () => {
  return {
    RolesApi: {
      getRoles: () => Promise.resolve([{ name: 'foo_role' }, { name: 'bar role' }]),
    },
  };
});

describe('EditRoleMappingPage', () => {
  // Omitting basic create/update/delete tests as they are covered in the functional test suite.

  it('renders a permission denied message when unauthorized to manage role mappings', async () => {
    const roleMappingsAPI = ({
      getRoleMappingFeatures: jest.fn().mockResolvedValue({
        canManageRoleMappings: false,
        hasCompatibleRealms: true,
      }),
    } as unknown) as RoleMappingsAPI;

    const wrapper = mountWithIntl(<EditRoleMappingPage roleMappingsAPI={roleMappingsAPI} />);
    expect(wrapper.find(SectionLoading)).toHaveLength(1);
    expect(wrapper.find(PermissionDenied)).toHaveLength(0);

    await nextTick();
    wrapper.update();

    expect(wrapper.find(SectionLoading)).toHaveLength(0);
    expect(wrapper.find(NoCompatibleRealms)).toHaveLength(0);
    expect(wrapper.find(PermissionDenied)).toHaveLength(1);
  });

  it('renders a warning when there are no compatible realms enabled', async () => {
    const roleMappingsAPI = ({
      getRoleMappingFeatures: jest.fn().mockResolvedValue({
        canManageRoleMappings: true,
        hasCompatibleRealms: false,
      }),
    } as unknown) as RoleMappingsAPI;

    const wrapper = mountWithIntl(<EditRoleMappingPage roleMappingsAPI={roleMappingsAPI} />);
    expect(wrapper.find(SectionLoading)).toHaveLength(1);
    expect(wrapper.find(NoCompatibleRealms)).toHaveLength(0);

    await nextTick();
    wrapper.update();

    expect(wrapper.find(SectionLoading)).toHaveLength(0);
    expect(wrapper.find(NoCompatibleRealms)).toHaveLength(1);
  });

  it('renders a warning when editing a mapping with a stored role template, when stored scripts are disabled', async () => {
    const roleMappingsAPI = ({
      getRoleMapping: jest.fn().mockResolvedValue({
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
      }),
      getRoleMappingFeatures: jest.fn().mockResolvedValue({
        canManageRoleMappings: true,
        hasCompatibleRealms: true,
        canUseInlineScripts: true,
        canUseStoredScripts: false,
      }),
    } as unknown) as RoleMappingsAPI;

    const wrapper = mountWithIntl(
      <EditRoleMappingPage name={'foo'} roleMappingsAPI={roleMappingsAPI} />
    );

    expect(findTestSubject(wrapper, 'roleMappingInlineScriptsDisabled')).toHaveLength(0);
    expect(findTestSubject(wrapper, 'roleMappingStoredScriptsDisabled')).toHaveLength(0);

    await nextTick();
    wrapper.update();

    expect(findTestSubject(wrapper, 'roleMappingInlineScriptsDisabled')).toHaveLength(0);
    expect(findTestSubject(wrapper, 'roleMappingStoredScriptsDisabled')).toHaveLength(1);
  });

  it('renders a warning when editing a mapping with an inline role template, when inline scripts are disabled', async () => {
    const roleMappingsAPI = ({
      getRoleMapping: jest.fn().mockResolvedValue({
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
      }),
      getRoleMappingFeatures: jest.fn().mockResolvedValue({
        canManageRoleMappings: true,
        hasCompatibleRealms: true,
        canUseInlineScripts: false,
        canUseStoredScripts: true,
      }),
    } as unknown) as RoleMappingsAPI;

    const wrapper = mountWithIntl(
      <EditRoleMappingPage name={'foo'} roleMappingsAPI={roleMappingsAPI} />
    );

    expect(findTestSubject(wrapper, 'roleMappingInlineScriptsDisabled')).toHaveLength(0);
    expect(findTestSubject(wrapper, 'roleMappingStoredScriptsDisabled')).toHaveLength(0);

    await nextTick();
    wrapper.update();

    expect(findTestSubject(wrapper, 'roleMappingInlineScriptsDisabled')).toHaveLength(1);
    expect(findTestSubject(wrapper, 'roleMappingStoredScriptsDisabled')).toHaveLength(0);
  });

  it('renders the visual editor by default for simple rule sets', async () => {
    const roleMappingsAPI = ({
      getRoleMapping: jest.fn().mockResolvedValue({
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
      }),
      getRoleMappingFeatures: jest.fn().mockResolvedValue({
        canManageRoleMappings: true,
        hasCompatibleRealms: true,
        canUseInlineScripts: true,
        canUseStoredScripts: true,
      }),
    } as unknown) as RoleMappingsAPI;

    const wrapper = mountWithIntl(
      <EditRoleMappingPage name={'foo'} roleMappingsAPI={roleMappingsAPI} />
    );

    await nextTick();
    wrapper.update();

    expect(wrapper.find(VisualRuleEditor)).toHaveLength(1);
    expect(wrapper.find(AdvancedRuleEditor)).toHaveLength(0);
  });

  it('renders the advanced editor by default for complex rule sets', async () => {
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

    const roleMappingsAPI = ({
      getRoleMapping: jest.fn().mockResolvedValue({
        name: 'foo',
        roles: ['superuser'],
        enabled: true,
        rules: createRule(10),
      }),
      getRoleMappingFeatures: jest.fn().mockResolvedValue({
        canManageRoleMappings: true,
        hasCompatibleRealms: true,
        canUseInlineScripts: true,
        canUseStoredScripts: true,
      }),
    } as unknown) as RoleMappingsAPI;

    const wrapper = mountWithIntl(
      <EditRoleMappingPage name={'foo'} roleMappingsAPI={roleMappingsAPI} />
    );

    await nextTick();
    wrapper.update();

    expect(wrapper.find(VisualRuleEditor)).toHaveLength(0);
    expect(wrapper.find(AdvancedRuleEditor)).toHaveLength(1);
  });
});
