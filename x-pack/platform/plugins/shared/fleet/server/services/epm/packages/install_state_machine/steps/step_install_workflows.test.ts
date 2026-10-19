/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';

import { appContextService } from '../../../../app_context';
import type { ManagedWorkflowsClient } from '../../../../app_context';
import { saveKibanaAssetsRefs } from '../../install';
import { installWorkflows, isWorkflowAssetPath } from '../../../kibana/workflows/install';
import type { KibanaAssetReference } from '../../../../../../common/types';
import { KibanaSavedObjectType } from '../../../../../../common/types';

import { stepInstallWorkflows } from './step_install_workflows';

jest.mock('../../../../app_context');
jest.mock('../../install');
jest.mock('../../../kibana/workflows/install');

const mockedAppContext = appContextService as jest.Mocked<typeof appContextService>;

const WORKFLOW_PATH = 'my_pkg-1.0.0/kibana/workflow/my_pkg-hello.yml';
const DASHBOARD_PATH = 'my_pkg-1.0.0/kibana/dashboard/a.json';
const WORKFLOW_REF: KibanaAssetReference = {
  id: 'wf',
  type: KibanaSavedObjectType.workflow,
  deferred: false,
};

const createContext = ({
  paths,
  installedKibana = [],
  additionalSpaces,
  spaceId = 'default',
}: {
  paths: string[];
  installedKibana?: KibanaAssetReference[];
  additionalSpaces?: Record<string, KibanaAssetReference[]>;
  spaceId?: string;
}) => ({
  logger: loggingSystemMock.createLogger(),
  savedObjectsClient: savedObjectsClientMock.create(),
  spaceId,
  packageInstallContext: { packageInfo: { name: 'my_pkg' }, paths } as Parameters<
    typeof stepInstallWorkflows
  >[0]['packageInstallContext'],
  installedPkg: {
    attributes: {
      installed_kibana: installedKibana,
      installed_kibana_space_id: 'default',
      additional_spaces_installed_kibana: additionalSpaces,
    },
  } as unknown as Parameters<typeof stepInstallWorkflows>[0]['installedPkg'],
});

const mockFeatureFlag = (enabled: boolean) => {
  mockedAppContext.getFeatureFlags.mockReturnValue({
    getBooleanValue$: jest.fn().mockReturnValue(of(enabled)),
  } as unknown as ReturnType<typeof appContextService.getFeatureFlags>);
};

describe('stepInstallWorkflows', () => {
  const client = {} as ManagedWorkflowsClient;

  beforeEach(() => {
    jest.resetAllMocks();
    // Delegated lazily: loading the actual module inside the mock factory hits a circular import
    jest
      .mocked(isWorkflowAssetPath)
      .mockImplementation((path) =>
        jest.requireActual('../../../kibana/workflows/install').isWorkflowAssetPath(path)
      );
    mockFeatureFlag(true);
    mockedAppContext.waitForManagedWorkflowsClient.mockResolvedValue(client);
  });

  it('is a no-op when the package has no workflows and none were installed before', async () => {
    await stepInstallWorkflows(createContext({ paths: [DASHBOARD_PATH] }));

    expect(installWorkflows).not.toHaveBeenCalled();
    expect(saveKibanaAssetsRefs).not.toHaveBeenCalled();
  });

  it('installs workflows and saves their refs', async () => {
    jest.mocked(installWorkflows).mockResolvedValue([WORKFLOW_REF]);
    const context = createContext({ paths: [WORKFLOW_PATH] });

    await stepInstallWorkflows(context);

    expect(saveKibanaAssetsRefs).toHaveBeenCalledWith(
      context.savedObjectsClient,
      'my_pkg',
      [WORKFLOW_REF],
      'default',
      false,
      true,
      [KibanaSavedObjectType.workflow]
    );
  });

  it('removes workflows the new package version no longer ships', async () => {
    jest.mocked(installWorkflows).mockResolvedValue([]);
    const context = createContext({ paths: [DASHBOARD_PATH], installedKibana: [WORKFLOW_REF] });

    await stepInstallWorkflows(context);

    expect(installWorkflows).toHaveBeenCalledWith(
      expect.objectContaining({ previousRefs: [WORKFLOW_REF] })
    );
    expect(saveKibanaAssetsRefs).toHaveBeenCalledWith(
      context.savedObjectsClient,
      'my_pkg',
      [],
      'default',
      false,
      true,
      [KibanaSavedObjectType.workflow]
    );
  });

  it('waits for the client to finish initializing instead of skipping workflows', async () => {
    let resolveClient: (value: ManagedWorkflowsClient) => void = () => {};
    mockedAppContext.waitForManagedWorkflowsClient.mockReturnValue(
      new Promise((resolve) => {
        resolveClient = resolve;
      })
    );
    jest.mocked(installWorkflows).mockResolvedValue([WORKFLOW_REF]);

    const pending = stepInstallWorkflows(createContext({ paths: [WORKFLOW_PATH] }));
    await Promise.resolve();
    expect(installWorkflows).not.toHaveBeenCalled();

    resolveClient(client);
    await pending;

    expect(installWorkflows).toHaveBeenCalledWith(expect.objectContaining({ client }));
  });

  it('keeps the previous workflow refs when the client is not available', async () => {
    mockedAppContext.waitForManagedWorkflowsClient.mockResolvedValue(undefined);
    const context = createContext({ paths: [WORKFLOW_PATH], installedKibana: [WORKFLOW_REF] });

    await stepInstallWorkflows(context);

    expect(installWorkflows).not.toHaveBeenCalled();
    expect(context.logger.warn).toHaveBeenCalled();
    expect(saveKibanaAssetsRefs).toHaveBeenCalledWith(
      context.savedObjectsClient,
      'my_pkg',
      [WORKFLOW_REF],
      'default',
      false,
      true,
      [KibanaSavedObjectType.workflow]
    );
  });

  it('keeps the previous workflow refs when the feature flag is off', async () => {
    mockFeatureFlag(false);
    const context = createContext({ paths: [WORKFLOW_PATH], installedKibana: [WORKFLOW_REF] });

    await stepInstallWorkflows(context);

    expect(installWorkflows).not.toHaveBeenCalled();
    expect(saveKibanaAssetsRefs).toHaveBeenCalledWith(
      context.savedObjectsClient,
      'my_pkg',
      [WORKFLOW_REF],
      'default',
      false,
      true,
      [KibanaSavedObjectType.workflow]
    );
  });

  it('keeps the previous workflow refs when the feature flag service is unavailable', async () => {
    mockedAppContext.getFeatureFlags.mockReturnValue(undefined);
    const context = createContext({ paths: [WORKFLOW_PATH], installedKibana: [WORKFLOW_REF] });

    await stepInstallWorkflows(context);

    expect(installWorkflows).not.toHaveBeenCalled();
    expect(saveKibanaAssetsRefs).toHaveBeenCalledWith(
      context.savedObjectsClient,
      'my_pkg',
      [WORKFLOW_REF],
      'default',
      false,
      true,
      [KibanaSavedObjectType.workflow]
    );
  });

  it('uses the additional space refs when installing in a secondary space', async () => {
    jest.mocked(installWorkflows).mockResolvedValue([WORKFLOW_REF]);
    const otherRef = { ...WORKFLOW_REF, id: 'other' };
    const context = createContext({
      paths: [WORKFLOW_PATH],
      spaceId: 'other-space',
      installedKibana: [WORKFLOW_REF],
      additionalSpaces: { 'other-space': [otherRef] },
    });

    await stepInstallWorkflows(context);

    expect(installWorkflows).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'other-space', previousRefs: [otherRef] })
    );
    expect(saveKibanaAssetsRefs).toHaveBeenCalledWith(
      context.savedObjectsClient,
      'my_pkg',
      [WORKFLOW_REF],
      'other-space',
      true,
      true,
      [KibanaSavedObjectType.workflow]
    );
  });
});
