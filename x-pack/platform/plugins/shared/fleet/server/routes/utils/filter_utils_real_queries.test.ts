/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as esKuery from '@kbn/es-query';

import {
  LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE,
  AGENT_POLICY_SAVED_OBJECT_TYPE,
  LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  AGENTS_PREFIX,
  AGENT_POLICY_MAPPINGS,
  PACKAGE_POLICIES_MAPPINGS,
  AGENT_MAPPINGS,
  ENROLLMENT_API_KEY_MAPPINGS,
} from '../../constants';

import { FLEET_ENROLLMENT_API_PREFIX } from '../../../common/constants';

import { validateFilterKueryNode, validateKuery } from './filter_utils';

jest.mock('../../services/app_context');

describe('ValidateFilterKueryNode validates real kueries through KueryNode', () => {
  describe('Agent policies', () => {
    test.each([LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE, AGENT_POLICY_SAVED_OBJECT_TYPE])(
      'Search by data_output_id',
      async (agentPolicyType) => {
        const astFilter = esKuery.fromKueryExpression(`${agentPolicyType}.data_output_id: test_id`);
        const validationObject = validateFilterKueryNode({
          astFilter,
          types: [agentPolicyType],
          indexMapping: AGENT_POLICY_MAPPINGS,
          storeValue: true,
        });
        expect(validationObject).toEqual([
          {
            astPath: 'arguments.0',
            error: null,
            isSavedObjectAttr: true,
            key: `${agentPolicyType}.data_output_id`,
            type: agentPolicyType,
          },
        ]);
      }
    );

    test.each([LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE, AGENT_POLICY_SAVED_OBJECT_TYPE])(
      'Search by inactivity timeout',
      async (agentPolicyType) => {
        const astFilter = esKuery.fromKueryExpression(`${agentPolicyType}.inactivity_timeout:*`);
        const validationObject = validateFilterKueryNode({
          astFilter,
          types: [agentPolicyType],
          indexMapping: AGENT_POLICY_MAPPINGS,
          storeValue: true,
        });
        expect(validationObject).toEqual([
          {
            astPath: 'arguments.0',
            error: null,
            isSavedObjectAttr: true,
            key: `${agentPolicyType}.inactivity_timeout`,
            type: agentPolicyType,
          },
        ]);
      }
    );

    test.each([LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE, AGENT_POLICY_SAVED_OBJECT_TYPE])(
      'Complex query',
      async (agentPolicyType) => {
        const validationObject = validateFilterKueryNode({
          astFilter: esKuery.fromKueryExpression(
            `${agentPolicyType}.download_source_id:some_id or (not ${agentPolicyType}.download_source_id:*)`
          ),
          types: [agentPolicyType],
          indexMapping: AGENT_POLICY_MAPPINGS,
          storeValue: true,
        });

        expect(validationObject).toEqual([
          {
            astPath: 'arguments.0',
            error: null,
            isSavedObjectAttr: true,
            key: `${agentPolicyType}.download_source_id`,
            type: agentPolicyType,
          },
          {
            astPath: 'arguments.1.arguments.0',
            error: null,
            isSavedObjectAttr: true,
            key: `${agentPolicyType}.download_source_id`,
            type: agentPolicyType,
          },
        ]);
      }
    );

    test.each([LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE, AGENT_POLICY_SAVED_OBJECT_TYPE])(
      'Test another complex query',
      async (agentPolicyType) => {
        const astFilter = esKuery.fromKueryExpression(
          `${agentPolicyType}.data_output_id: test_id or ${agentPolicyType}.monitoring_output_id: test_id  or (not ${agentPolicyType}.data_output_id:*)`
        );
        const validationObject = validateFilterKueryNode({
          astFilter,
          types: [agentPolicyType],
          indexMapping: AGENT_POLICY_MAPPINGS,
          storeValue: true,
        });

        expect(validationObject).toEqual([
          {
            astPath: 'arguments.0',
            error: null,
            isSavedObjectAttr: true,
            key: `${agentPolicyType}.data_output_id`,
            type: agentPolicyType,
          },
          {
            astPath: 'arguments.1',
            error: null,
            isSavedObjectAttr: true,
            key: `${agentPolicyType}.monitoring_output_id`,
            type: agentPolicyType,
          },
          {
            astPath: 'arguments.2.arguments.0',
            error: null,
            isSavedObjectAttr: true,
            key: `${agentPolicyType}.data_output_id`,
            type: agentPolicyType,
          },
        ]);
      }
    );

    test.each([LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE, AGENT_POLICY_SAVED_OBJECT_TYPE])(
      'Returns error if the attribute does not exist',
      async (agentPolicyType) => {
        const astFilter = esKuery.fromKueryExpression(
          `${agentPolicyType}.package_policies:test_id_1 or ${agentPolicyType}.package_policies:test_id_2`
        );
        const validationObject = validateFilterKueryNode({
          astFilter,
          types: [agentPolicyType],
          indexMapping: AGENT_POLICY_MAPPINGS,
          storeValue: true,
        });
        expect(validationObject).toEqual([
          {
            astPath: 'arguments.0',
            error: `This key '${agentPolicyType}.package_policies' does NOT exist in ${agentPolicyType} saved object index patterns`,
            isSavedObjectAttr: false,
            key: `${agentPolicyType}.package_policies`,
            type: agentPolicyType,
          },
          {
            astPath: 'arguments.1',
            error: `This key '${agentPolicyType}.package_policies' does NOT exist in ${agentPolicyType} saved object index patterns`,
            isSavedObjectAttr: false,
            key: `${agentPolicyType}.package_policies`,
            type: agentPolicyType,
          },
        ]);
      }
    );
  });

  describe('Package policies', () => {
    test.each([LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE, PACKAGE_POLICY_SAVED_OBJECT_TYPE])(
      'Search by package name',
      async (packagePolicyType) => {
        const astFilter = esKuery.fromKueryExpression(
          `${packagePolicyType}.attributes.package.name:packageName`
        );
        const validationObject = validateFilterKueryNode({
          astFilter,
          types: [packagePolicyType],
          indexMapping: PACKAGE_POLICIES_MAPPINGS,
          storeValue: true,
        });
        expect(validationObject).toEqual([
          {
            astPath: 'arguments.0',
            error: null,
            isSavedObjectAttr: false,
            key: `${packagePolicyType}.attributes.package.name`,
            type: packagePolicyType,
          },
        ]);
      }
    );

    test.each([LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE, PACKAGE_POLICY_SAVED_OBJECT_TYPE])(
      'It fails if the kuery is not normalized',
      async (packagePolicyType) => {
        const astFilter = esKuery.fromKueryExpression(
          `${packagePolicyType}.package.name:packageName`
        );
        const validationObject = validateFilterKueryNode({
          astFilter,
          types: [packagePolicyType],
          indexMapping: PACKAGE_POLICIES_MAPPINGS,
          storeValue: true,
        });
        expect(validationObject).toEqual([
          {
            astPath: 'arguments.0',
            error: `This key '${packagePolicyType}.package.name' does NOT match the filter proposition SavedObjectType.attributes.key`,
            isSavedObjectAttr: false,
            key: `${packagePolicyType}.package.name`,
            type: packagePolicyType,
          },
        ]);
      }
    );

    test.each([LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE, PACKAGE_POLICY_SAVED_OBJECT_TYPE])(
      'It does not check attributes if skipNormalization is passed',
      async (packagePolicyType) => {
        const astFilter = esKuery.fromKueryExpression(
          `${packagePolicyType}.package.name:packageName`
        );
        const validationObject = validateFilterKueryNode({
          astFilter,
          types: [packagePolicyType],
          indexMapping: PACKAGE_POLICIES_MAPPINGS,
          storeValue: true,
          skipNormalization: true,
        });
        expect(validationObject).toEqual([
          {
            astPath: 'arguments.0',
            error: null,
            isSavedObjectAttr: false,
            key: `${packagePolicyType}.package.name`,
            type: packagePolicyType,
          },
        ]);
      }
    );

    test.each([LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE, PACKAGE_POLICY_SAVED_OBJECT_TYPE])(
      'Allows passing query without SO',
      async (packagePolicyType) => {
        const astFilter = esKuery.fromKueryExpression(`package.name:packageName`);
        const validationObject = validateFilterKueryNode({
          astFilter,
          types: [packagePolicyType],
          indexMapping: PACKAGE_POLICIES_MAPPINGS,
          storeValue: true,
          skipNormalization: true,
        });
        expect(validationObject).toEqual([
          {
            astPath: 'arguments.0',
            error: null,
            isSavedObjectAttr: true,
            key: 'package.name',
            type: 'package',
          },
        ]);
      }
    );
  });

  describe('Agents', () => {
    it('Search policy id', async () => {
      const astFilter = esKuery.fromKueryExpression(`${AGENTS_PREFIX}.policy_id: "policy_id"`);
      const validationObject = validateFilterKueryNode({
        astFilter,
        types: [AGENTS_PREFIX],
        indexMapping: AGENT_MAPPINGS,
        storeValue: true,
      });
      expect(validationObject).toEqual([
        {
          astPath: 'arguments.0',
          error: null,
          isSavedObjectAttr: true,
          key: 'fleet-agents.policy_id',
          type: 'fleet-agents',
        },
      ]);
    });

    it('Search by multiple ids', async () => {
      const astFilter = esKuery.fromKueryExpression(
        `${AGENTS_PREFIX}.attributes.agent.id : (id_1 or id_2)`
      );

      const validationObject = validateFilterKueryNode({
        astFilter,
        types: [AGENTS_PREFIX],
        indexMapping: AGENT_MAPPINGS,
        storeValue: true,
      });
      expect(validationObject).toEqual([
        {
          astPath: 'arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: 'fleet-agents.attributes.agent.id',
          type: 'fleet-agents',
        },
        {
          astPath: 'arguments.1',
          error: null,
          isSavedObjectAttr: false,
          key: 'fleet-agents.attributes.agent.id',
          type: 'fleet-agents',
        },
      ]);
    });

    it('Search agent by policy Id and enrolled since more than 10m', async () => {
      const astFilter = esKuery.fromKueryExpression(
        `${AGENTS_PREFIX}.policy_id: "policyId" and not (_exists_: "${AGENTS_PREFIX}.unenrolled_at") and ${AGENTS_PREFIX}.enrolled_at >= now-10m`
      );
      const validationObject = validateFilterKueryNode({
        astFilter,
        types: [AGENTS_PREFIX],
        indexMapping: AGENT_MAPPINGS,
        storeValue: true,
      });
      expect(validationObject).toEqual([
        {
          astPath: 'arguments.0',
          error: null,
          isSavedObjectAttr: true,
          key: 'fleet-agents.policy_id',
          type: 'fleet-agents',
        },
        {
          astPath: 'arguments.1.arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: '_exists_',
          type: 'searchTerm',
        },
        {
          astPath: 'arguments.2',
          error: null,
          isSavedObjectAttr: true,
          key: 'fleet-agents.enrolled_at',
          type: 'fleet-agents',
        },
      ]);
    });

    it('Search agent by multiple policy Ids and tags', async () => {
      const astFilter = esKuery.fromKueryExpression(
        `${AGENTS_PREFIX}.policy_id: (policyId1 or policyId2) and ${AGENTS_PREFIX}.tags: (tag1)`
      );
      const validationObject = validateFilterKueryNode({
        astFilter,
        types: [AGENTS_PREFIX],
        indexMapping: AGENT_MAPPINGS,
        storeValue: true,
      });
      expect(validationObject).toEqual([
        {
          astPath: 'arguments.0.arguments.0',
          error: null,
          isSavedObjectAttr: true,
          key: 'fleet-agents.policy_id',
          type: 'fleet-agents',
        },
        {
          astPath: 'arguments.0.arguments.1',
          error: null,
          isSavedObjectAttr: true,
          key: 'fleet-agents.policy_id',
          type: 'fleet-agents',
        },
        {
          astPath: 'arguments.1',
          error: null,
          isSavedObjectAttr: true,
          key: 'fleet-agents.tags',
          type: 'fleet-agents',
        },
      ]);
    });

    it('Search agent by multiple tags', async () => {
      const astFilter = esKuery.fromKueryExpression(
        `${AGENTS_PREFIX}.tags: (tag1 or tag2 or tag3)`
      );
      const validationObject = validateFilterKueryNode({
        astFilter,
        types: [AGENTS_PREFIX],
        indexMapping: AGENT_MAPPINGS,
        storeValue: true,
      });
      expect(validationObject).toEqual([
        {
          astPath: 'arguments.0',
          error: null,
          isSavedObjectAttr: true,
          key: 'fleet-agents.tags',
          type: 'fleet-agents',
        },
        {
          astPath: 'arguments.1',
          error: null,
          isSavedObjectAttr: true,
          key: 'fleet-agents.tags',
          type: 'fleet-agents',
        },
        {
          astPath: 'arguments.2',
          error: null,
          isSavedObjectAttr: true,
          key: 'fleet-agents.tags',
          type: 'fleet-agents',
        },
      ]);
    });

    it('Returns error if kuery is passed without a reference to the index', async () => {
      const astFilter = esKuery.fromKueryExpression(
        `${AGENTS_PREFIX}.status:online or (${AGENTS_PREFIX}.status:updating or ${AGENTS_PREFIX}.status:unenrolling or ${AGENTS_PREFIX}.status:enrolling)`
      );
      const validationObject = validateFilterKueryNode({
        astFilter,
        types: [AGENTS_PREFIX],
        indexMapping: AGENT_MAPPINGS,
        storeValue: true,
      });
      expect(validationObject).toEqual([
        {
          astPath: 'arguments.0',
          error: null,
          isSavedObjectAttr: true,
          key: 'fleet-agents.status',
          type: 'fleet-agents',
        },
        {
          astPath: 'arguments.1.arguments.0',
          error: null,
          isSavedObjectAttr: true,
          key: 'fleet-agents.status',
          type: 'fleet-agents',
        },
        {
          astPath: 'arguments.1.arguments.1',
          error: null,
          isSavedObjectAttr: true,
          key: 'fleet-agents.status',
          type: 'fleet-agents',
        },
        {
          astPath: 'arguments.1.arguments.2',
          error: null,
          isSavedObjectAttr: true,
          key: 'fleet-agents.status',
          type: 'fleet-agents',
        },
      ]);
    });
    it('Search by version', async () => {
      const astFilter = esKuery.fromKueryExpression(`fleet-agents.agent.version: 8.10.0`);
      const validationObj = validateFilterKueryNode({
        astFilter,
        types: [AGENTS_PREFIX],
        indexMapping: AGENT_MAPPINGS,
        storeValue: true,
        skipNormalization: true,
      });
      expect(validationObj).toEqual([
        {
          astPath: 'arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: 'fleet-agents.agent.version',
          type: 'fleet-agents',
        },
      ]);
    });
    it('Search by version without SO wrapping', async () => {
      const astFilter = esKuery.fromKueryExpression(`agent.version: 8.10.0`);
      const validationObj = validateFilterKueryNode({
        astFilter,
        types: [AGENTS_PREFIX],
        indexMapping: AGENT_MAPPINGS,
        storeValue: true,
        skipNormalization: true,
      });
      expect(validationObj).toEqual([
        {
          astPath: 'arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: 'agent.version',
          type: 'agent',
        },
      ]);
    });
  });

  describe('Enrollment API keys', () => {
    it('Search by policy id', async () => {
      const astFilter = esKuery.fromKueryExpression(
        `${FLEET_ENROLLMENT_API_PREFIX}.policy_id: policyId1`
      );
      const validationObject = validateFilterKueryNode({
        astFilter,
        types: [FLEET_ENROLLMENT_API_PREFIX],
        indexMapping: ENROLLMENT_API_KEY_MAPPINGS,
        storeValue: true,
      });
      expect(validationObject).toEqual([
        {
          astPath: 'arguments.0',
          error: null,
          isSavedObjectAttr: true,
          key: 'fleet-enrollment-api-keys.policy_id',
          type: 'fleet-enrollment-api-keys',
        },
      ]);
    });
  });
});

describe('validateKuery validates real kueries', () => {
  describe('Agent policies', () => {
    test.each([LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE, AGENT_POLICY_SAVED_OBJECT_TYPE])(
      'Search by data_output_id',
      async (agentPolicyType) => {
        const validationObj = validateKuery(
          `${agentPolicyType}.data_output_id: test_id`,
          [agentPolicyType],
          AGENT_POLICY_MAPPINGS,
          true
        );
        expect(validationObj?.isValid).toEqual(true);
      }
    );

    test.each([LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE, AGENT_POLICY_SAVED_OBJECT_TYPE])(
      'Search by data_output_id without SO wrapping',
      async (agentPolicyType) => {
        const validationObj = validateKuery(
          `${agentPolicyType}.data_output_id: test_id`,
          [agentPolicyType],
          AGENT_POLICY_MAPPINGS,
          true
        );
        expect(validationObj?.isValid).toEqual(true);
      }
    );

    test.each([LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE, AGENT_POLICY_SAVED_OBJECT_TYPE])(
      'Search by name',
      async (agentPolicyType) => {
        const validationObj = validateKuery(
          `${agentPolicyType}.name: test_id`,
          [agentPolicyType],
          AGENT_POLICY_MAPPINGS,
          true
        );
        expect(validationObj?.isValid).toEqual(true);
      }
    );

    test.each([LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE, AGENT_POLICY_SAVED_OBJECT_TYPE])(
      'Kuery with non existent parameter wrapped by SO',
      async (agentPolicyType) => {
        const validationObj = validateKuery(
          `${agentPolicyType}.non_existent_parameter: 'test_id'`,
          [agentPolicyType],
          AGENT_POLICY_MAPPINGS,
          true
        );
        expect(validationObj?.isValid).toEqual(false);
        expect(validationObj?.error).toContain(
          `KQLSyntaxError: This key '${agentPolicyType}.non_existent_parameter' does NOT exist in ${agentPolicyType} saved object index patterns`
        );
      }
    );

    test.each([LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE, AGENT_POLICY_SAVED_OBJECT_TYPE])(
      'Invalid search by non existent parameter',
      async (agentPolicyType) => {
        const validationObj = validateKuery(
          `non_existent_parameter: 'test_id'`,
          [agentPolicyType],
          AGENT_POLICY_MAPPINGS,
          true
        );
        expect(validationObj?.isValid).toEqual(false);
        expect(validationObj?.error).toContain(
          `KQLSyntaxError: This type 'non_existent_parameter' is not allowed`
        );
      }
    );
  });

  describe('Agents', () => {
    it('Search policy id', async () => {
      const validationObj = validateKuery(
        `${AGENTS_PREFIX}.policy_id: "policy_id"`,
        [AGENTS_PREFIX],
        AGENT_MAPPINGS,
        true
      );
      expect(validationObj?.isValid).toEqual(true);
    });

    it('Status kuery without SO wrapping', async () => {
      const validationObj = validateKuery(
        `status:online or (status:updating or status:unenrolling or status:enrolling)`,
        [AGENTS_PREFIX],
        AGENT_MAPPINGS,
        true
      );
      expect(validationObj?.isValid).toEqual(true);
    });

    it('Status kuery with SO wrapping', async () => {
      const validationObj = validateKuery(
        `${AGENTS_PREFIX}.status:online or (${AGENTS_PREFIX}.status:updating or ${AGENTS_PREFIX}.status:unenrolling or ${AGENTS_PREFIX}.status:enrolling)`,
        [AGENTS_PREFIX],
        AGENT_MAPPINGS,
        true
      );
      expect(validationObj?.isValid).toEqual(true);
    });

    it('Valid kuery without SO wrapping', async () => {
      const validationObj = validateKuery(
        `local_metadata.elastic.agent.version : "8.6.0"`,
        [AGENTS_PREFIX],
        AGENT_MAPPINGS,
        true
      );
      expect(validationObj?.isValid).toEqual(true);
    });

    it('Search by multiple agent ids', async () => {
      const validationObj = validateKuery(
        `${AGENTS_PREFIX}.agent.id : (id_1 or id_2)`,
        [AGENTS_PREFIX],
        AGENT_MAPPINGS,
        true
      );
      expect(validationObj?.isValid).toEqual(true);
    });

    it('Search by complex query', async () => {
      const validationObj = validateKuery(
        `${AGENTS_PREFIX}.policy_id: "policyId" and not (_exists_: "${AGENTS_PREFIX}.unenrolled_at") and ${AGENTS_PREFIX}.enrolled_at >= now-10m`,
        [AGENTS_PREFIX],
        AGENT_MAPPINGS,
        true
      );
      expect(validationObj?.isValid).toEqual(true);
    });

    it('Search by complex query without SO wrapping', async () => {
      const validationObj = validateKuery(
        `policy_id: "policyId" and not (_exists_: "unenrolled_at") and enrolled_at >= now-10m`,
        [AGENTS_PREFIX],
        AGENT_MAPPINGS,
        true
      );
      expect(validationObj?.isValid).toEqual(true);
    });

    it('Search by tags', async () => {
      const validationObj = validateKuery(
        `${AGENTS_PREFIX}.tags: (tag1 or tag2 or tag3)`,
        [AGENTS_PREFIX],
        AGENT_MAPPINGS,
        true
      );
      expect(validationObj?.isValid).toEqual(true);
    });

    it('Search by hostname keyword and status', async () => {
      const validationObj = validateKuery(
        `(${AGENTS_PREFIX}.local_metadata.host.hostname.keyword:test) and (${AGENTS_PREFIX}.status:online)`,
        [AGENTS_PREFIX],
        AGENT_MAPPINGS,
        true
      );
      expect(validationObj?.isValid).toEqual(true);
    });

    it('Search by deeply nested fields', async () => {
      const validationObj = validateKuery(
        `${AGENTS_PREFIX}.local_metadata.os.version.keyword: test`,
        [AGENTS_PREFIX],
        AGENT_MAPPINGS,
        true
      );
      expect(validationObj?.isValid).toEqual(true);
    });

    it('Search by deeply nested fields in local_metadata', async () => {
      const validationObj = validateKuery(
        `${AGENTS_PREFIX}.local_metadata.elastic.agent.build.original.keyword: test`,
        [AGENTS_PREFIX],
        AGENT_MAPPINGS,
        true
      );
      expect(validationObj?.isValid).toEqual(true);
    });

    it('Search by version', async () => {
      const validationObj = validateKuery(
        `agent.version: "8.10.0"`,
        [AGENTS_PREFIX],
        AGENT_MAPPINGS,
        true
      );
      expect(validationObj?.isValid).toEqual(true);
    });

    it('Search by activity', async () => {
      const validationObj = validateKuery(`active: true`, [AGENTS_PREFIX], AGENT_MAPPINGS, true);
      expect(validationObj?.isValid).toEqual(true);
    });

    it('Search by agent.id', async () => {
      const validationObj = validateKuery(`agent.id: id1`, [AGENTS_PREFIX], AGENT_MAPPINGS, true);
      expect(validationObj?.isValid).toEqual(true);
    });

    it('Invalid search by non existent parameter', async () => {
      const validationObj = validateKuery(
        `non_existent_parameter: 'test_id'`,
        [AGENTS_PREFIX],
        AGENT_MAPPINGS,
        true
      );
      expect(validationObj?.isValid).toEqual(false);
      expect(validationObj?.error).toContain(
        `KQLSyntaxError: This type 'non_existent_parameter' is not allowed`
      );
    });
  });

  describe('Package policies', () => {
    test.each([LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE, PACKAGE_POLICY_SAVED_OBJECT_TYPE])(
      'Search by package name without SO',
      async (packagePolicyType) => {
        const validationObj = validateKuery(
          `package.name:fleet_server`,
          [packagePolicyType],
          PACKAGE_POLICIES_MAPPINGS,
          true
        );
        expect(validationObj?.isValid).toEqual(true);
      }
    );

    test.each([LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE, PACKAGE_POLICY_SAVED_OBJECT_TYPE])(
      'Search by package name',
      async (packagePolicyType) => {
        const validationObj = validateKuery(
          `${packagePolicyType}.package.name:fleet_server`,
          [packagePolicyType],
          PACKAGE_POLICIES_MAPPINGS,
          true
        );
        expect(validationObj?.isValid).toEqual(true);
      }
    );

    test.each([LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE, PACKAGE_POLICY_SAVED_OBJECT_TYPE])(
      'Search by package name works with attributes if skipNormalization is not passed',
      async (packagePolicyType) => {
        const validationObj = validateKuery(
          `${packagePolicyType}.attributes.package.name:packageName`,
          [packagePolicyType],
          PACKAGE_POLICIES_MAPPINGS
        );
        expect(validationObj?.isValid).toEqual(true);
      }
    );

    test.each([LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE, PACKAGE_POLICY_SAVED_OBJECT_TYPE])(
      'Search by name and version',
      async (packagePolicyType) => {
        const validationObj = validateKuery(
          `${packagePolicyType}.package.name: "TestName" AND ${packagePolicyType}.package.version: "8.8.0"`,
          [packagePolicyType],
          PACKAGE_POLICIES_MAPPINGS,
          true
        );
        expect(validationObj?.isValid).toEqual(true);
      }
    );

    test.each([LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE, PACKAGE_POLICY_SAVED_OBJECT_TYPE])(
      'Invalid search by nested wrong parameter',
      async (packagePolicyType) => {
        const validationObj = validateKuery(
          `${packagePolicyType}.package.is_managed:packageName`,
          [packagePolicyType],
          PACKAGE_POLICIES_MAPPINGS,
          true
        );
        expect(validationObj?.isValid).toEqual(false);
        expect(validationObj?.error).toEqual(
          `KQLSyntaxError: This key '${packagePolicyType}.package.is_managed' does NOT exist in ${packagePolicyType} saved object index patterns`
        );
      }
    );

    test.each([LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE, PACKAGE_POLICY_SAVED_OBJECT_TYPE])(
      'invalid search by nested wrong parameter - without wrapped SO',
      async (packagePolicyType) => {
        const validationObj = validateKuery(
          `package.is_managed:packageName`,
          [packagePolicyType],
          PACKAGE_POLICIES_MAPPINGS,
          true
        );
        expect(validationObj?.isValid).toEqual(false);
        expect(validationObj?.error).toEqual(
          `KQLSyntaxError: This key 'package.is_managed' does NOT exist in ${packagePolicyType} saved object index patterns`
        );
      }
    );

    test.each([LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE, PACKAGE_POLICY_SAVED_OBJECT_TYPE])(
      'Invalid search by non existent parameter',
      async (packagePolicyType) => {
        const validationObj = validateKuery(
          `${packagePolicyType}.non_existent_parameter:packageName`,
          [packagePolicyType],
          PACKAGE_POLICIES_MAPPINGS
        );
        expect(validationObj?.isValid).toEqual(false);
        expect(validationObj?.error).toEqual(
          `KQLSyntaxError: This key '${packagePolicyType}.non_existent_parameter' does NOT exist in ${packagePolicyType} saved object index patterns`
        );
      }
    );
  });

  describe('Enrollment keys', () => {
    it('Search by policy id without SO name', async () => {
      const validationObj = validateKuery(
        `policy_id: policyId1`,
        [FLEET_ENROLLMENT_API_PREFIX],
        ENROLLMENT_API_KEY_MAPPINGS,
        true
      );
      expect(validationObj?.isValid).toEqual(true);
    });

    it('Search by policy id', async () => {
      const validationObj = validateKuery(
        `${FLEET_ENROLLMENT_API_PREFIX}.policy_id: policyId1`,
        [FLEET_ENROLLMENT_API_PREFIX],
        ENROLLMENT_API_KEY_MAPPINGS,
        true
      );
      expect(validationObj?.isValid).toEqual(true);
    });

    it('Search without field parameter', async () => {
      const validationObj = validateKuery(
        `policyId1`,
        [FLEET_ENROLLMENT_API_PREFIX],
        ENROLLMENT_API_KEY_MAPPINGS,
        true
      );
      expect(validationObj?.isValid).toEqual(true);
      expect(validationObj?.error).toEqual(undefined);
    });
  });
});
