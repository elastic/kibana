/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { coreMock } from '@kbn/core/public/mocks';
import { getMockPresentationContainer } from '@kbn/presentation-publishing/interfaces/containers/mocks';
import type { InternalRuleType } from '@kbn/response-ops-rules-apis/apis/get_internal_rule_types';
import { getInternalRuleTypes } from '@kbn/response-ops-rules-apis/apis/get_internal_rule_types';

import { getAddAlertsTableAction } from './add_alerts_table_action';
import { ALERTS_FEATURE_ID } from '@kbn/alerts-ui-shared/src/common/constants';

const core = coreMock.createStart();
const mockPresentationContainer = getMockPresentationContainer();

jest.mock('@kbn/response-ops-rules-apis/apis/get_internal_rule_types');
const mockGetInternalRuleTypes = jest.mocked(getInternalRuleTypes);

describe('getAddAlertsTableAction', () => {
  it('should be compatible only when the user has access to at least one rule type', async () => {
    const ruleTypes = [
      { authorizedConsumers: { [ALERTS_FEATURE_ID]: { all: true } } },
    ] as unknown as InternalRuleType[];
    mockGetInternalRuleTypes.mockResolvedValue(ruleTypes);

    const action = getAddAlertsTableAction(core);

    const isCompatible = await action.isCompatible!({
      embeddable: mockPresentationContainer,
    });

    expect(isCompatible).toBeTruthy();
  });

  it("should not be compatible when the user doesn't have access to any rule type", async () => {
    const ruleTypes = [] as unknown as InternalRuleType[];
    mockGetInternalRuleTypes.mockResolvedValue(ruleTypes);

    const action = getAddAlertsTableAction(core);

    const isCompatible = await action.isCompatible!({
      embeddable: mockPresentationContainer,
    });

    expect(isCompatible).toBeFalsy();
  });
});
