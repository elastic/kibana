/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from '@testing-library/react';
import { noop } from 'lodash';

import type { BuildFlavor } from '@kbn/config';
import { coreMock, scopedHistoryMock, themeServiceMock } from '@kbn/core/public/mocks';
import { featuresPluginMock } from '@kbn/features-plugin/public/mocks';
import type { Unmount } from '@kbn/management-plugin/public/types';

import type { Props as EditRolePageProps } from './edit_role/edit_role_page';
import type { Props as RolesGridPageProps } from './roles_grid/roles_grid_page';
import { rolesManagementApp } from './roles_management_app';
import { licenseMock } from '../../../common/licensing/index.mock';

jest.mock('./roles_grid', () => ({
  RolesGridPage: ({
    // props object is too big to include into test snapshot, so we just check for existence of fields we care about
    buildFlavor,
    cloudOrgUrl,
    readOnly,
    rolesAPIClient,
  }: RolesGridPageProps) =>
    `Roles Page: ${JSON.stringify(
      {
        buildFlavor,
        cloudOrgUrl,
        readOnly,
        rolesAPIClient: rolesAPIClient ? 'rolesAPIClient' : undefined,
      },
      null,
      '  '
    )}`,
}));

jest.mock('./edit_role', () => ({
  EditRolePage: ({
    // props object is too big to include into test snapshot, so we just check for existence of fields we care about
    buildFlavor,
    cloudOrgUrl,
    roleName,
    indicesAPIClient,
    privilegesAPIClient,
    rolesAPIClient,
    userAPIClient,
  }: EditRolePageProps) =>
    `Role Edit Page: ${JSON.stringify(
      {
        buildFlavor,
        cloudOrgUrl,
        roleName,
        indicesAPIClient: indicesAPIClient ? 'indicesAPIClient' : undefined,
        privilegesAPIClient: privilegesAPIClient ? 'privilegesAPIClient' : undefined,
        rolesAPIClient: rolesAPIClient ? 'rolesAPIClient' : undefined,
        userAPIClient: userAPIClient ? 'userAPIClient' : undefined,
      },
      null,
      '  '
    )}`,
}));

async function mountApp(basePath: string, pathname: string, buildFlavor?: BuildFlavor) {
  const { fatalErrors } = coreMock.createSetup();
  const container = document.createElement('div');
  const setBreadcrumbs = jest.fn();

  const featuresStart = featuresPluginMock.createStart();
  const coreStart = coreMock.createStart();
  coreStart.application.capabilities = {
    ...coreStart.application.capabilities,
    roles: {
      save: true,
    },
  };

  let unmount: Unmount = noop;
  await act(async () => {
    unmount = await rolesManagementApp
      .create({
        license: licenseMock.create(),
        fatalErrors,
        getStartServices: jest
          .fn()
          .mockResolvedValue([coreStart, { data: {}, features: featuresStart }]),
        buildFlavor: buildFlavor ?? 'traditional',
      })
      .mount({
        basePath,
        element: container,
        setBreadcrumbs,
        history: scopedHistoryMock.create({ pathname }),
        theme: coreStart.theme,
        theme$: themeServiceMock.createTheme$(), // needed as a deprecated field in ManagementAppMountParams
      });
  });

  return { unmount, container, setBreadcrumbs, docTitle: coreStart.chrome.docTitle };
}

describe('rolesManagementApp', () => {
  it('create() returns proper management app descriptor', () => {
    const { fatalErrors, getStartServices } = coreMock.createSetup();

    expect(
      rolesManagementApp.create({
        license: licenseMock.create(),
        fatalErrors,
        getStartServices: getStartServices as any,
        buildFlavor: 'traditional',
      })
    ).toMatchInlineSnapshot(`
      Object {
        "id": "roles",
        "mount": [Function],
        "order": 20,
        "title": "Roles",
      }
    `);
  });

  it('mount() works for the `grid` page', async () => {
    const { setBreadcrumbs, container, unmount, docTitle } = await mountApp('/', '/');

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([{ text: 'Roles' }]);
    expect(docTitle.change).toHaveBeenCalledWith('Roles');
    expect(docTitle.reset).not.toHaveBeenCalled();
    expect(container).toMatchInlineSnapshot(`
      <div>
        Roles Page: {
        "buildFlavor": "traditional",
        "readOnly": false,
        "rolesAPIClient": "rolesAPIClient"
      }
      </div>
    `);

    act(() => {
      unmount();
    });

    expect(docTitle.reset).toHaveBeenCalledTimes(1);

    expect(container).toMatchInlineSnapshot(`<div />`);
  });

  it('mount() works for the `create role` page', async () => {
    const { setBreadcrumbs, container, unmount, docTitle } = await mountApp('/', '/edit');

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([{ href: `/`, text: 'Roles' }, { text: 'Create' }]);
    expect(docTitle.change).toHaveBeenCalledWith('Roles');
    expect(docTitle.reset).not.toHaveBeenCalled();
    expect(container).toMatchInlineSnapshot(`
      <div>
        Role Edit Page: {
        "buildFlavor": "traditional",
        "indicesAPIClient": "indicesAPIClient",
        "privilegesAPIClient": "privilegesAPIClient",
        "rolesAPIClient": "rolesAPIClient",
        "userAPIClient": "userAPIClient"
      }
      </div>
    `);

    act(() => {
      unmount();
    });

    expect(docTitle.reset).toHaveBeenCalledTimes(1);

    expect(container).toMatchInlineSnapshot(`<div />`);
  });

  it('mount() works for the `edit role` page', async () => {
    const roleName = 'role@name';

    const { setBreadcrumbs, container, unmount, docTitle } = await mountApp(
      '/',
      `/edit/${roleName}`
    );

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([{ href: `/`, text: 'Roles' }, { text: roleName }]);
    expect(docTitle.change).toHaveBeenCalledWith('Roles');
    expect(docTitle.reset).not.toHaveBeenCalled();
    expect(container).toMatchInlineSnapshot(`
      <div>
        Role Edit Page: {
        "buildFlavor": "traditional",
        "roleName": "role@name",
        "indicesAPIClient": "indicesAPIClient",
        "privilegesAPIClient": "privilegesAPIClient",
        "rolesAPIClient": "rolesAPIClient",
        "userAPIClient": "userAPIClient"
      }
      </div>
    `);

    act(() => {
      unmount();
    });

    expect(docTitle.reset).toHaveBeenCalledTimes(1);

    expect(container).toMatchInlineSnapshot(`<div />`);
  });

  it('mount() works for the `clone role` page', async () => {
    const roleName = 'someRoleName';

    const { setBreadcrumbs, container, unmount, docTitle } = await mountApp(
      '/',
      `/clone/${roleName}`
    );

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([{ href: `/`, text: 'Roles' }, { text: 'Create' }]);
    expect(docTitle.change).toHaveBeenCalledWith('Roles');
    expect(docTitle.reset).not.toHaveBeenCalled();
    expect(container).toMatchInlineSnapshot(`
      <div>
        Role Edit Page: {
        "buildFlavor": "traditional",
        "roleName": "someRoleName",
        "indicesAPIClient": "indicesAPIClient",
        "privilegesAPIClient": "privilegesAPIClient",
        "rolesAPIClient": "rolesAPIClient",
        "userAPIClient": "userAPIClient"
      }
      </div>
    `);

    act(() => {
      unmount();
    });

    expect(docTitle.reset).toHaveBeenCalledTimes(1);

    expect(container).toMatchInlineSnapshot(`<div />`);
  });

  it('mount() properly encodes role name in `edit role` page link in breadcrumbs', async () => {
    const roleName = 'some 安全性 role';

    const { setBreadcrumbs } = await mountApp('/', `/edit/${roleName}`);

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([
      { href: `/`, text: 'Roles' },
      {
        text: roleName,
      },
    ]);
  });
});

describe('rolesManagementApp - serverless', () => {
  it('create() returns proper management app descriptor', () => {
    const { fatalErrors, getStartServices } = coreMock.createSetup();

    expect(
      rolesManagementApp.create({
        license: licenseMock.create(),
        fatalErrors,
        getStartServices: getStartServices as any,
        buildFlavor: 'serverless',
      })
    ).toMatchInlineSnapshot(`
      Object {
        "id": "roles",
        "mount": [Function],
        "order": 20,
        "title": "Custom Roles",
      }
    `);
  });

  it('mount() works for the `grid` page', async () => {
    const { setBreadcrumbs, container, unmount, docTitle } = await mountApp('/', '/', 'serverless');

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([{ text: 'Custom Roles' }]);
    expect(docTitle.change).toHaveBeenCalledWith('Custom Roles');
    expect(docTitle.reset).not.toHaveBeenCalled();
    expect(container).toMatchInlineSnapshot(`
      <div>
        Roles Page: {
        "buildFlavor": "serverless",
        "readOnly": false,
        "rolesAPIClient": "rolesAPIClient"
      }
      </div>
    `);

    act(() => {
      unmount();
    });

    expect(docTitle.reset).toHaveBeenCalledTimes(1);

    expect(container).toMatchInlineSnapshot(`<div />`);
  });

  it('mount() works for the `create role` page', async () => {
    const { setBreadcrumbs, container, unmount, docTitle } = await mountApp(
      '/',
      '/edit',
      'serverless'
    );

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([
      { href: `/`, text: 'Custom Roles' },
      { text: 'Create' },
    ]);
    expect(docTitle.change).toHaveBeenCalledWith('Custom Roles');
    expect(docTitle.reset).not.toHaveBeenCalled();
    expect(container).toMatchInlineSnapshot(`
      <div>
        Role Edit Page: {
        "buildFlavor": "serverless",
        "indicesAPIClient": "indicesAPIClient",
        "privilegesAPIClient": "privilegesAPIClient",
        "rolesAPIClient": "rolesAPIClient",
        "userAPIClient": "userAPIClient"
      }
      </div>
    `);

    act(() => {
      unmount();
    });

    expect(docTitle.reset).toHaveBeenCalledTimes(1);

    expect(container).toMatchInlineSnapshot(`<div />`);
  });

  it('mount() works for the `edit role` page', async () => {
    const roleName = 'role@name';

    const { setBreadcrumbs, container, unmount, docTitle } = await mountApp(
      '/',
      `/edit/${roleName}`,
      'serverless'
    );

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([
      { href: `/`, text: 'Custom Roles' },
      { text: roleName },
    ]);
    expect(docTitle.change).toHaveBeenCalledWith('Custom Roles');
    expect(docTitle.reset).not.toHaveBeenCalled();
    expect(container).toMatchInlineSnapshot(`
      <div>
        Role Edit Page: {
        "buildFlavor": "serverless",
        "roleName": "role@name",
        "indicesAPIClient": "indicesAPIClient",
        "privilegesAPIClient": "privilegesAPIClient",
        "rolesAPIClient": "rolesAPIClient",
        "userAPIClient": "userAPIClient"
      }
      </div>
    `);

    act(() => {
      unmount();
    });

    expect(docTitle.reset).toHaveBeenCalledTimes(1);

    expect(container).toMatchInlineSnapshot(`<div />`);
  });

  it('mount() works for the `clone role` page', async () => {
    const roleName = 'someRoleName';

    const { setBreadcrumbs, container, unmount, docTitle } = await mountApp(
      '/',
      `/clone/${roleName}`,
      'serverless'
    );

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([
      { href: `/`, text: 'Custom Roles' },
      { text: 'Create' },
    ]);
    expect(docTitle.change).toHaveBeenCalledWith('Custom Roles');
    expect(docTitle.reset).not.toHaveBeenCalled();
    expect(container).toMatchInlineSnapshot(`
      <div>
        Role Edit Page: {
        "buildFlavor": "serverless",
        "roleName": "someRoleName",
        "indicesAPIClient": "indicesAPIClient",
        "privilegesAPIClient": "privilegesAPIClient",
        "rolesAPIClient": "rolesAPIClient",
        "userAPIClient": "userAPIClient"
      }
      </div>
    `);

    act(() => {
      unmount();
    });

    expect(docTitle.reset).toHaveBeenCalledTimes(1);

    expect(container).toMatchInlineSnapshot(`<div />`);
  });

  it('mount() properly encodes role name in `edit role` page link in breadcrumbs', async () => {
    const roleName = 'some 安全性 role';

    const { setBreadcrumbs } = await mountApp('/', `/edit/${roleName}`, 'serverless');

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([
      { href: `/`, text: 'Custom Roles' },
      {
        text: roleName,
      },
    ]);
  });
});
