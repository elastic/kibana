/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type {
  RemoteClusterPrivilege,
  SecurityLicenseFeatures,
} from '@kbn/security-plugin-types-common';
import { mountWithIntl, shallowWithIntl } from '@kbn/test-jest-helpers';
import '@kbn/code-editor-mock/jest_helper';

import { RemoteClusterPrivileges } from './remote_cluster_privileges';
import { RemoteClusterPrivilegesForm } from './remote_cluster_privileges_form';
import { licenseMock } from '../../../../../../common/licensing/index.mock';
import { RoleValidator } from '../../validate_role';

test('it renders without crashing', async () => {
  const wrapper = shallowWithIntl(
    <KibanaContextProvider services={coreMock.createStart()}>
      <RemoteClusterPrivileges
        role={{
          name: '',
          kibana: [],
          elasticsearch: {
            cluster: [],
            remote_cluster: [
              {
                clusters: ['cluster1', 'cluster2'],
                privileges: ['monitor_enrich'],
              },
            ],
            indices: [],
            run_as: [],
          },
        }}
        onChange={jest.fn()}
        editable
        validator={new RoleValidator()}
        availableRemoteClusterPrivileges={['monitor_enrich']}
        license={licenseMock.create()}
      />
    </KibanaContextProvider>
  );

  expect(wrapper.children()).toMatchSnapshot();
});

test('it renders an RemoteClusterPrivilegesForm for each remote cluster privilege on the role', async () => {
  const wrapper = mountWithIntl(
    <KibanaContextProvider services={coreMock.createStart()}>
      <RemoteClusterPrivileges
        role={{
          name: '',
          kibana: [],
          elasticsearch: {
            cluster: [],
            remote_cluster: [
              {
                clusters: ['cluster1', 'cluster2'],
                privileges: ['monitor_enrich'],
              },
              {
                clusters: ['cluster3', 'cluster4'],
                privileges: ['monitor_enrich'],
              },
              {
                clusters: ['cluster5', 'cluster6'],
                privileges: ['monitor_enrich', 'monitor_stats'],
              },
            ],
            indices: [],
            run_as: [],
          },
        }}
        onChange={jest.fn()}
        editable
        validator={new RoleValidator()}
        availableRemoteClusterPrivileges={['monitor_enrich']}
        license={licenseMock.create()}
      />
    </KibanaContextProvider>
  );

  expect(wrapper.find(RemoteClusterPrivilegesForm)).toHaveLength(3);
});

test('it renders fields as disabled when not editable', async () => {
  const props = {
    role: {
      name: '',
      kibana: [],
      elasticsearch: {
        cluster: [],
        remote_cluster: [
          {
            clusters: ['cluster1', 'cluster2'],
            privileges: ['monitor_enrich'] as RemoteClusterPrivilege[],
          },
          {
            clusters: ['cluster3', 'cluster4'],
            privileges: ['monitor_enrich'] as RemoteClusterPrivilege[],
          },
        ],
        indices: [],
        run_as: [],
      },
    },
    onChange: jest.fn(),
    editable: false,
    validator: new RoleValidator(),
    availableRemoteClusterPrivileges: ['monitor_enrich'],
    license: licenseMock.create(),
  };
  const wrapper = mountWithIntl(
    <KibanaContextProvider services={coreMock.createStart()}>
      <RemoteClusterPrivileges {...props} />
    </KibanaContextProvider>
  );

  expect(
    wrapper
      .find('RemoteClusterPrivilegesForm')
      .everyWhere((component) => component.prop('isRoleReadOnly'))
  ).toBe(true);
});

test('it renders fields as disabled when `allowRemoteClusterPrivileges` is set to false', async () => {
  const license = licenseMock.create();

  license.getFeatures.mockReturnValue({
    allowRemoteClusterPrivileges: false,
  } as SecurityLicenseFeatures);

  const props = {
    role: {
      name: '',
      kibana: [],
      elasticsearch: {
        cluster: [],
        remote_cluster: [
          {
            clusters: ['cluster1', 'cluster2'],
            privileges: ['monitor_enrich'] as RemoteClusterPrivilege[],
          },
          {
            clusters: ['cluster3', 'cluster4'],
            privileges: ['monitor_enrich'] as RemoteClusterPrivilege[],
          },
        ],
        indices: [],
        run_as: [],
      },
    },
    onChange: jest.fn(),
    editable: false,
    validator: new RoleValidator(),
    availableRemoteClusterPrivileges: ['monitor_enrich'],
    license: licenseMock.create(),
  };
  const wrapper = mountWithIntl(
    <KibanaContextProvider services={coreMock.createStart()}>
      <RemoteClusterPrivileges {...props} />
    </KibanaContextProvider>
  );

  expect(
    wrapper
      .find('RemoteClusterPrivilegesForm')
      .everyWhere((component) => component.prop('isRoleReadOnly'))
  ).toBe(true);
});
