/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';

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

const hashSpace = (spaceId: string) =>
  createHash('sha256').update(spaceId).digest('hex').slice(0, 16);

const hashPackage = (packageName: string) =>
  createHash('sha256').update(packageName).digest('hex').slice(0, 16);

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
    const idFor = (spaceId: string, fileName = 'my_pkg-hello', packageName = 'my_pkg') =>
      getPackageWorkflowId({
        spaceId,
        packageName,
        path: `my_pkg-1.0.0/kibana/workflow/${fileName}.yml`,
      });

    it('builds an id from a hashed space and the package-prefixed file name', () => {
      expect(idFor('My_Space')).toBe(
        `${FLEET_PACKAGE_WORKFLOW_ID}-${hashSpace('My_Space')}-${hashPackage(
          'my_pkg'
        )}-my-pkg-hello`
      );
    });

    it('normalizes the file name', () => {
      expect(idFor('default', 'my_pkg-Hello_World')).toBe(
        `${FLEET_PACKAGE_WORKFLOW_ID}-${hashSpace('default')}-${hashPackage(
          'my_pkg'
        )}-my-pkg-hello-world`
      );
    });

    it('does not collide when a hyphenated space shifts into the file name part', () => {
      expect(idFor('a-b', 'c-hello')).not.toBe(idFor('a', 'b-c-hello'));
    });

    it('does not collide across packages whose file names normalize to the same value', () => {
      expect(idFor('default', 'foo-bar-baz', 'foo')).not.toBe(
        idFor('default', 'foo_bar-baz', 'foo_bar')
      );
    });

    it('produces the same id length for any space id', () => {
      const short = idFor('a') as string;
      const long = idFor('s'.repeat(500)) as string;
      expect(long).toHaveLength(short.length);
    });

    it('returns undefined when the generated id is invalid', () => {
      expect(idFor('default', 'my_pkg-bad.name')).toBeUndefined();
    });

    it('returns undefined when the file name makes the id exceed the max length', () => {
      expect(idFor('default', `my_pkg-${'a'.repeat(300)}`)).toBeUndefined();
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

      const workflowId = `${FLEET_PACKAGE_WORKFLOW_ID}-${hashSpace('default')}-${hashPackage(
        'my_pkg'
      )}-my-pkg-hello`;
      expect(client.install).toHaveBeenCalledWith(FLEET_PACKAGE_WORKFLOW_ID, {
        spaceId: 'default',
        workflowId,
        values: { yaml: 'name: hello' },
      });
      expect(refs).toEqual([
        { id: workflowId, type: KibanaSavedObjectType.workflow, deferred: false },
      ]);
    });

    it('rejects files that map to the same workflow id', async () => {
      const client = createClient();
      await expect(
        installWorkflows({
          client,
          packageInstallContext: createContext({
            'my_pkg-1.0.0/kibana/workflow/my_pkg-a_b.yml': 'name: a',
            'my_pkg-1.0.0/kibana/workflow/my_pkg-a-b.yml': 'name: b',
          }),
          spaceId: 'default',
          logger,
        })
      ).rejects.toThrow('maps to a workflow id used by another asset');
      expect(client.install).not.toHaveBeenCalled();
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
      [
        'an invalid id',
        'my_pkg-1.0.0/kibana/workflow/my_pkg-bad.name.yml',
        'name: hello',
        /cannot be mapped to a valid workflow id/,
      ],
      ['invalid YAML', WORKFLOW_PATH, 'name: [unclosed', /not a valid YAML mapping/],
      ['a non-mapping document', WORKFLOW_PATH, '- a\n- b', /not a valid YAML mapping/],
    ])('rejects a workflow with %s', async (_case, path, yaml, message) => {
      const client = createClient();

      await expect(
        installWorkflows({
          client,
          packageInstallContext: createContext({ [path]: yaml }),
          spaceId: 'default',
          logger,
        })
      ).rejects.toThrow(message);

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

    it('removes the workflows created by a failed run and rethrows', async () => {
      const client = createClient();
      client.install.mockImplementation(async (_owner, { workflowId }) => {
        if (workflowId?.endsWith('-broken')) {
          throw new Error('boom');
        }
      });

      await expect(
        installWorkflows({
          client,
          packageInstallContext: createContext({
            [WORKFLOW_PATH]: 'name: hello',
            'my_pkg-1.0.0/kibana/workflow/my_pkg-kept.yml': 'name: kept',
            'my_pkg-1.0.0/kibana/workflow/my_pkg-broken.yml': 'name: broken',
          }),
          spaceId: 'default',
          logger,
          previousRefs: [
            {
              id: `${FLEET_PACKAGE_WORKFLOW_ID}-${hashSpace('default')}-${hashPackage(
                'my_pkg'
              )}-my-pkg-kept`,
              type: KibanaSavedObjectType.workflow,
            },
          ],
        })
      ).rejects.toThrow(
        `${FLEET_PACKAGE_WORKFLOW_ID}-${hashSpace('default')}-${hashPackage(
          'my_pkg'
        )}-my-pkg-broken: boom`
      );

      expect(client.uninstall).toHaveBeenCalledTimes(1);
      expect(client.uninstall).toHaveBeenCalledWith(FLEET_PACKAGE_WORKFLOW_ID, {
        spaceId: 'default',
        workflowId: `${FLEET_PACKAGE_WORKFLOW_ID}-${hashSpace('default')}-${hashPackage(
          'my_pkg'
        )}-my-pkg-hello`,
      });
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          `Failed to install workflow ${FLEET_PACKAGE_WORKFLOW_ID}-${hashSpace(
            'default'
          )}-${hashPackage('my_pkg')}-my-pkg-broken: boom`
        )
      );
    });

    it('joins every install failure into one error', async () => {
      const client = createClient();
      client.install.mockImplementation(async (_owner, { workflowId }) => {
        throw new Error(`boom-${workflowId?.split('-').pop()}`);
      });

      const helloId = `${FLEET_PACKAGE_WORKFLOW_ID}-${hashSpace('default')}-${hashPackage(
        'my_pkg'
      )}-my-pkg-hello`;
      const otherId = `${FLEET_PACKAGE_WORKFLOW_ID}-${hashSpace('default')}-${hashPackage(
        'my_pkg'
      )}-my-pkg-other`;

      const error = await installWorkflows({
        client,
        packageInstallContext: createContext({
          [WORKFLOW_PATH]: 'name: hello',
          'my_pkg-1.0.0/kibana/workflow/my_pkg-other.yml': 'name: other',
        }),
        spaceId: 'default',
        logger,
      }).catch((e) => e);

      expect(error.message).toContain(`${helloId}: boom-hello`);
      expect(error.message).toContain(`${otherId}: boom-other`);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(`Failed to install workflow ${helloId}: boom-hello`)
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(`Failed to install workflow ${otherId}: boom-other`)
      );
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
