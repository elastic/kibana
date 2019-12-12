/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mountWithIntl, nextTick } from 'test_utils/enzyme_helpers';
import { RoleMappingsGridPage } from '.';
import { SectionLoading, PermissionDenied, NoCompatibleRealms } from '../../components';
import { EmptyPrompt } from './empty_prompt';
import { findTestSubject } from 'test_utils/find_test_subject';
import { EuiLink } from '@elastic/eui';
import { RoleMappingsAPI } from '../../../../../lib/role_mappings_api';

describe('RoleMappingsGridPage', () => {
  it('renders an empty prompt when no role mappings exist', async () => {
    const roleMappingsAPI = ({
      getRoleMappings: jest.fn().mockResolvedValue([]),
      getRoleMappingFeatures: jest.fn().mockResolvedValue({
        canManageRoleMappings: true,
        hasCompatibleRealms: true,
      }),
    } as unknown) as RoleMappingsAPI;

    const wrapper = mountWithIntl(<RoleMappingsGridPage roleMappingsAPI={roleMappingsAPI} />);
    expect(wrapper.find(SectionLoading)).toHaveLength(1);
    expect(wrapper.find(EmptyPrompt)).toHaveLength(0);

    await nextTick();
    wrapper.update();

    expect(wrapper.find(SectionLoading)).toHaveLength(0);
    expect(wrapper.find(NoCompatibleRealms)).toHaveLength(0);
    expect(wrapper.find(EmptyPrompt)).toHaveLength(1);
  });

  it('renders a permission denied message when unauthorized to manage role mappings', async () => {
    const roleMappingsAPI = ({
      getRoleMappingFeatures: jest.fn().mockResolvedValue({
        canManageRoleMappings: false,
        hasCompatibleRealms: true,
      }),
    } as unknown) as RoleMappingsAPI;

    const wrapper = mountWithIntl(<RoleMappingsGridPage roleMappingsAPI={roleMappingsAPI} />);
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
      getRoleMappings: jest.fn().mockResolvedValue([
        {
          name: 'some realm',
          enabled: true,
          roles: [],
          rules: { field: { username: '*' } },
        },
      ]),
      getRoleMappingFeatures: jest.fn().mockResolvedValue({
        canManageRoleMappings: true,
        hasCompatibleRealms: false,
      }),
    } as unknown) as RoleMappingsAPI;

    const wrapper = mountWithIntl(<RoleMappingsGridPage roleMappingsAPI={roleMappingsAPI} />);
    expect(wrapper.find(SectionLoading)).toHaveLength(1);
    expect(wrapper.find(NoCompatibleRealms)).toHaveLength(0);

    await nextTick();
    wrapper.update();

    expect(wrapper.find(SectionLoading)).toHaveLength(0);
    expect(wrapper.find(NoCompatibleRealms)).toHaveLength(1);
  });

  it('renders links to mapped roles', async () => {
    const roleMappingsAPI = ({
      getRoleMappings: jest.fn().mockResolvedValue([
        {
          name: 'some realm',
          enabled: true,
          roles: ['superuser'],
          rules: { field: { username: '*' } },
        },
      ]),
      getRoleMappingFeatures: jest.fn().mockResolvedValue({
        canManageRoleMappings: true,
        hasCompatibleRealms: true,
      }),
    } as unknown) as RoleMappingsAPI;

    const wrapper = mountWithIntl(<RoleMappingsGridPage roleMappingsAPI={roleMappingsAPI} />);
    await nextTick();
    wrapper.update();

    const links = findTestSubject(wrapper, 'roleMappingRoles').find(EuiLink);
    expect(links).toHaveLength(1);
    expect(links.at(0).props()).toMatchObject({
      href: '#/management/security/roles/edit/superuser',
    });
  });

  it('describes the number of mapped role templates', async () => {
    const roleMappingsAPI = ({
      getRoleMappings: jest.fn().mockResolvedValue([
        {
          name: 'some realm',
          enabled: true,
          role_templates: [{}, {}],
          rules: { field: { username: '*' } },
        },
      ]),
      getRoleMappingFeatures: jest.fn().mockResolvedValue({
        canManageRoleMappings: true,
        hasCompatibleRealms: true,
      }),
    } as unknown) as RoleMappingsAPI;

    const wrapper = mountWithIntl(<RoleMappingsGridPage roleMappingsAPI={roleMappingsAPI} />);
    await nextTick();
    wrapper.update();

    const templates = findTestSubject(wrapper, 'roleMappingRoles');
    expect(templates).toHaveLength(1);
    expect(templates.text()).toEqual(`2 role templates defined`);
  });
});
