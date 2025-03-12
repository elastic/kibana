/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { registerCreateAlertsTableAction } from './create_alerts_table_action';
import { CoreStart } from '@kbn/core/public';
import { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { fetchRuleTypes } from '@kbn/alerts-ui-shared/src/common/apis/fetch_rule_types';
import { ALERTS_FEATURE_ID } from '@kbn/alerts-ui-shared/src/common/constants';
import { CREATE_ALERTS_TABLE_ACTION_ID } from './constants';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { RuleType } from '@kbn/triggers-actions-ui-types';
import { UiActionsPublicStart } from '@kbn/ui-actions-plugin/public/plugin';
import { ADD_PANEL_VISUALIZATION_GROUP } from '@kbn/embeddable-plugin/public';

jest.mock('@kbn/alerts-ui-shared/src/common/apis/fetch_rule_types');
const mockFetchRuleTypes = jest.mocked(fetchRuleTypes);
const mockHttp = httpServiceMock.createStartContract();
const mockCoreStart = { http: mockHttp } as unknown as CoreStart;
const mockUiActions = {
  registerAction: jest.fn(),
  attachAction: jest.fn(),
} as unknown as jest.Mocked<UiActionsPublicStart>;
const embeddable = {
  addNewPanel: jest.fn(),
  removePanel: jest.fn(),
  replacePanel: jest.fn(),
  children$: {},
} as unknown as EmbeddableApiContext;

describe('registerCreateAlertsTableAction', () => {
  it('registers the table action with the correct permissions', async () => {
    const ruleTypes = [
      { authorizedConsumers: { [ALERTS_FEATURE_ID]: { all: true } } },
    ] as unknown as Array<RuleType<string, string>>;
    mockFetchRuleTypes.mockResolvedValue(ruleTypes);

    registerCreateAlertsTableAction(mockCoreStart, mockUiActions);
    const action = mockUiActions.registerAction.mock.calls[0][0];

    expect(action.id).toBe(CREATE_ALERTS_TABLE_ACTION_ID);
    expect(action.grouping).toEqual([ADD_PANEL_VISUALIZATION_GROUP]);
    expect(await action.isCompatible!({ embeddable })).toBe(true);
    await action.execute({ embeddable });
    expect(action.getDisplayName!({})).toBe('Alerts table');
  });

  it('does not register the action if user is not authorized to read any rule type', async () => {
    const ruleTypes = [] as unknown as Array<RuleType<string, string>>;
    mockFetchRuleTypes.mockResolvedValue(ruleTypes);

    registerCreateAlertsTableAction(mockCoreStart, mockUiActions);
    const action = mockUiActions.registerAction.mock.calls[0][0];

    expect(await action.isCompatible!({ embeddable })).toBe(false);
  });
});
