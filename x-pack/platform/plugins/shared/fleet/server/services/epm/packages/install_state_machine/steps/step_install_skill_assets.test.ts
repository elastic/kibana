/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Under the Elastic License 2.0, the
 * GNU AGPLv3, or the SSPLv1, at your election: the "Elastic License 2.0", the
 * "GNU Affero General Public License v3.0 only", or the "Server Side Public
 * License, v 1"; you may not use this file except in compliance with, at your
 * election, the "Elastic License 2.0", the "GNU Affero General Public License
 * v3.0 only", or the "Server Side Public License, v 1".
 */

import { savedObjectsClientMock, loggingSystemMock } from '@kbn/core/server/mocks';

import { appContextService } from '../../../../app_context';
import { stepInstallSkillAssets } from './step_install_skill_assets';

jest.mock('../../install', () => ({
  saveKibanaAssetsRefs: jest.fn(),
}));

const SKILL_MD = [
  '---',
  'name: sdlc-triage',
  'description: Triage SDLC intel signals',
  '---',
  '# SDLC Triage',
  'Rank findings by severity.',
].join('\n');

function buildContext({
  listPackageManagedSkills = jest.fn().mockResolvedValue([]),
  deletePackageManagedSkill = jest.fn().mockResolvedValue(true),
  createOrUpdateSkill = jest.fn().mockResolvedValue(undefined),
}: {
  listPackageManagedSkills?: jest.Mock;
  deletePackageManagedSkill?: jest.Mock;
  createOrUpdateSkill?: jest.Mock;
} = {}) {
  jest.spyOn(appContextService, 'getAgentBuilderSetup').mockReturnValue({
    management: { createOrUpdateSkill, deletePackageManagedSkill, listPackageManagedSkills },
  } as never);

  return {
    logger: loggingSystemMock.createLogger(),
    savedObjectsClient: savedObjectsClientMock.create(),
    spaceId: 'default',
    request: {} as never,
    packageInstallContext: {
      packageInfo: { name: 'sdlc_intel', version: '0.1.0' },
      archiveIterator: {
        traverseEntries: async (onEntry: (e: unknown) => Promise<void>) => {
          await onEntry({
            path: 'sdlc_intel-0.1.0/kibana/skill/sdlc-triage/SKILL.md',
            buffer: Buffer.from(SKILL_MD, 'utf8'),
          });
        },
      },
    },
  } as never;
}

describe('stepInstallSkillAssets', () => {
  afterEach(() => jest.restoreAllMocks());

  it('installs the skill under a path-independent id', async () => {
    const createOrUpdateSkill = jest.fn().mockResolvedValue(undefined);
    await stepInstallSkillAssets(buildContext({ createOrUpdateSkill }));

    expect(createOrUpdateSkill).toHaveBeenCalledTimes(1);
    const [definition] = createOrUpdateSkill.mock.calls[0];
    expect(definition.id).toBe('fleet-default-sdlc_intel-sdlc-triage');
    expect(definition.id).not.toContain('/');
  });

  it('reaps package-owned skills that the current archive no longer produces', async () => {
    // An earlier install of this package wrote an id derived from the raw
    // archive path. It is readonly + package-managed, so nothing but install
    // can remove it, and package uninstall never will: it is absent from the
    // package asset refs.
    const listPackageManagedSkills = jest.fn().mockResolvedValue([
      { id: 'fleet-default-sdlc_intel-sdlc-triage', plugin_id: 'fleet:sdlc_intel' },
      {
        id: 'fleet-default-sdlc_intel-sdlc_intel-0.1.0/kibana/skill/sdlc-triage',
        plugin_id: 'fleet:sdlc_intel',
      },
    ]);
    const deletePackageManagedSkill = jest.fn().mockResolvedValue(true);

    await stepInstallSkillAssets(buildContext({ listPackageManagedSkills, deletePackageManagedSkill }));

    expect(deletePackageManagedSkill).toHaveBeenCalledTimes(1);
    expect(deletePackageManagedSkill).toHaveBeenCalledWith(
      'fleet-default-sdlc_intel-sdlc_intel-0.1.0/kibana/skill/sdlc-triage',
      'default'
    );
  });

  it('never reaps skills owned by another package or by the user', async () => {
    const listPackageManagedSkills = jest.fn().mockResolvedValue([
      { id: 'fleet-default-other_pkg-thing', plugin_id: 'fleet:other_pkg' },
      { id: 'user-authored-skill', plugin_id: undefined },
    ]);
    const deletePackageManagedSkill = jest.fn().mockResolvedValue(true);

    await stepInstallSkillAssets(buildContext({ listPackageManagedSkills, deletePackageManagedSkill }));

    expect(deletePackageManagedSkill).not.toHaveBeenCalled();
  });
});
