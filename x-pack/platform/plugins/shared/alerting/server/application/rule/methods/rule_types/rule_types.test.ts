/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientContextMock } from '../../../../rules_client/rules_client.mock';
import { RulesClient } from '../../../../rules_client';

describe('listRuleTypes', () => {
  const rulesClientContext = rulesClientContextMock.create();
  let rulesClient: RulesClient;

  beforeEach(async () => {
    jest.clearAllMocks();
    rulesClient = new RulesClient(rulesClientContext);

    rulesClientContext.ruleTypeRegistry.list = jest.fn().mockReturnValue(
      new Map([
        ['apm.anomaly', { name: 'Anomaly' }],
        ['.es-query', { name: 'ES rule type' }],
      ])
    );
    rulesClientContext.ruleTypeRegistry.has = jest
      .fn()
      .mockImplementation((ruleTypeId: string) => ruleTypeId === '.es-query');

    rulesClientContext.authorization.getAuthorizedRuleTypes = jest.fn().mockResolvedValue(
      new Map([
        ['.es-query', { authorizedConsumers: { all: true, read: true } }],
        ['.not-exist', { authorizedConsumers: { all: true, read: true } }],
      ])
    );
  });

  it('authorizes correctly', async () => {
    await rulesClient.listRuleTypes();

    expect(rulesClientContext.authorization.getAuthorizedRuleTypes).toHaveBeenCalledWith({
      authorizationEntity: 'rule',
      operations: ['get', 'create'],
      ruleTypeIds: ['apm.anomaly', '.es-query'],
    });
  });

  it('returns the authorized rule types correctly and does not return non authorized or non existing rule types', async () => {
    const res = await rulesClient.listRuleTypes();

    expect(res).toEqual([{ name: 'ES rule type', authorizedConsumers: { all: true, read: true } }]);
  });

  describe('includeAlertViewableTypes', () => {
    it('does not query the alert authorization entity by default', async () => {
      await rulesClient.listRuleTypes();

      expect(rulesClientContext.authorization.getAuthorizedRuleTypes).toHaveBeenCalledTimes(1);
      expect(rulesClientContext.authorization.getAuthorizedRuleTypes).toHaveBeenCalledWith({
        authorizationEntity: 'rule',
        operations: ['get', 'create'],
        ruleTypeIds: ['apm.anomaly', '.es-query'],
      });
    });

    it('additionally queries the alert authorization entity when enabled', async () => {
      await rulesClient.listRuleTypes({ includeAlertViewableTypes: true });

      expect(rulesClientContext.authorization.getAuthorizedRuleTypes).toHaveBeenCalledTimes(2);
      expect(rulesClientContext.authorization.getAuthorizedRuleTypes).toHaveBeenNthCalledWith(1, {
        authorizationEntity: 'rule',
        operations: ['get', 'create'],
        ruleTypeIds: ['apm.anomaly', '.es-query'],
      });
      expect(rulesClientContext.authorization.getAuthorizedRuleTypes).toHaveBeenNthCalledWith(2, {
        authorizationEntity: 'alert',
        operations: ['get'],
        ruleTypeIds: ['apm.anomaly', '.es-query'],
      });
    });

    it('returns rule types authorized only via the alert entity', async () => {
      rulesClientContext.ruleTypeRegistry.has = jest.fn().mockReturnValue(true);

      rulesClientContext.authorization.getAuthorizedRuleTypes = jest
        .fn()
        .mockResolvedValueOnce(new Map())
        .mockResolvedValueOnce(
          new Map([['.es-query', { authorizedConsumers: { alerts: { all: false, read: true } } }]])
        );

      const res = await rulesClient.listRuleTypes({ includeAlertViewableTypes: true });

      expect(res).toMatchInlineSnapshot(`
        Array [
          Object {
            "authorizedConsumers": Object {
              "alerts": Object {
                "all": false,
                "read": true,
              },
            },
            "name": "ES rule type",
          },
        ]
      `);
    });

    it('merges the authorized consumers of overlapping rule types', async () => {
      rulesClientContext.ruleTypeRegistry.has = jest.fn().mockReturnValue(true);

      rulesClientContext.authorization.getAuthorizedRuleTypes = jest
        .fn()
        .mockResolvedValueOnce(
          new Map([['.es-query', { authorizedConsumers: { alerts: { all: false, read: true } } }]])
        )
        .mockResolvedValueOnce(
          new Map([
            ['.es-query', { authorizedConsumers: { stackAlerts: { all: false, read: true } } }],
          ])
        );

      const res = await rulesClient.listRuleTypes({ includeAlertViewableTypes: true });

      expect(res).toEqual([
        {
          name: 'ES rule type',
          authorizedConsumers: {
            alerts: { all: false, read: true },
            stackAlerts: { all: false, read: true },
          },
        },
      ]);
    });

    it('returns a single entry when both entities authorize the same consumers', async () => {
      rulesClientContext.ruleTypeRegistry.has = jest.fn().mockReturnValue(true);

      rulesClientContext.authorization.getAuthorizedRuleTypes = jest
        .fn()
        .mockResolvedValueOnce(
          new Map([
            ['.es-query', { authorizedConsumers: { stackAlerts: { all: false, read: true } } }],
          ])
        )
        .mockResolvedValueOnce(
          new Map([
            ['.es-query', { authorizedConsumers: { stackAlerts: { all: false, read: true } } }],
          ])
        );

      const res = await rulesClient.listRuleTypes({ includeAlertViewableTypes: true });

      expect(res).toEqual([
        {
          name: 'ES rule type',
          authorizedConsumers: {
            stackAlerts: { all: false, read: true },
          },
        },
      ]);
    });
  });
});
