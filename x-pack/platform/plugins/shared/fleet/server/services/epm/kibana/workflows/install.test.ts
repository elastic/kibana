/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { MAX_WORKFLOW_YAML_LENGTH } from '@kbn/workflows';
import { FLEET_PACKAGE_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { ManagedWorkflowStatus } from '@kbn/workflows/server';

import type { PackageInstallContext } from '../../../../../common/types';
import { KibanaSavedObjectType } from '../../../../../common/types';
import type { ManagedWorkflowsClient } from '../../../app_context';

import {
  getPackageWorkflowId,
  installWorkflows,
  isWorkflowAssetPath,
  uninstallWorkflows,
} from './install';

const createContext = (entries: Record<string, string>): PackageInstallContext =>
  ({
    packageInfo: { name: 'my_pkg' },
    paths: Object.keys(entries),
    archiveIterator: {
      traverseEntries: async (
        onEntry: (entry: { path: string; buffer?: Buffer }) => Promise<void>,
        filter?: (path: string) => boolean
      ) => {
        for (const [path, content] of Object.entries(entries)) {
          if (!filter || filter(path)) {
            await onEntry({ path, buffer: Buffer.from(content) });
          }
        }
      },
    },
  } as unknown as PackageInstallContext);

const createClient = (status: ManagedWorkflowStatus = 'disabled') =>
  ({
    install: jest.fn().mockResolvedValue(undefined),
    uninstall: jest.fn().mockResolvedValue(undefined),
    getWorkflowStatus: jest.fn().mockResolvedValue({ status }),
  } as unknown as jest.Mocked<ManagedWorkflowsClient>);

const WORKFLOW_PATH = 'my_pkg-1.0.0/kibana/workflow/my_pkg-hello.yml';

describe('workflow assets', () => {
  const logger = loggingSystemMock.createLogger();

  describe('isWorkflowAssetPath', () => {
    it('matches only yml files in kibana/workflow', () => {
      expect(isWorkflowAssetPath(WORKFLOW_PATH)).toBe(true);
      expect(isWorkflowAssetPath('my_pkg-1.0.0/kibana/dashboard/my_pkg-hello.json')).toBe(false);
      expect(isWorkflowAssetPath('my_pkg-1.0.0/kibana/workflow/my_pkg-hello.json')).toBe(false);
    });
  });

  describe('getPackageWorkflowId', () => {
    it('builds a space and package scoped id without the redundant package prefix', () => {
      expect(
        getPackageWorkflowId({ spaceId: 'My_Space', pkgName: 'my_pkg', path: WORKFLOW_PATH })
      ).toBe(`${FLEET_PACKAGE_WORKFLOW_ID}-my-space-my-pkg-hello`);
    });

    it('normalizes the file name part of the id', () => {
      expect(
        getPackageWorkflowId({
          spaceId: 'default',
          pkgName: 'my_pkg',
          path: 'my_pkg-1.0.0/kibana/workflow/my_pkg-Hello_World.yml',
        })
      ).toBe(`${FLEET_PACKAGE_WORKFLOW_ID}-default-my-pkg-hello-world`);
    });

    it('returns undefined when the generated id is invalid', () => {
      expect(
        getPackageWorkflowId({
          spaceId: 'default',
          pkgName: 'my_pkg',
          path: 'my_pkg-1.0.0/kibana/workflow/my_pkg-bad.name.yml',
        })
      ).toBeUndefined();
    });
  });

  describe('installWorkflows', () => {
    it('installs each workflow and returns refs', async () => {
      const client = createClient();
      const refs = await installWorkflows({
        client,
        packageInstallContext: createContext({ [WORKFLOW_PATH]: 'name: hello' }),
        spaceId: 'default',
        logger,
      });

      const workflowId = `${FLEET_PACKAGE_WORKFLOW_ID}-default-my-pkg-hello`;
      expect(client.install).toHaveBeenCalledWith(FLEET_PACKAGE_WORKFLOW_ID, {
        spaceId: 'default',
        workflowId,
        values: { yaml: 'name: hello' },
      });
      expect(refs).toEqual([
        { id: workflowId, type: KibanaSavedObjectType.workflow, deferred: false },
      ]);
    });

    it('defers workflows that were not persisted', async () => {
      const refs = await installWorkflows({
        client: createClient('missing'),
        packageInstallContext: createContext({ [WORKFLOW_PATH]: 'name: hello' }),
        spaceId: 'default',
        logger,
      });

      expect(refs[0].deferred).toBe(true);
    });

    it('defers workflows owned by another plugin', async () => {
      const refs = await installWorkflows({
        client: createClient('not_managed'),
        packageInstallContext: createContext({ [WORKFLOW_PATH]: 'name: hello' }),
        spaceId: 'default',
        logger,
      });

      expect(refs[0].deferred).toBe(true);
    });

    it('keeps workflows that fail validation as installed and warns', async () => {
      const warn = jest.spyOn(logger, 'warn');
      const refs = await installWorkflows({
        client: createClient('invalid'),
        packageInstallContext: createContext({ [WORKFLOW_PATH]: 'name: hello' }),
        spaceId: 'default',
        logger,
      });

      expect(refs[0].deferred).toBe(false);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('does not pass workflow validation')
      );
    });

    it.each([
      ['an invalid id', 'my_pkg-1.0.0/kibana/workflow/my_pkg-bad.name.yml', 'name: hello'],
      ['invalid YAML', WORKFLOW_PATH, 'name: [unclosed'],
      ['a non-mapping document', WORKFLOW_PATH, '- a\n- b'],
    ])('skips a workflow with %s', async (_case, path, yaml) => {
      const client = createClient();
      const refs = await installWorkflows({
        client,
        packageInstallContext: createContext({ [path]: yaml }),
        spaceId: 'default',
        logger,
      });

      expect(refs).toEqual([]);
      expect(client.install).not.toHaveBeenCalled();
    });

    it('rejects files over the size limit', async () => {
      await expect(
        installWorkflows({
          client: createClient(),
          packageInstallContext: createContext({
            [WORKFLOW_PATH]: 'a'.repeat(MAX_WORKFLOW_YAML_LENGTH + 1),
          }),
          spaceId: 'default',
          logger,
        })
      ).rejects.toThrow(/exceeds the maximum size/);
    });

    it('uninstalls workflows the package no longer ships', async () => {
      const client = createClient();
      await installWorkflows({
        client,
        packageInstallContext: createContext({ [WORKFLOW_PATH]: 'name: hello' }),
        spaceId: 'default',
        logger,
        previousRefs: [
          { id: 'old-workflow', type: KibanaSavedObjectType.workflow },
          { id: 'a-dashboard', type: KibanaSavedObjectType.dashboard },
        ],
      });

      expect(client.uninstall).toHaveBeenCalledTimes(1);
      expect(client.uninstall).toHaveBeenCalledWith(FLEET_PACKAGE_WORKFLOW_ID, {
        spaceId: 'default',
        workflowId: 'old-workflow',
      });
    });
  });

  describe('uninstallWorkflows', () => {
    it('logs failures and keeps going', async () => {
      const client = createClient();
      client.uninstall.mockRejectedValueOnce(new Error('boom'));

      await uninstallWorkflows({
        client,
        refs: [
          { id: 'one', type: KibanaSavedObjectType.workflow },
          { id: 'two', type: KibanaSavedObjectType.workflow },
        ],
        spaceId: 'default',
        logger,
      });

      expect(client.uninstall).toHaveBeenCalledTimes(2);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('boom'));
    });
  });
});
