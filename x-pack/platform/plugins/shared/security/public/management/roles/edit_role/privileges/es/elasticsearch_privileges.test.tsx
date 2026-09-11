/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { BuildFlavor } from '@kbn/config';
import { coreMock } from '@kbn/core/public/mocks';
import { shallowWithIntl } from '@kbn/test-jest-helpers';

import { ElasticsearchPrivileges } from './elasticsearch_privileges';
import { licenseMock } from '../../../../../../common/licensing/index.mock';
import { indicesAPIClientMock } from '../../../index.mock';
import { RoleValidator } from '../../validate_role';

function getProps() {
  const license = licenseMock.create();
  license.getFeatures.mockReturnValue({
    allowRoleFieldLevelSecurity: true,
    allowRoleDocumentLevelSecurity: true,
  } as any);

  const { docLinks } = coreMock.createStart();

  return {
    role: {
      name: '',
      elasticsearch: {
        cluster: [],
        remote_cluster: [],
        indices: [],
        run_as: [],
      },
      kibana: [],
    },
    editable: true,
    onChange: jest.fn(),
    runAsUsers: [],
    indexPatterns: [],
    validator: new RoleValidator(),
    builtinESPrivileges: {
      cluster: ['all', 'manage', 'monitor'],
      index: ['all', 'read', 'write', 'index'],
      remote_cluster: [],
    },
    indicesAPIClient: indicesAPIClientMock.create(),
    docLinks,
    license,
    buildFlavor: 'traditional' as BuildFlavor,
  };
}

test('it renders without crashing', () => {
  expect(shallowWithIntl(<ElasticsearchPrivileges {...getProps()} />)).toMatchSnapshot();
});

test('it renders ClusterPrivileges', () => {
  const wrapper = shallowWithIntl(<ElasticsearchPrivileges {...getProps()} />);
  expect(wrapper.find('ClusterPrivileges')).toHaveLength(1);
});

test('it renders index privileges section', () => {
  const wrapper = shallowWithIntl(<ElasticsearchPrivileges {...getProps()} />);
  expect(wrapper.find('IndexPrivileges[indexType="indices"]')).toHaveLength(1);
});

test('it does not render data source privileges section by default', () => {
  const wrapper = shallowWithIntl(<ElasticsearchPrivileges {...getProps()} />);
  expect(wrapper.find('DataSourcePrivileges')).toHaveLength(0);
});

test('it renders data source privileges section when `isDataFederationEnabled` is enabled', () => {
  const wrapper = shallowWithIntl(
    <ElasticsearchPrivileges {...getProps()} isDataFederationEnabled />
  );
  expect(wrapper.find('DataSourcePrivileges')).toHaveLength(1);
});

test('it preserves existing global.data_source when editing other fields while data federation is disabled', () => {
  const props = getProps();
  const roleWithDataSourcePrivileges = {
    ...props.role,
    elasticsearch: {
      ...props.role.elasticsearch,
      global: {
        application: { manage: { applications: ['kibana-*'] } },
        data_source: [{ names: ['acme_*'], privileges: ['read'] }],
      },
    },
  };

  const wrapper = shallowWithIntl(
    <ElasticsearchPrivileges {...props} role={roleWithDataSourcePrivileges as any} />
  );

  (wrapper.instance() as ElasticsearchPrivileges).onClusterPrivilegesChange(['monitor']);

  expect(props.onChange).toHaveBeenCalledWith({
    ...roleWithDataSourcePrivileges,
    elasticsearch: {
      ...roleWithDataSourcePrivileges.elasticsearch,
      cluster: ['monitor'],
    },
  });
});

test('addDataSourcePrivilege appends', () => {
  const props = getProps();
  const roleWithObjectGlobal = {
    ...props.role,
    elasticsearch: {
      ...props.role.elasticsearch,
      global: {
        application: { manage: { applications: ['kibana-*'] } },
        data_source: [{ names: ['acme_*'], privileges: ['read'] }],
      },
    },
  };

  const wrapper = shallowWithIntl(
    <ElasticsearchPrivileges
      {...props}
      role={roleWithObjectGlobal as any}
      isDataFederationEnabled
    />
  );

  (wrapper.find('DataSourcePrivileges').prop('onAdd') as unknown as () => void)();

  expect(props.onChange).toHaveBeenCalledWith({
    ...roleWithObjectGlobal,
    elasticsearch: {
      ...roleWithObjectGlobal.elasticsearch,
      global: {
        ...(roleWithObjectGlobal.elasticsearch.global as any),
        data_source: [
          { names: ['acme_*'], privileges: ['read'] },
          { names: [], privileges: [] },
        ],
      },
    },
  });
});

test('it does not render remote index privileges section by default', () => {
  const wrapper = shallowWithIntl(<ElasticsearchPrivileges {...getProps()} />);
  expect(wrapper.find('IndexPrivileges[indexType="remote_indices"]')).toHaveLength(0);
});

test('it renders remote index privileges section when `canUseRemoteIndices` is enabled', () => {
  const wrapper = shallowWithIntl(<ElasticsearchPrivileges {...getProps()} canUseRemoteIndices />);
  expect(wrapper.find('IndexPrivileges[indexType="remote_indices"]')).toHaveLength(1);
});

test('it does not render remote cluster privileges section by default', () => {
  const wrapper = shallowWithIntl(<ElasticsearchPrivileges {...getProps()} />);
  expect(wrapper.find('RemoteClusterPrivileges')).toHaveLength(0);
});

test('it renders remote index privileges section when `canUseRemoteClusters` is enabled', () => {
  const wrapper = shallowWithIntl(<ElasticsearchPrivileges {...getProps()} canUseRemoteClusters />);
  expect(wrapper.find('RemoteClusterPrivileges')).toHaveLength(1);
});

test('it renders fields as disabled when not editable', () => {
  const wrapper = shallowWithIntl(
    <ElasticsearchPrivileges {...getProps()} canUseRemoteClusters editable={false} />
  );
  expect(wrapper.find('EuiComboBox').prop('isDisabled')).toBe(true);
  expect(wrapper.find('ClusterPrivileges').prop('editable')).toBe(false);
  expect(
    wrapper.find('IndexPrivileges').everyWhere((component) => component.prop('editable'))
  ).toBe(false);
  expect(wrapper.find('RemoteClusterPrivileges').prop('editable')).toBe(false);
});

test('it renders correctly in serverless mode', () => {
  expect(
    shallowWithIntl(
      // Enabled remote indices privilege to make sure remote indices is still not rendered due to build flavor
      <ElasticsearchPrivileges
        {...getProps()}
        validator={new RoleValidator({ buildFlavor: 'serverless' })}
        buildFlavor={'serverless'}
        canUseRemoteIndices
      />
    )
  ).toMatchSnapshot();
});
