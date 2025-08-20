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
import { getMigrationHash, getTypeHashes } from '@kbn/core-test-helpers-so-type-serializer';

import type { EncryptedSavedObjectsService } from '../../server/crypto';
import * as EncryptedSavedObjectsModule from '../../server/saved_objects';

// This will only change if new ESOs are introduced. This number should never get smaller.
export const ESO_TYPES_COUNT = 18 as const;

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

  // This test is meant to fail when any change is made ESO registerations (change or addition).
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
        "connector_token": "16ca2154c13c5ee3d3a45b55d4ea6cd33aeaceaef3dc229b002d25470bfc9b3b",
        "entity-discovery-api-key": "cd3b5230a513d2d3503583223e48362fbbbc7812aa4710579a62acfa5bbc30e6",
        "fleet-fleet-server-host": "3b8d0809aaf8a133596307bc29328207c7ceee1dc72233da75141ec47ad8d327",
        "fleet-message-signing-keys": "5cdcf6bf85247267f8876bda4226e871dbfefe01f050e898db7cbc267d57a275",
        "fleet-uninstall-tokens": "6e7d75921dcce46e566f175eab1b0e3825fe565f20cdb3c984e7037934d61e23",
        "ingest-download-sources": "23eb3cf789fe13b4899215c6f919705b8a44b89f8feba7181e1f5db3c7699d40",
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

  // This test is meant to fail when any change is made in registered SO types that could potentially impact an ESO.
  // Though there is a similar test in core, this is relevent to ESOs and the Kibana Security team.
  // Just update the snapshot by running this test file via jest_integration with `-u` and push the update.
  // The intent is to trigger a code review from the Kibana Security team to review the ESO changes.
  // The number of types in the hashMap should never be reduced, it should only increase.
  it('detecting migration related changes in registered types', () => {
    const esoTypes = esoService.getRegisteredTypes();
    const soTypestoCheck = typeRegistry
      .getAllTypes()
      .filter((soType) => esoTypes.includes(soType.name));

    const hashMap = soTypestoCheck.reduce((map, type) => {
      map[type.name] = getMigrationHash(type);
      return map;
    }, {} as Record<string, string>);

    expect(hashMap).toMatchInlineSnapshot(`
      Object {
        "action": "696d997e420024a8cf973da94d905c8756e1177c",
        "action_task_params": "cd91a48515202852ebf1fed0d999cd96f6b2823e",
        "ad_hoc_run_params": "690b8991f48c73a04e6a8cf41fd4967a42f8e552",
        "alert": "581f322afd6784aebdb80f872b825a928533d364",
        "api_key_pending_invalidation": "cef0693ec88475a0e1f43614cfa6ca43c24d0338",
        "connector_token": "e25821ecec3061806a6a9d4953273c18a749cc0f",
        "entity-discovery-api-key": "094f1eae0e069e5f8bf2523db1a14072a8e29271",
        "fleet-fleet-server-host": "795c0e79438a260bd860419454bcc432476d4396",
        "fleet-message-signing-keys": "0c6da6a680807e568540b2aa263ae52331ba66db",
        "fleet-uninstall-tokens": "216be68d8426052f9e7529e2e0569b7950676537",
        "ingest-download-sources": "e6b6c76a67a1882c861177ee9e8ff2c607b7eeea",
        "ingest-outputs": "f92200366d6b9f142a81f094154e17987910c535",
        "privmon-api-key": "c06b1614786ce7271087378b47d465c956ab1537",
        "synthetics-monitor": "fdebfa2449d2b934972d1743dc78c34ae9ebc9c1",
        "synthetics-monitor-multi-space": "c8c9dab447ba8a7383041f55ba80757365d114c5",
        "synthetics-param": "9776c9b571d35f0d0397e8915e035ea1dc026db7",
        "task": "689edead32ea09558ceb54f64fd9aa4d324d94d0",
        "uptime-synthetics-api-key": "599319bedbfa287e8761e1ba49d536417a33fa13",
      }
    `);
    expect(Object.keys(hashMap).length).toEqual(ESO_TYPES_COUNT);
  });

  // This test is meant to more granularly detect what changes when occured to an SO's migration-related properties.
  // Though there is a similar test in core, this is relevent to ESOs and the Kibana Security team.
  // Just update the snapshot by running this test file via jest_integration with `-u` and push the update.
  // The intent is to trigger a code review from the Kibana Security team to review the ESO changes.
  // The number of types in the hashMap should never be reduced, it should only increase.
  it('detecting modelVersion and schema changes in registered types', () => {
    const esoTypes = esoService.getRegisteredTypes();
    const soTypestoCheck = typeRegistry
      .getAllTypes()
      .filter((soType) => esoTypes.includes(soType.name));

    const hashMap: string[] = sortBy(soTypestoCheck, 'name').flatMap((type, index) => {
      const typeHashes = getTypeHashes(type);

      if (index < soTypestoCheck.length - 1) {
        const length = typeHashes[typeHashes.length - 1].length;
        if (length) {
          typeHashes.push('='.repeat(length));
        }
      }
      return typeHashes;
    });

    expect(hashMap).toMatchInlineSnapshot(`
      Array [
        "action|global: 04984aae6011426601f8a2a06278e30080f6da3a",
        "action|mappings: c4a658c865d4c30b51ae9b49e1dec06d012bc213",
        "action|schemas: da39a3ee5e6b4b0d3255bfef95601890afd80709",
        "action|10.1.0: b503de40d1388a94daf1f95939b2f207f5ede7e5",
        "action|8.3.0: 89bd5d9dfbcd73496bf7ff424f5ed670b074078e",
        "action|8.0.0: 89bd5d9dfbcd73496bf7ff424f5ed670b074078e",
        "action|7.16.0: 89bd5d9dfbcd73496bf7ff424f5ed670b074078e",
        "action|7.14.0: 89bd5d9dfbcd73496bf7ff424f5ed670b074078e",
        "action|7.11.0: 89bd5d9dfbcd73496bf7ff424f5ed670b074078e",
        "action|7.10.0: 89bd5d9dfbcd73496bf7ff424f5ed670b074078e",
        "action|warning: This type uses 'migrations:' WRAPPER functions that prevent detecting changes in the implementation.",
        "action|warning: The SO type owner should ensure these transform functions DO NOT mutate after they are defined.",
        "===============================================================================================================",
        "action_task_params|global: ab7a2a4b956c4f66857434cfa7f7585e77581514",
        "action_task_params|mappings: 9f8442dee2a3855191972b0cc9ecd2023cc7f60c",
        "action_task_params|schemas: da39a3ee5e6b4b0d3255bfef95601890afd80709",
        "action_task_params|10.2.0: d8726d3ac7702afe5dc13473c1e8d378165839bb",
        "action_task_params|10.1.0: 358f438db845e64b10cad30b5f45b0a5cf2c7c69",
        "action_task_params|8.0.0: b8ecc9b8d2d4431ff32bf6f4c11ab0b33fee9507",
        "action_task_params|7.16.0: b8ecc9b8d2d4431ff32bf6f4c11ab0b33fee9507",
        "action_task_params|warning: This type uses 'migrations:' WRAPPER functions that prevent detecting changes in the implementation.",
        "action_task_params|warning: The SO type owner should ensure these transform functions DO NOT mutate after they are defined.",
        "===========================================================================================================================",
        "ad_hoc_run_params|global: b21683e0a579fdd6de1fc018d8967473e5ecb860",
        "ad_hoc_run_params|mappings: 181dfd63349a1e5fcad63a77f404d1d96cfbfdf4",
        "ad_hoc_run_params|schemas: da39a3ee5e6b4b0d3255bfef95601890afd80709",
        "ad_hoc_run_params|10.2.0: cda07cc58125b10d33a549d580cedb216f0592bd",
        "ad_hoc_run_params|10.1.0: e7073c4a5e91e299aea2bdf0f9b721f759d7614f",
        "==================================================================",
        "alert|global: 8365bd1a75d780902feb5f272ed0d6c430d3d63f",
        "alert|mappings: 40cf55df2cd901cc9899d630d3451e1f779279a4",
        "alert|schemas: da39a3ee5e6b4b0d3255bfef95601890afd80709",
        "alert|10.6.0: 97b9cf0a117fb94d8f1d90213faee3353ecd7b0f",
        "alert|10.5.0: f3187ae361bfeb5ffc316e4c19f78534d53c5f8c",
        "alert|10.4.0: 638b545d82626e51d74ef618bbac4ee91ba8559d",
        "alert|10.3.0: efa5c39630cf8d17800c28ea222f114e430ad5ef",
        "alert|10.2.0: bc1d4fd70ee29adbba2064e87ed90f812abd1f54",
        "alert|10.1.0: 3897e0cda9d900c710569163daf144f3f5538ac7",
        "alert|8.8.0: c7c6c2b760dc7c6278c18d556de909c9f2170464",
        "alert|8.7.0: c7c6c2b760dc7c6278c18d556de909c9f2170464",
        "alert|8.6.0: c7c6c2b760dc7c6278c18d556de909c9f2170464",
        "alert|8.5.0: c7c6c2b760dc7c6278c18d556de909c9f2170464",
        "alert|8.4.1: c7c6c2b760dc7c6278c18d556de909c9f2170464",
        "alert|8.3.0: c7c6c2b760dc7c6278c18d556de909c9f2170464",
        "alert|8.2.0: c7c6c2b760dc7c6278c18d556de909c9f2170464",
        "alert|8.0.1: c7c6c2b760dc7c6278c18d556de909c9f2170464",
        "alert|8.0.0: c7c6c2b760dc7c6278c18d556de909c9f2170464",
        "alert|7.16.0: c7c6c2b760dc7c6278c18d556de909c9f2170464",
        "alert|7.15.0: c7c6c2b760dc7c6278c18d556de909c9f2170464",
        "alert|7.14.1: c7c6c2b760dc7c6278c18d556de909c9f2170464",
        "alert|7.13.0: c7c6c2b760dc7c6278c18d556de909c9f2170464",
        "alert|7.11.2: c7c6c2b760dc7c6278c18d556de909c9f2170464",
        "alert|7.11.0: c7c6c2b760dc7c6278c18d556de909c9f2170464",
        "alert|7.10.0: c7c6c2b760dc7c6278c18d556de909c9f2170464",
        "alert|warning: This type uses 'migrations:' WRAPPER functions that prevent detecting changes in the implementation.",
        "alert|warning: The SO type owner should ensure these transform functions DO NOT mutate after they are defined.",
        "==============================================================================================================",
        "api_key_pending_invalidation|global: 95b04002ba51622fd4512312dc80f09c2176999c",
        "api_key_pending_invalidation|mappings: 6690f4f2a071feda5eec8353cdb23c0f1624910a",
        "api_key_pending_invalidation|schemas: da39a3ee5e6b4b0d3255bfef95601890afd80709",
        "api_key_pending_invalidation|10.1.0: 86984e69b3049ea645b41b9a639f9df24e4fa013",
        "=============================================================================",
        "connector_token|global: 9c6972571df6c56a0d542bdca734a55a7a3859e5",
        "connector_token|mappings: 8c3f381518f3a37955cc7a434e72a81c11e28f1c",
        "connector_token|schemas: da39a3ee5e6b4b0d3255bfef95601890afd80709",
        "connector_token|10.1.0: 9ecb159740330a002b8493c2f1c0bf65a930e7ed",
        "================================================================",
        "entity-discovery-api-key|global: 292cad345774bc77a2ca02961cc102f5a1079a0a",
        "entity-discovery-api-key|mappings: bef7ddd59a25ac521075ee959a6d806a53dd9f1b",
        "entity-discovery-api-key|schemas: da39a3ee5e6b4b0d3255bfef95601890afd80709",
        "==========================================================================",
        "fleet-fleet-server-host|global: 0bae0ac3bf6656ef80eb94d5c3d8960a89dd8694",
        "fleet-fleet-server-host|mappings: b8e2e14eaef5b4797e71f5a33124017dc6a5ead7",
        "fleet-fleet-server-host|schemas: da39a3ee5e6b4b0d3255bfef95601890afd80709",
        "fleet-fleet-server-host|10.2.0: ae0f5ed34de0848dc43c91965a72cf2d54a2ab0d",
        "fleet-fleet-server-host|10.1.0: 092f17555e83b6708cc667d4b68cd09d675ab274",
        "========================================================================",
        "fleet-message-signing-keys|global: ba8bf732c6b9a0d31f51a07744707dd958ca8c81",
        "fleet-message-signing-keys|mappings: e1b10e5bec060a176469a5e9a4f80c94e23abcd7",
        "fleet-message-signing-keys|schemas: da39a3ee5e6b4b0d3255bfef95601890afd80709",
        "============================================================================",
        "fleet-uninstall-tokens|global: f4773aebdd7d9deeac15626dc3966c17fa4feade",
        "fleet-uninstall-tokens|mappings: 2f3682b797edd25ce84e17696183d1c2781e90cb",
        "fleet-uninstall-tokens|schemas: da39a3ee5e6b4b0d3255bfef95601890afd80709",
        "fleet-uninstall-tokens|10.1.0: e7d25b70e8b011d3a974b3f49a535361cacdecf7",
        "=======================================================================",
        "ingest-download-sources|global: 2446c89a33a9ed46072dc5af595d63bfeda00df7",
        "ingest-download-sources|mappings: 1a05e5ea3a543b34f0c45718b26bc13a652a93ba",
        "ingest-download-sources|schemas: da39a3ee5e6b4b0d3255bfef95601890afd80709",
        "ingest-download-sources|10.1.0: ae0f5ed34de0848dc43c91965a72cf2d54a2ab0d",
        "========================================================================",
        "ingest-outputs|global: 3e72116f17fda6ec9c5269cb42eb42e3f686b313",
        "ingest-outputs|mappings: a88cd423056155f954a3877a082c0f8d1273468a",
        "ingest-outputs|schemas: da39a3ee5e6b4b0d3255bfef95601890afd80709",
        "ingest-outputs|10.8.0: ae0f5ed34de0848dc43c91965a72cf2d54a2ab0d",
        "ingest-outputs|10.7.0: d474d1b9cea4084a0431801c64483b99e130694b",
        "ingest-outputs|10.6.0: b8c4c9edda2d2f00cd0a8f1e79108441e1d4d863",
        "ingest-outputs|10.5.0: 092f17555e83b6708cc667d4b68cd09d675ab274",
        "ingest-outputs|10.4.0: fbc48b9c5ffa6edacee1ea22d21314ac0f016f88",
        "ingest-outputs|10.3.0: 64001d553bb1ae79602957e38da1be1a462fd990",
        "ingest-outputs|10.2.0: fa30db0bda33a6deda69dee9c9fa61206af7dbfb",
        "ingest-outputs|10.1.0: ba1f95568a2ddf29f10311e35ae2a82f8ceaad45",
        "ingest-outputs|8.0.0: 79eeaeee6750f16cb0eda2c12ff9f5ede7777906",
        "ingest-outputs|7.13.0: b4f1c0e5e5e2ed10eab8fc7c65e536146e9546f1",
        "===============================================================",
        "privmon-api-key|global: c3285d0eca8f4e8f6211073186228e9f8cc4d461",
        "privmon-api-key|mappings: e1b10e5bec060a176469a5e9a4f80c94e23abcd7",
        "privmon-api-key|schemas: da39a3ee5e6b4b0d3255bfef95601890afd80709",
        "=================================================================",
        "synthetics-monitor|global: d8955ddadb13005ee65ec4a028a99126e69fc9e7",
        "synthetics-monitor|mappings: 59a47dd06d400e73c6aa945d73e37127ae529cdf",
        "synthetics-monitor|schemas: da39a3ee5e6b4b0d3255bfef95601890afd80709",
        "synthetics-monitor|10.2.0: 45a70f989daf2f0e9c68a737dc95382470ba8d04",
        "synthetics-monitor|10.1.0: 25d71c09a48ee10d089967970a1f43c4e3330835",
        "synthetics-monitor|8.9.0: ec91db4df6670118accddcaa86855a3f37b7c6c1",
        "synthetics-monitor|8.8.0: ec91db4df6670118accddcaa86855a3f37b7c6c1",
        "synthetics-monitor|8.6.0: ec91db4df6670118accddcaa86855a3f37b7c6c1",
        "synthetics-monitor|warning: This type uses 'migrations:' WRAPPER functions that prevent detecting changes in the implementation.",
        "synthetics-monitor|warning: The SO type owner should ensure these transform functions DO NOT mutate after they are defined.",
        "===========================================================================================================================",
        "synthetics-monitor-multi-space|global: 5ba5ea6ac57df6a9d44236bdf485d74b8aecd6cc",
        "synthetics-monitor-multi-space|mappings: 59a47dd06d400e73c6aa945d73e37127ae529cdf",
        "synthetics-monitor-multi-space|schemas: da39a3ee5e6b4b0d3255bfef95601890afd80709",
        "================================================================================",
        "synthetics-param|global: cca6ecdda1ffe0cd2b317a3083cac3aae777d5fa",
        "synthetics-param|mappings: e1b10e5bec060a176469a5e9a4f80c94e23abcd7",
        "synthetics-param|schemas: da39a3ee5e6b4b0d3255bfef95601890afd80709",
        "==================================================================",
        "task|global: 8277e4031824bb161fa73897294701786c15eb9a",
        "task|mappings: 131b7c0f6418540178fbb46ac6f5f21018c716cf",
        "task|schemas: da39a3ee5e6b4b0d3255bfef95601890afd80709",
        "task|10.6.0: 38f26797106dc18be1b4a3f2cf134c10b216058a",
        "task|10.5.0: 2cbd88dec96f51d273ea98c9fa0d51146cd1c85e",
        "task|10.4.0: 7a078b1dbc51efb499f32e2f81e44530104238f2",
        "task|10.3.0: bddbb5bc3856ad8d2a082a5a0b073db3b0c76cc9",
        "task|10.2.0: 4643fbb6b57847d794fcd3f952ffaabca4528a5d",
        "task|10.1.0: dc13b8645d44d5e93976b2b3ddab43c511860ecc",
        "task|8.8.0: 9f3615a30e2caa111818c52b995961220d8e05c2",
        "task|8.5.0: 9f3615a30e2caa111818c52b995961220d8e05c2",
        "task|8.2.0: 9f3615a30e2caa111818c52b995961220d8e05c2",
        "task|8.0.0: 9f3615a30e2caa111818c52b995961220d8e05c2",
        "task|7.6.0: 9f3615a30e2caa111818c52b995961220d8e05c2",
        "task|7.4.0: 9f3615a30e2caa111818c52b995961220d8e05c2",
        "task|warning: This type uses 'migrations:' WRAPPER functions that prevent detecting changes in the implementation.",
        "task|warning: The SO type owner should ensure these transform functions DO NOT mutate after they are defined.",
        "=============================================================================================================",
        "uptime-synthetics-api-key|global: cd18182ea51e87c9650050b7db40d243be76c014",
        "uptime-synthetics-api-key|mappings: bef7ddd59a25ac521075ee959a6d806a53dd9f1b",
        "uptime-synthetics-api-key|schemas: da39a3ee5e6b4b0d3255bfef95601890afd80709",
      ]
    `);
  });
});
