/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  hasPackagePolicyVarsChanged,
  reapplyPackageWorkflowAssetsOnVarChange,
} from './reapply_assets_on_var_change';
import { getInstallationObject } from './get';
import * as Registry from '../registry';
import { stepInstallWorkflowAssets } from './install_state_machine/steps/step_install_workflow_assets';
import { stepInstallAgentAssets } from './install_state_machine/steps/step_install_agent_assets';
import { KibanaSavedObjectType } from '../../../types';

jest.mock('./get');
jest.mock('../registry');
jest.mock('./install_state_machine/steps/step_install_workflow_assets');
jest.mock('./install_state_machine/steps/step_install_agent_assets');
jest.mock('../../security/fake_request', () => ({
  createFleetInternalRequest: jest.fn(() => ({ id: 'fleet-internal-request' })),
}));

const mockGetInstallationObject = getInstallationObject as jest.MockedFunction<
  typeof getInstallationObject
>;
const mockGetPackage = Registry.getPackage as jest.MockedFunction<typeof Registry.getPackage>;
const mockStepInstallWorkflowAssets = stepInstallWorkflowAssets as jest.MockedFunction<
  typeof stepInstallWorkflowAssets
>;
const mockStepInstallAgentAssets = stepInstallAgentAssets as jest.MockedFunction<
  typeof stepInstallAgentAssets
>;

const logger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as any;
const savedObjectsClient = {} as any;

const installedArchive = {
  packageInfo: { name: 'sdlc_intel', version: '0.1.0' },
  paths: ['/srv/sdlc_intel-0.1.0'],
  archiveIterator: { kind: 'archive-iterator' },
};

const installationWith = (installedKibana: Array<{ id: string; type: string }>) =>
  ({
    id: 'sdlc_intel',
    attributes: {
      name: 'sdlc_intel',
      version: '0.1.0',
      installed_kibana: installedKibana,
      installed_kibana_space_id: 'default',
    },
  } as any);

describe('hasPackagePolicyVarsChanged', () => {
  it('returns false when vars are unchanged', () => {
    const vars = { connector: { value: 'conn-1' } };
    expect(hasPackagePolicyVarsChanged(vars, { ...vars })).toBe(false);
  });

  it('returns false when both are undefined', () => {
    expect(hasPackagePolicyVarsChanged(undefined, undefined)).toBe(false);
  });

  it('returns true when a var value changes', () => {
    expect(
      hasPackagePolicyVarsChanged(
        { connector: { value: 'conn-1' } },
        { connector: { value: 'conn-2' } }
      )
    ).toBe(true);
  });

  it('returns true when a var is added or removed', () => {
    expect(hasPackagePolicyVarsChanged({ a: { value: 1 } }, { a: { value: 1 }, b: { value: 2 } })).toBe(
      true
    );
    expect(hasPackagePolicyVarsChanged(undefined, { a: { value: 1 } })).toBe(true);
  });
});

describe('reapplyPackageWorkflowAssetsOnVarChange', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPackage.mockResolvedValue(installedArchive as any);
  });

  it('no-ops when the package is not installed', async () => {
    mockGetInstallationObject.mockResolvedValue(undefined as any);

    await reapplyPackageWorkflowAssetsOnVarChange({
      pkgName: 'sdlc_intel',
      savedObjectsClient,
      logger,
    });

    expect(mockGetPackage).not.toHaveBeenCalled();
    expect(mockStepInstallWorkflowAssets).not.toHaveBeenCalled();
    expect(mockStepInstallAgentAssets).not.toHaveBeenCalled();
  });

  it('no-ops when the package ships no workflow/agent assets', async () => {
    mockGetInstallationObject.mockResolvedValue(
      installationWith([{ id: 'dash-1', type: KibanaSavedObjectType.dashboard }])
    );

    await reapplyPackageWorkflowAssetsOnVarChange({
      pkgName: 'sdlc_intel',
      savedObjectsClient,
      logger,
    });

    expect(mockGetPackage).not.toHaveBeenCalled();
    expect(mockStepInstallWorkflowAssets).not.toHaveBeenCalled();
    expect(mockStepInstallAgentAssets).not.toHaveBeenCalled();
  });

  it('re-applies workflow and agent steps with the current archive context', async () => {
    mockGetInstallationObject.mockResolvedValue(
      installationWith([
        { id: 'wf-1', type: KibanaSavedObjectType.workflow },
        { id: 'agent-1', type: KibanaSavedObjectType.agent },
      ])
    );

    await reapplyPackageWorkflowAssetsOnVarChange({
      pkgName: 'sdlc_intel',
      savedObjectsClient,
      logger,
    });

    expect(mockGetPackage).toHaveBeenCalledWith('sdlc_intel', '0.1.0', { useStreaming: true });

    const expectedContext = {
      logger,
      savedObjectsClient,
      packageInstallContext: {
        packageInfo: installedArchive.packageInfo,
        paths: installedArchive.paths,
        archiveIterator: installedArchive.archiveIterator,
      },
      spaceId: 'default',
      request: { id: 'fleet-internal-request' },
    };
    expect(mockStepInstallWorkflowAssets).toHaveBeenCalledTimes(1);
    expect(mockStepInstallWorkflowAssets).toHaveBeenCalledWith(expectedContext);
    expect(mockStepInstallAgentAssets).toHaveBeenCalledTimes(1);
    expect(mockStepInstallAgentAssets).toHaveBeenCalledWith(expectedContext);
  });
});
