/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';

import { initTestBed, nextTick, registerHttpRequestMockHelpers } from './test_helpers';
import { RemoteClusterEdit } from '../../public/sections/remote_cluster_edit';
import { RemoteClusterAdd } from '../../public/sections/remote_cluster_add';
import { RemoteClusterForm } from '../../public/sections/components/remote_cluster_form';
import { registerRouter } from '../../public/services/routing';

jest.mock('ui/chrome', () => ({
  addBasePath: (path) => path || '/api/remote_clusters',
  breadcrumbs: { set: () => {} },
}));

const REMOTE_CLUSTER_NAME = 'new-york';

const REMOTE_CLUSTER = {
  name: REMOTE_CLUSTER_NAME,
  seeds: ['localhost:9400'],
  skipUnavailable: true,
};

const testBedOptions = {
  memoryRouter: {
    onRouter: (router) => registerRouter(router),
    // The remote cluster name to edit is read from the router ":id" param
    // so we first set it in our initial entries
    initialEntries: [`/${REMOTE_CLUSTER_NAME}`],
    // and then we declarae the :id param on the component route path
    componentRoutePath: '/:name'
  }
};

describe('Edit Remote cluster', () => {
  let server;
  let component;
  let find;
  let exists;
  let setLoadRemoteClustersResponse;

  beforeEach(async () => {
    server = sinon.fakeServer.create();
    server.respondImmediately = true;

    // Register helpers to mock Http Requests
    ({
      setLoadRemoteClustersResponse,
    } = registerHttpRequestMockHelpers(server));

    // Set "default" mock responses by not providing any arguments
    setLoadRemoteClustersResponse([REMOTE_CLUSTER]);

    // Mock all HTTP Requests that have not been handled previously
    server.respondWith([200, {}, '']);

    ({ component, find, exists } = initTestBed(RemoteClusterEdit, undefined, testBedOptions));
    await nextTick();
    component.update();
  });

  test('should have the title of the page set correctly', () => {
    expect(exists('remoteClusterPageTitle')).toBe(true);
    expect(find('remoteClusterPageTitle').text()).toEqual('Edit remote cluster');
  });

  test('should have a link to the documentation', () => {
    expect(exists('remoteClusterDocsButton')).toBe(true);
  });

  /**
     * As the "edit" remote cluster component uses the same form underneath that
     * the "create" remote cluster, we won't test it again but simply make sure that
     * the form component is indeed shared between the 2 app sections.
     */
  test('should use the same Form component as the "<RemoteClusterEdit />" component', async () => {
    const { component: addRemoteClusterComponent } = initTestBed(RemoteClusterAdd, undefined, testBedOptions);

    await nextTick();
    addRemoteClusterComponent.update();

    const formEdit = component.find(RemoteClusterForm);
    const formAdd = addRemoteClusterComponent.find(RemoteClusterForm);

    expect(formEdit.length).toBe(1);
    expect(formAdd.length).toBe(1);
  });

  test('should populate the form fields with the values from the remote cluster loaded', () => {
    expect(find('remoteClusterFormNameInput').props().value).toBe(REMOTE_CLUSTER_NAME);
    expect(find('remoteClusterFormSeedsInput').text()).toBe(REMOTE_CLUSTER.seeds.join(''));
    expect(find('remoteClusterFormSkipUnavailableFormToggle').props().checked).toBe(REMOTE_CLUSTER.skipUnavailable);
  });

  test('should disable the form name input', () => {
    expect(find('remoteClusterFormNameInput').props().disabled).toBe(true);
  });
});
