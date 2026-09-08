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
import { getEsPackage } from '../archive/storage';
import { stepInstallWorkflowAssets } from './install_state_machine/steps/step_install_workflow_assets';
import { stepInstallAgentAssets } from './install_state_machine/steps/step_install_agent_assets';
import { KibanaSavedObjectType } from '../../../types';

jest.mock('./get');
jest.mock('../registry');
jest.mock('../archive/storage');
jest.mock('./install_state_machine/steps/step_install_workflow_assets');
jest.mock('./install_state_machine/steps/step_install_agent_assets');

const mockGetInstallationObject = getInstallationObject as jest.MockedFunction<
  typeof getInstallationObject
>;
const mockGetPackage = Registry.getPackage as jest.MockedFunction<typeof Registry.getPackage>;
const mockGetEsPackage = getEsPackage as jest.MockedFunction<typeof getEsPackage>;
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

const PACKAGE_ASSET_REFS = [{ id: 'asset-1', type: 'epm-packages-assets' }] as any;

const storedAssetsMap = new Map<string, Buffer>([
  ['sdlc_intel-0.1.0/manifest.yml', Buffer.from('name: sdlc_intel')],
]);

const storedEsPackage = {
  packageInfo: { name: 'sdlc_intel', version: '0.1.0' },
  paths: ['sdlc_intel-0.1.0/manifest.yml'],
  assetsMap: storedAssetsMap,
};

const registryArchive = {
  packageInfo: { name: 'sdlc_intel', version: '0.1.0' },
  paths: ['/srv/sdlc_intel-0.1.0'],
  archiveIterator: { kind: 'registry-archive-iterator' },
};

const installationWith = (
  installedKibana: Array<{ id: string; type: string }>,
  packageAssets?: unknown
) =>
  ({
    id: 'sdlc_intel',
    attributes: {
      name: 'sdlc_intel',
      version: '0.1.0',
      installed_kibana: installedKibana,
      installed_kibana_space_id: 'default',
      package_assets: packageAssets,
    },
  } as any);

const WORKFLOW_AND_AGENT_ASSETS = [
  { id: 'wf-1', type: KibanaSavedObjectType.workflow },
  { id: 'agent-1', type: KibanaSavedObjectType.agent },
];

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
    expect(
      hasPackagePolicyVarsChanged({ a: { value: 1 } }, { a: { value: 1 }, b: { value: 2 } })
    ).toBe(true);
    expect(hasPackagePolicyVarsChanged(undefined, { a: { value: 1 } })).toBe(true);
  });
});

describe('reapplyPackageWorkflowAssetsOnVarChange', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPackage.mockResolvedValue(registryArchive as any);
    mockGetEsPackage.mockResolvedValue(storedEsPackage as any);
  });

  it('no-ops when the package is not installed', async () => {
    mockGetInstallationObject.mockResolvedValue(undefined as any);

    await reapplyPackageWorkflowAssetsOnVarChange({
      pkgName: 'sdlc_intel',
      savedObjectsClient,
      logger,
    });

    expect(mockGetEsPackage).not.toHaveBeenCalled();
    expect(mockGetPackage).not.toHaveBeenCalled();
    expect(mockStepInstallWorkflowAssets).not.toHaveBeenCalled();
    expect(mockStepInstallAgentAssets).not.toHaveBeenCalled();
  });

  it('no-ops when the package ships no workflow/agent assets', async () => {
    mockGetInstallationObject.mockResolvedValue(
      installationWith([{ id: 'dash-1', type: KibanaSavedObjectType.dashboard }], PACKAGE_ASSET_REFS)
    );

    await reapplyPackageWorkflowAssetsOnVarChange({
      pkgName: 'sdlc_intel',
      savedObjectsClient,
      logger,
    });

    expect(mockGetEsPackage).not.toHaveBeenCalled();
    expect(mockGetPackage).not.toHaveBeenCalled();
    expect(mockStepInstallWorkflowAssets).not.toHaveBeenCalled();
    expect(mockStepInstallAgentAssets).not.toHaveBeenCalled();
  });

  // Regression: a package installed from an upload or bundled source is NOT
  // resolvable from the remote registry. Resolving via the registry made the
  // live hook fail with "sdlc_intel@0.1.0 not found" and silently skip the
  // re-apply for exactly the locally-installed packages this hook serves.
  it('resolves the archive Fleet stored at install time, not the remote registry', async () => {
    mockGetInstallationObject.mockResolvedValue(
      installationWith(WORKFLOW_AND_AGENT_ASSETS, PACKAGE_ASSET_REFS)
    );

    await reapplyPackageWorkflowAssetsOnVarChange({
      pkgName: 'sdlc_intel',
      savedObjectsClient,
      logger,
    });

    expect(mockGetEsPackage).toHaveBeenCalledWith(
      'sdlc_intel',
      '0.1.0',
      PACKAGE_ASSET_REFS,
      savedObjectsClient
    );
    expect(mockGetPackage).not.toHaveBeenCalled();
    expect(mockStepInstallWorkflowAssets).toHaveBeenCalledTimes(1);
  });

  // Regression: getEsPackage returns an assetsMap, not an archiveIterator.
  // Passing it through unadapted made the live hook fail with
  // "Cannot read properties of undefined (reading 'traverseEntries')".
  it('adapts the stored assetsMap into a usable archiveIterator', async () => {
    mockGetInstallationObject.mockResolvedValue(
      installationWith(WORKFLOW_AND_AGENT_ASSETS, PACKAGE_ASSET_REFS)
    );

    await reapplyPackageWorkflowAssetsOnVarChange({
      pkgName: 'sdlc_intel',
      savedObjectsClient,
      logger,
    });

    const context = mockStepInstallWorkflowAssets.mock.calls[0][0] as any;
    const { archiveIterator } = context.packageInstallContext;

    expect(archiveIterator).toBeDefined();
    expect(typeof archiveIterator.traverseEntries).toBe('function');

    const seen: string[] = [];
    await archiveIterator.traverseEntries(async ({ path }: { path: string }) => {
      seen.push(path);
    });
    expect(seen).toEqual(['sdlc_intel-0.1.0/manifest.yml']);
  });

  // Regression: workflow asset installation clones an API key and therefore
  // needs real credentials. Passing the credential-less internal request made
  // the live hook fail with "Unable to clone an API key, request does not
  // contain an authorization header".
  it('forwards the authenticated request that triggered the vars change', async () => {
    mockGetInstallationObject.mockResolvedValue(
      installationWith(WORKFLOW_AND_AGENT_ASSETS, PACKAGE_ASSET_REFS)
    );
    const request = { id: 'real-authenticated-request' } as any;

    await reapplyPackageWorkflowAssetsOnVarChange({
      pkgName: 'sdlc_intel',
      savedObjectsClient,
      logger,
      request,
    });

    expect(mockStepInstallWorkflowAssets).toHaveBeenCalledWith(
      expect.objectContaining({ request })
    );
    expect(mockStepInstallAgentAssets).toHaveBeenCalledWith(expect.objectContaining({ request }));
  });

  it('re-applies both workflow and agent steps for the installed space', async () => {
    mockGetInstallationObject.mockResolvedValue(
      installationWith(WORKFLOW_AND_AGENT_ASSETS, PACKAGE_ASSET_REFS)
    );

    await reapplyPackageWorkflowAssetsOnVarChange({
      pkgName: 'sdlc_intel',
      savedObjectsClient,
      logger,
    });

    expect(mockStepInstallWorkflowAssets).toHaveBeenCalledTimes(1);
    expect(mockStepInstallAgentAssets).toHaveBeenCalledTimes(1);
    expect(mockStepInstallWorkflowAssets).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'default', savedObjectsClient, logger })
    );
  });

  it('falls back to the registry when no stored assets are recorded', async () => {
    mockGetInstallationObject.mockResolvedValue(
      installationWith(WORKFLOW_AND_AGENT_ASSETS, undefined)
    );

    await reapplyPackageWorkflowAssetsOnVarChange({
      pkgName: 'sdlc_intel',
      savedObjectsClient,
      logger,
    });

    expect(mockGetEsPackage).not.toHaveBeenCalled();
    expect(mockGetPackage).toHaveBeenCalledWith('sdlc_intel', '0.1.0', { useStreaming: true });
    expect(mockStepInstallWorkflowAssets).toHaveBeenCalledWith(
      expect.objectContaining({
        packageInstallContext: expect.objectContaining({
          archiveIterator: registryArchive.archiveIterator,
        }),
      })
    );
  });
});
