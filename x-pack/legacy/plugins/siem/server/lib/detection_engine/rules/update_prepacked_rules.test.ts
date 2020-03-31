/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { savedObjectsClientMock } from '../../../../../../../../src/core/server/mocks';
import { alertsClientMock } from '../../../../../../../plugins/alerting/server/mocks';
import { actionsClientMock } from '../../../../../../../plugins/actions/server/mocks';
import { mockPrepackagedRule } from '../routes/__mocks__/request_responses';
import { updatePrepackagedRules } from './update_prepacked_rules';
import { patchRules } from './patch_rules';
jest.mock('./patch_rules');

describe('updatePrepackagedRules', () => {
  let actionsClient: ReturnType<typeof actionsClientMock.create>;
  let alertsClient: ReturnType<typeof alertsClientMock.create>;
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;

  beforeEach(() => {
    actionsClient = actionsClientMock.create();
    alertsClient = alertsClientMock.create();
    savedObjectsClient = savedObjectsClientMock.create();
  });

  it('should omit actions and enabled when calling patchRules', async () => {
    const actions = [
      {
        group: 'group',
        id: 'id',
        action_type_id: 'action_type_id',
        params: {},
      },
    ];
    const outputIndex = 'outputIndex';
    const prepackagedRule = mockPrepackagedRule();

    await updatePrepackagedRules(
      alertsClient,
      actionsClient,
      savedObjectsClient,
      [{ ...prepackagedRule, actions }],
      outputIndex
    );

    expect(patchRules).toHaveBeenCalledWith(
      expect.objectContaining({
        ruleId: 'rule-1',
      })
    );
    expect(patchRules).not.toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
      })
    );
    expect(patchRules).not.toHaveBeenCalledWith(
      expect.objectContaining({
        actions,
      })
    );
  });
});
