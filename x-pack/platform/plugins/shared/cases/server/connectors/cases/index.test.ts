/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SubActionConnectorType } from '@kbn/actions-plugin/server/sub_action_framework/types';
import type { CasesConnectorConfig, CasesConnectorSecrets } from './types';
import { getCasesConnectorAdapter, getCasesConnectorType } from '.';
import { AlertConsumers } from '@kbn/rule-data-utils';

describe('getCasesConnectorType', () => {
  let caseConnectorType: SubActionConnectorType<CasesConnectorConfig, CasesConnectorSecrets>;

  beforeEach(() => {
    caseConnectorType = getCasesConnectorType({
      getCasesClient: jest.fn(),
      getUnsecuredSavedObjectsClient: jest.fn(),
      getSpaceId: jest.fn(),
    });
  });

  describe('getKibanaPrivileges', () => {
    it('construct the kibana privileges correctly', () => {
      expect(
        caseConnectorType.getKibanaPrivileges?.({
          params: { subAction: 'run', subActionParams: { owner: 'my-owner' } },
        })
      ).toEqual([
        'cases:my-owner/createCase',
        'cases:my-owner/updateCase',
        'cases:my-owner/deleteCase',
        'cases:my-owner/pushCase',
        'cases:my-owner/createComment',
        'cases:my-owner/updateComment',
        'cases:my-owner/deleteComment',
        'cases:my-owner/findConfigurations',
        'cases:my-owner/reopenCase',
        'cases:my-owner/assignCase',
      ]);
    });

    it('throws if the owner is undefined', () => {
      expect(() => caseConnectorType.getKibanaPrivileges?.()).toThrowErrorMatchingInlineSnapshot(
        `"Cannot authorize cases. Owner is not defined in the subActionParams."`
      );
    });
  });

  describe('getCasesConnectorAdapter', () => {
    const alerts = {
      all: {
        data: [
          { _id: 'alert-id-1', _index: 'alert-index-1' },
          { _id: 'alert-id-2', _index: 'alert-index-2' },
        ],
        count: 2,
      },
      new: { data: [{ _id: 'alert-id-1', _index: 'alert-index-1' }], count: 1 },
      ongoing: { data: [{ _id: 'alert-id-2', _index: 'alert-index-2' }], count: 1 },
      recovered: { data: [], count: 0 },
    };

    const rule = {
      id: 'rule-id',
      name: 'my rule name',
      tags: ['my-tag'],
      consumer: 'test-consumer',
      producer: 'test-producer',
    };

    const getParams = (overrides = {}) => ({
      subAction: 'run' as const,
      subActionParams: {
        groupingBy: [],
        reopenClosedCases: false,
        timeWindow: '7d',
        templateId: null,
        ...overrides,
      },
    });

    it('sets the correct connectorTypeId', () => {
      const adapter = getCasesConnectorAdapter({});

      expect(adapter.connectorTypeId).toEqual('.cases');
    });

    describe('ruleActionParamsSchema', () => {
      it('validates getParams() correctly', () => {
        const adapter = getCasesConnectorAdapter({});

        expect(adapter.ruleActionParamsSchema.validate(getParams())).toEqual(getParams());
      });

      it('throws if missing getParams()', () => {
        const adapter = getCasesConnectorAdapter({});

        expect(() => adapter.ruleActionParamsSchema.validate({})).toThrow();
      });

      it('does not accept more than one groupingBy key', () => {
        const adapter = getCasesConnectorAdapter({});

        expect(() =>
          adapter.ruleActionParamsSchema.validate(
            getParams({ groupingBy: ['host.name', 'source.ip'] })
          )
        ).toThrow();
      });

      it('should fail with not valid time window', () => {
        const adapter = getCasesConnectorAdapter({});

        expect(() =>
          adapter.ruleActionParamsSchema.validate(getParams({ timeWindow: '10d+3d' }))
        ).toThrow();
      });
    });

    describe('buildActionParams', () => {
      it('builds the action getParams() correctly', () => {
        const adapter = getCasesConnectorAdapter({});

        expect(
          adapter.buildActionParams({
            // @ts-expect-error: not all fields are needed
            alerts,
            rule,
            params: getParams(),
            spaceId: 'default',
            ruleUrl: 'https://example.com',
          })
        ).toMatchInlineSnapshot(`
          Object {
            "subAction": "run",
            "subActionParams": Object {
              "alerts": Array [
                Object {
                  "_id": "alert-id-1",
                  "_index": "alert-index-1",
                },
                Object {
                  "_id": "alert-id-2",
                  "_index": "alert-index-2",
                },
              ],
              "groupingBy": Array [],
              "maximumCasesToOpen": 5,
              "owner": "cases",
              "reopenClosedCases": false,
              "rule": Object {
                "id": "rule-id",
                "name": "my rule name",
                "ruleUrl": "https://example.com",
                "tags": Array [
                  "my-tag",
                ],
              },
              "templateId": null,
              "timeWindow": "7d",
            },
          }
        `);
      });

      it('builds the action getParams() and templateId correctly', () => {
        const adapter = getCasesConnectorAdapter({});

        expect(
          adapter.buildActionParams({
            // @ts-expect-error: not all fields are needed
            alerts,
            rule,
            params: getParams({ templateId: 'template_key_1' }),
            spaceId: 'default',
            ruleUrl: 'https://example.com',
          })
        ).toMatchInlineSnapshot(`
          Object {
            "subAction": "run",
            "subActionParams": Object {
              "alerts": Array [
                Object {
                  "_id": "alert-id-1",
                  "_index": "alert-index-1",
                },
                Object {
                  "_id": "alert-id-2",
                  "_index": "alert-index-2",
                },
              ],
              "groupingBy": Array [],
              "maximumCasesToOpen": 5,
              "owner": "cases",
              "reopenClosedCases": false,
              "rule": Object {
                "id": "rule-id",
                "name": "my rule name",
                "ruleUrl": "https://example.com",
                "tags": Array [
                  "my-tag",
                ],
              },
              "templateId": "template_key_1",
              "timeWindow": "7d",
            },
          }
        `);
      });

      it('builds the action getParams() correctly without ruleUrl', () => {
        const adapter = getCasesConnectorAdapter({});
        expect(
          adapter.buildActionParams({
            // @ts-expect-error: not all fields are needed
            alerts,
            rule,
            params: getParams(),
            spaceId: 'default',
          })
        ).toMatchInlineSnapshot(`
          Object {
            "subAction": "run",
            "subActionParams": Object {
              "alerts": Array [
                Object {
                  "_id": "alert-id-1",
                  "_index": "alert-index-1",
                },
                Object {
                  "_id": "alert-id-2",
                  "_index": "alert-index-2",
                },
              ],
              "groupingBy": Array [],
              "maximumCasesToOpen": 5,
              "owner": "cases",
              "reopenClosedCases": false,
              "rule": Object {
                "id": "rule-id",
                "name": "my rule name",
                "ruleUrl": null,
                "tags": Array [
                  "my-tag",
                ],
              },
              "templateId": null,
              "timeWindow": "7d",
            },
          }
        `);
      });

      it('maps observability consumers to the correct owner', () => {
        const adapter = getCasesConnectorAdapter({});

        for (const consumer of [
          AlertConsumers.OBSERVABILITY,
          AlertConsumers.APM,
          AlertConsumers.INFRASTRUCTURE,
          AlertConsumers.LOGS,
          AlertConsumers.SLO,
          AlertConsumers.UPTIME,
          AlertConsumers.MONITORING,
        ]) {
          const connectorParams = adapter.buildActionParams({
            // @ts-expect-error: not all fields are needed
            alerts,
            rule: { ...rule, consumer },
            params: getParams(),
            spaceId: 'default',
          });

          expect(connectorParams.subActionParams.owner).toBe('observability');
        }
      });

      it('maps security solution consumers to the correct owner', () => {
        const adapter = getCasesConnectorAdapter({});

        for (const consumer of [AlertConsumers.SIEM]) {
          const connectorParams = adapter.buildActionParams({
            // @ts-expect-error: not all fields are needed
            alerts,
            rule: { ...rule, consumer },
            params: getParams(),
            spaceId: 'default',
          });

          expect(connectorParams.subActionParams.owner).toBe('securitySolution');
        }
      });

      it('maps stack consumers to the correct owner', () => {
        const adapter = getCasesConnectorAdapter({});

        for (const consumer of [AlertConsumers.ML, AlertConsumers.STACK_ALERTS]) {
          const connectorParams = adapter.buildActionParams({
            // @ts-expect-error: not all fields are needed
            alerts,
            rule: { ...rule, consumer },
            params: getParams(),
            spaceId: 'default',
          });

          expect(connectorParams.subActionParams.owner).toBe('cases');
        }
      });

      it('fallback to the cases owner if the consumer is not in the mapping', () => {
        const adapter = getCasesConnectorAdapter({});

        const connectorParams = adapter.buildActionParams({
          // @ts-expect-error: not all fields are needed
          alerts,
          rule: { ...rule, consumer: 'not-valid' },
          params: getParams(),
          spaceId: 'default',
        });

        expect(connectorParams.subActionParams.owner).toBe('cases');
      });

      it('correctly fallsback to security owner if the project is serverless security', () => {
        const adapter = getCasesConnectorAdapter({ isServerlessSecurity: true });

        for (const consumer of [AlertConsumers.ML, AlertConsumers.STACK_ALERTS]) {
          const connectorParams = adapter.buildActionParams({
            // @ts-expect-error: not all fields are needed
            alerts,
            rule: { ...rule, consumer },
            params: getParams(),
            spaceId: 'default',
          });

          expect(connectorParams.subActionParams.owner).toBe('securitySolution');
        }
      });
    });

    describe('getKibanaPrivileges', () => {
      it('constructs the correct privileges from the consumer', () => {
        const adapter = getCasesConnectorAdapter({});

        expect(
          adapter.getKibanaPrivileges?.({
            consumer: AlertConsumers.SIEM,
            producer: AlertConsumers.SIEM,
          })
        ).toEqual([
          'cases:securitySolution/createCase',
          'cases:securitySolution/updateCase',
          'cases:securitySolution/deleteCase',
          'cases:securitySolution/pushCase',
          'cases:securitySolution/createComment',
          'cases:securitySolution/updateComment',
          'cases:securitySolution/deleteComment',
          'cases:securitySolution/findConfigurations',
          'cases:securitySolution/reopenCase',
          'cases:securitySolution/assignCase',
        ]);
      });

      it('constructs the correct privileges from the producer if the consumer is not found', () => {
        const adapter = getCasesConnectorAdapter({});

        expect(
          adapter.getKibanaPrivileges?.({
            consumer: 'not-exist',
            producer: AlertConsumers.LOGS,
          })
        ).toEqual([
          'cases:observability/createCase',
          'cases:observability/updateCase',
          'cases:observability/deleteCase',
          'cases:observability/pushCase',
          'cases:observability/createComment',
          'cases:observability/updateComment',
          'cases:observability/deleteComment',
          'cases:observability/findConfigurations',
          'cases:observability/reopenCase',
          'cases:observability/assignCase',
        ]);
      });

      it('correctly overrides the consumer and producer if the project is serverless security', () => {
        const adapter = getCasesConnectorAdapter({ isServerlessSecurity: true });

        expect(
          adapter.getKibanaPrivileges?.({
            consumer: 'alerts',
            producer: AlertConsumers.LOGS,
          })
        ).toEqual([
          'cases:securitySolution/createCase',
          'cases:securitySolution/updateCase',
          'cases:securitySolution/deleteCase',
          'cases:securitySolution/pushCase',
          'cases:securitySolution/createComment',
          'cases:securitySolution/updateComment',
          'cases:securitySolution/deleteComment',
          'cases:securitySolution/findConfigurations',
          'cases:securitySolution/reopenCase',
          'cases:securitySolution/assignCase',
        ]);
      });
    });
  });
});
