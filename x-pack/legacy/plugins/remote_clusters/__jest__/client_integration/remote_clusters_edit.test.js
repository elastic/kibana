/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RemoteClusterForm } from '../../public/app/sections/components/remote_cluster_form';
import { pageHelpers, setupEnvironment, nextTick } from './helpers';
import { REMOTE_CLUSTER_EDIT, REMOTE_CLUSTER_EDIT_NAME } from './helpers/constants';

const { setup } = pageHelpers.remoteClustersEdit;
const { setup: setupRemoteClustersAdd } = pageHelpers.remoteClustersAdd;

describe('Edit Remote cluster', () => {
  let server;
  let httpRequestsMockHelpers;
  let component;
  let find;
  let exists;

  beforeAll(() => {
    ({ server, httpRequestsMockHelpers } = setupEnvironment());
  });

  afterAll(() => {
    server.restore();
  });

  beforeEach(async () => {
    httpRequestsMockHelpers.setLoadRemoteClustersResponse([REMOTE_CLUSTER_EDIT]);

    ({ component, find, exists } = setup());
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
    const { component: addRemoteClusterComponent } = setupRemoteClustersAdd();

    await nextTick();
    addRemoteClusterComponent.update();

    const formEdit = component.find(RemoteClusterForm);
    const formAdd = addRemoteClusterComponent.find(RemoteClusterForm);

    expect(formEdit.length).toBe(1);
    expect(formAdd.length).toBe(1);
  });

  test('should populate the form fields with the values from the remote cluster loaded', () => {
    expect(find('remoteClusterFormNameInput').props().value).toBe(REMOTE_CLUSTER_EDIT_NAME);
    expect(find('remoteClusterFormSeedsInput').text()).toBe(REMOTE_CLUSTER_EDIT.seeds.join(''));
    expect(find('remoteClusterFormSkipUnavailableFormToggle').props().checked).toBe(
      REMOTE_CLUSTER_EDIT.skipUnavailable
    );
  });

  test('should disable the form name input', () => {
    expect(find('remoteClusterFormNameInput').props().disabled).toBe(true);
  });
});
