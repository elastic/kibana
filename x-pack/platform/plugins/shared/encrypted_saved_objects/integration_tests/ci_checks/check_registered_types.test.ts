/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sortBy } from 'lodash';

import type { Root } from '@kbn/core-root-server-internal';
import type { ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
import {
  createRootWithCorePlugins,
  createTestServers,
  type TestElasticsearchUtils,
} from '@kbn/core-test-helpers-kbn-server';
import { extractMigrationInfo } from '@kbn/core-test-helpers-so-type-serializer';

import type { EncryptedSavedObjectsService } from '../../server/crypto';
import * as EncryptedSavedObjectsModule from '../../server/saved_objects';

// This will only change if new ESOs are introduced. This number should never get smaller.
export const ESO_TYPES_COUNT = 19 as const;

describe('checking changes on all registered encrypted SO types', () => {
  let esServer: TestElasticsearchUtils;
  let root: Root;
  let typeRegistry: ISavedObjectTypeRegistry;
  let esoService: EncryptedSavedObjectsService;

  beforeAll(async () => {
    // the ESO service is passed to the setupSavedObjects function, so we can obtain it by spying on this call.
    // Normally this service is not accessible outside of the ESO plugin.
    const setupSavedObjectsSpy = jest.spyOn(EncryptedSavedObjectsModule, 'setupSavedObjects');

    const { startES } = createTestServers({
      adjustTimeout: (t: number) => jest.setTimeout(t),
    });

    esServer = await startES();
    root = createRootWithCorePlugins({}, { oss: false });
    await root.preboot();
    await root.setup();
    const coreStart = await root.start();
    typeRegistry = coreStart.savedObjects.getTypeRegistry();
    esoService = setupSavedObjectsSpy.mock.calls[0][0].service as EncryptedSavedObjectsService;
  });

  afterAll(async () => {
    if (root) {
      await root.shutdown();
    }
    if (esServer) {
      await esServer.stop();
    }
  });

  // This test is meant to fail when any change is made to ESO registrations (change or addition).
  // Just update the snapshot by running this test file via jest_integration with `-u` and push the update.
  // The intent is to trigger a code review from the Kibana Security team to review the ESO changes.
  // The number of types in the hashMap should never be reduced, it should only increase.
  it('detecting changes to encryption registration definitions', () => {
    const hashMap = esoService.getRegisteredTypeHashMap();

    expect(hashMap).toMatchInlineSnapshot(`
      Object {
        "action": "4e9f7946dfcbee267e685618638f76f3d55e65c949bd259487dc4bf004018478",
        "action_task_params": "06aa563283bdcd5c07ec433a7d0b8425019ad11d75595ee1431691667ecd2cec",
        "ad_hoc_run_params": "6539367aa4ae8340c62f123c3457c6b8d7873c92de68651c70d41028dfe7ed32",
        "alert": "d961ff113e2b7995a49483b8937fcbdccfe425ac82b59a050931cd620b043ed1",
        "api_key_pending_invalidation": "ce3641d95c31bcc2880a294f0123060dcc5026f0a493befdda74924a7ea5c4a0",
        "cloud-connect-api-key": "8c0ae7a780c411145ae4aaf7a70235672c9ccfb56d011c322da3c4eeb258f32d",
        "connector_token": "16ca2154c13c5ee3d3a45b55d4ea6cd33aeaceaef3dc229b002d25470bfc9b3b",
        "entity-discovery-api-key": "cd3b5230a513d2d3503583223e48362fbbbc7812aa4710579a62acfa5bbc30e6",
        "fleet-fleet-server-host": "3b8d0809aaf8a133596307bc29328207c7ceee1dc72233da75141ec47ad8d327",
        "fleet-message-signing-keys": "5cdcf6bf85247267f8876bda4226e871dbfefe01f050e898db7cbc267d57a275",
        "fleet-uninstall-tokens": "6e7d75921dcce46e566f175eab1b0e3825fe565f20cdb3c984e7037934d61e23",
        "ingest-download-sources": "b3740796eab0a91736e43bd22f7489cbf6f2ad0241ae370d1c8195b6a8d8ad52",
        "ingest-outputs": "d66716d5333484a25c57f7917bead5ac2576ec57a4b9eb61701b573f35ab62ad",
        "privmon-api-key": "7d7b76b3bc5287a784518731ba66d4f761052177fc04b1a85e5605846ab9de42",
        "synthetics-monitor": "f1c060b7be3b30187c4adcb35d74f1fa8a4290bd7faf04fec869de2aa387e21b",
        "synthetics-monitor-multi-space": "39c4c6abd28c4173f77c1c89306e92b6b92492c0029274e10620a170be4d4a67",
        "synthetics-param": "747ba9d1b7addf5b131713abe7868bd767af6ce0cf8b6b0f335f4ef34b280c7e",
        "task": "2d8e9bf532f469805b82051f545b915785d99eabfa050cb1aefbc715c6096b97",
        "uptime-synthetics-api-key": "5ca81f180763e85397fa8c6508adcd60efd0f916e29bac6dcd5b4564f1db7375",
      }
    `);
    expect(Object.keys(hashMap).length).toEqual(ESO_TYPES_COUNT);
  });

  // This test is meant to fail and require an update when a new model version is introduced to any ESO types.
  // Just update the snapshot by running this test file via jest_integration with `-u` and push the update.
  // There are tests in core which will catch when an SO type is changed, and help the Core team enforce when
  // a model version needs to be added. This purpose of this test is to ensure that new model versions for ESOs
  // are implemented to the security team's guidelines to adhere to all zero-downtime upgrade considerations.
  it('detecting new model versions in registered encrypted types', () => {
    const esoTypes = esoService.getRegisteredTypes();
    const soTypestoCheck = typeRegistry
      .getAllTypes()
      .filter((soType) => esoTypes.includes(soType.name));

    const modelVersionMap: string[] = sortBy(soTypestoCheck, 'name').flatMap((type, index) => {
      const typeMigrationInfo = sortBy(extractMigrationInfo(type).modelVersions, 'version')
        .reverse()
        .map((mv) => `${type.name}|${mv.version}`);

      return typeMigrationInfo;
    });

    expect(modelVersionMap).toMatchInlineSnapshot(`
      Array [
        "action|1",
        "action_task_params|2",
        "action_task_params|1",
        "ad_hoc_run_params|3",
        "ad_hoc_run_params|2",
        "ad_hoc_run_params|1",
        "alert|8",
        "alert|7",
        "alert|6",
        "alert|5",
        "alert|4",
        "alert|3",
        "alert|2",
        "alert|1",
        "api_key_pending_invalidation|1",
        "cloud-connect-api-key|1",
        "connector_token|1",
        "fleet-fleet-server-host|2",
        "fleet-fleet-server-host|1",
        "fleet-uninstall-tokens|1",
        "ingest-download-sources|1",
        "ingest-outputs|8",
        "ingest-outputs|7",
        "ingest-outputs|6",
        "ingest-outputs|5",
        "ingest-outputs|4",
        "ingest-outputs|3",
        "ingest-outputs|2",
        "ingest-outputs|1",
        "synthetics-monitor|2",
        "synthetics-monitor|1",
        "task|7",
        "task|6",
        "task|5",
        "task|4",
        "task|3",
        "task|2",
        "task|1",
      ]
    `);
  });
});
