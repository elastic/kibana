/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCaseResponseFixture } from '../../../common/fixtures/create_case';
import type { CasesClient } from '../../client';
import { addAlertsStepDefinition } from './add_alerts';
import { createStepHandlerContext } from './test_utils';

const createContext = (input: unknown) =>
  createStepHandlerContext({ input, stepType: 'cases.addAlerts' });

describe('addAlertsStepDefinition', () => {
  it('adds alerts to a case', async () => {
    const get = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const bulkCreate = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { get },
      attachments: { bulkCreate },
    } as unknown as CasesClient);
    const definition = addAlertsStepDefinition(getCasesClient);

    await definition.handler(
      createContext({
        case_id: 'case-1',
        alerts: [{ alertId: 'alert-1', index: '.alerts-security.alerts-default' }],
      })
    );

    expect(definition.id).toBe('cases.addAlerts');
    expect(bulkCreate).toHaveBeenCalledWith({
      caseId: 'case-1',
      attachments: [
        {
          type: 'alert',
          alertId: ['alert-1'],
          index: ['.alerts-security.alerts-default'],
          owner: createCaseResponseFixture.owner,
          rule: { id: null, name: null },
        },
      ],
    });
  });

  it('creates a single alert attachment for multiple alerts for the same rule', async () => {
    const get = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const bulkCreate = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { get },
      attachments: { bulkCreate },
    } as unknown as CasesClient);
    const definition = addAlertsStepDefinition(getCasesClient);

    await definition.handler(
      createContext({
        case_id: 'case-1',
        alerts: [
          {
            alertId: 'alert-1',
            index: '.alerts-security.alerts-default',
            rule: { id: 'rule-1', name: 'Test rule' },
          },
          {
            alertId: 'alert-2',
            index: '.alerts-security.alerts-default',
            rule: { id: 'rule-1', name: 'Test rule' },
          },
        ],
      })
    );

    expect(bulkCreate).toHaveBeenCalledWith({
      caseId: 'case-1',
      attachments: [
        {
          type: 'alert',
          alertId: ['alert-1', 'alert-2'],
          index: ['.alerts-security.alerts-default', '.alerts-security.alerts-default'],
          owner: createCaseResponseFixture.owner,
          rule: { id: 'rule-1', name: 'Test rule' },
        },
      ],
    });
  });

  it('creates one alert attachment per distinct rule', async () => {
    const get = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const bulkCreate = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { get },
      attachments: { bulkCreate },
    } as unknown as CasesClient);
    const definition = addAlertsStepDefinition(getCasesClient);

    await definition.handler(
      createContext({
        case_id: 'case-1',
        alerts: [
          {
            alertId: 'alert-1',
            index: 'idx-1',
            rule: { id: 'rule-a', name: 'A' },
          },
          {
            alertId: 'alert-2',
            index: 'idx-2',
            rule: { id: 'rule-b', name: 'B' },
          },
        ],
      })
    );

    expect(bulkCreate).toHaveBeenCalledWith({
      caseId: 'case-1',
      attachments: [
        {
          type: 'alert',
          alertId: ['alert-1'],
          index: ['idx-1'],
          owner: createCaseResponseFixture.owner,
          rule: { id: 'rule-a', name: 'A' },
        },
        {
          type: 'alert',
          alertId: ['alert-2'],
          index: ['idx-2'],
          owner: createCaseResponseFixture.owner,
          rule: { id: 'rule-b', name: 'B' },
        },
      ],
    });
  });

  it('groups alerts without a rule id into a single attachment', async () => {
    const get = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const bulkCreate = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { get },
      attachments: { bulkCreate },
    } as unknown as CasesClient);
    const definition = addAlertsStepDefinition(getCasesClient);

    await definition.handler(
      createContext({
        case_id: 'case-1',
        alerts: [
          { alertId: 'alert-1', index: 'idx-1', rule: { name: 'name only' } },
          { alertId: 'alert-2', index: 'idx-2' },
        ],
      })
    );

    expect(bulkCreate).toHaveBeenCalledWith({
      caseId: 'case-1',
      attachments: [
        {
          type: 'alert',
          alertId: ['alert-1', 'alert-2'],
          index: ['idx-1', 'idx-2'],
          owner: createCaseResponseFixture.owner,
          rule: { id: null, name: 'name only' },
        },
      ],
    });
  });
});
