/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@kbn/safer-lodash-set/fp';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { renderParameterTemplates } from './render';

const params = {
  subAction: 'run',
  subActionParams: {
    webhook: {},
  },
};

const logger = loggingSystemMock.createLogger();
const alert1Expected = {
  _id: 'l8jb2e55f2740ab15ba4e2717a96c93396c4ce323ac7a486c7dc179d67rg3ft',
  _index: '.internal.alerts-security.alerts-default-000001',
  host: { ip: ['10.252.97.126'], name: 'Host-dbzugdlqdn' },
  user: { domain: 'm0zepcuuu2', name: 'gyd31qs02v' },
  '@timestamp': '2022-09-30T13:56:38.314Z',
};
const alert2Expected = {
  ...alert1Expected,
  _id: 'b02bc8e55f2740ab15ba4e2717a96c93396ccce323ac7a486c7dc179d67b3a2f',
};

const alert1 = {
  ...alert1Expected,
  kibana: {
    version: '8.5.0',
    space_ids: ['default'],
    alert: {
      workflow_status: 'open',
    },
  },
};
const alert2 = {
  ...alert1,
  _id: alert2Expected._id,
};

const variables = {
  alertId: 'b02e31f0-336e-11ed-9f07-a9a06b00ec20',
  alertName: 'testRule',
  spaceId: 'default',
  context: {
    alerts: [alert1, alert2],
    rule: {
      description: 'test rule',
      rule_id: '27eca842-d8c2-48f3-a1de-3173310b3d90',
    },
  },
};

describe('Tines body render', () => {
  describe('renderParameterTemplates', () => {
    it('should not render body on test action', () => {
      const testParams = { subAction: 'test', subActionParams: { body: 'test_json' } };
      const result = renderParameterTemplates(logger, testParams, variables);
      expect(result).toEqual(testParams);
    });

    it('should rendered body from variables with cleaned alerts on run action', () => {
      const result = renderParameterTemplates(logger, params, variables);

      expect(result.subActionParams.body).toEqual(
        JSON.stringify({
          ...variables,
          context: {
            ...variables.context,
            alerts: [alert1Expected, alert2Expected],
          },
        })
      );
    });

    it('should rendered body from variables on run action without context.alerts', () => {
      const variablesWithoutAlerts = set('context.alerts', undefined, variables);
      const result = renderParameterTemplates(logger, params, variablesWithoutAlerts);

      expect(result.subActionParams.body).toEqual(JSON.stringify(variablesWithoutAlerts));
    });

    it('should rendered body from variables on run action without context', () => {
      const variablesWithoutContext = set('context', undefined, variables);
      const result = renderParameterTemplates(logger, params, variablesWithoutContext);

      expect(result.subActionParams.body).toEqual(JSON.stringify(variablesWithoutContext));
    });

    it('should render error body', () => {
      const errorMessage = 'test error';
      jest.spyOn(JSON, 'stringify').mockImplementationOnce(() => {
        throw new Error(errorMessage);
      });
      const result = renderParameterTemplates(logger, params, variables);
      expect(result.subActionParams.body).toEqual(
        JSON.stringify({ error: { message: errorMessage } })
      );
    });
  });
});
