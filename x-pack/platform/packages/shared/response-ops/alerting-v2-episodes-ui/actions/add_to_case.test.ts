/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import type { AlertEpisode } from '../queries/episodes_query';
import type { ClassicAlertActionContext } from '../classic_alerts/utils/map_alert';
import * as addToCaseModal from '../components/add_to_case_modal';
import type { AddToCaseCasesService, CaseAlertItem } from '../components/add_to_case_modal';
import { createAddToCaseAction } from './add_to_case';
import { ADD_TO_CASE_EPISODE_ACTION_ID } from './add_to_case_action_id';

const makeClassicEpisode = (
  alertUuid: string,
  { ruleId = 'rule-1', caseIds = [] as string[], ruleName = 'Rule 1' } = {}
): AlertEpisode =>
  ({
    'episode.id': alertUuid,
    'rule.id': ruleId,
    'rule.name': ruleName,
    source_id: 'v1',
    source_action_context: {
      index: '.alerts-test',
      alertUuid,
      instanceId: undefined,
      ruleId,
      workflowStatus: 'open',
      workflowTags: [],
      caseIds,
    } as ClassicAlertActionContext,
  } as unknown as AlertEpisode);

const makeNativeEpisode = (id: string): AlertEpisode =>
  ({ 'episode.id': id, 'rule.id': 'rule-v2', 'rule.name': 'V2 rule' } as unknown as AlertEpisode);

const setup = (permissions = { create: true, read: true }) => {
  const canUseCases = jest.fn().mockReturnValue(permissions);
  const groupAlertsByRule = jest.fn((items: CaseAlertItem[], owner: string) =>
    items.length > 0 ? [{ owner, items }] : []
  );
  const cases = {
    ui: { getCasesContext: jest.fn() },
    hooks: { useCasesAddToExistingCaseModal: jest.fn() },
    helpers: { canUseCases, groupAlertsByRule },
  } as unknown as AddToCaseCasesService;
  const action = createAddToCaseAction({
    cases,
    owner: 'observability',
    rendering: coreMock.createStart().rendering,
    kibanaServices: {},
  });
  return { cases, action, canUseCases, groupAlertsByRule };
};

describe('createAddToCaseAction', () => {
  let openAddToCaseModal: jest.SpyInstance;

  beforeEach(() => {
    openAddToCaseModal = jest.spyOn(addToCaseModal, 'openAddToCaseModal').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('isCompatible', () => {
    it('is compatible with a single classic alert', () => {
      const { action } = setup();
      expect(action.id).toBe(ADD_TO_CASE_EPISODE_ACTION_ID);
      expect(action.isCompatible({ episodes: [makeClassicEpisode('a')] })).toBe(true);
    });

    it('is compatible with a selection of only classic alerts', () => {
      const { action } = setup();
      expect(
        action.isCompatible({ episodes: [makeClassicEpisode('a'), makeClassicEpisode('b')] })
      ).toBe(true);
    });

    it('is not compatible with a v2 episode', () => {
      const { action } = setup();
      expect(action.isCompatible({ episodes: [makeNativeEpisode('a')] })).toBe(false);
    });

    it('is not compatible with a mixed selection', () => {
      const { action } = setup();
      expect(
        action.isCompatible({ episodes: [makeClassicEpisode('a'), makeNativeEpisode('b')] })
      ).toBe(false);
    });

    it('is not compatible with an empty selection', () => {
      const { action } = setup();
      expect(action.isCompatible({ episodes: [] })).toBe(false);
    });

    it.each([
      ['create', { create: false, read: true }],
      ['read', { create: true, read: false }],
    ])('is not compatible without cases %s privilege', (_, permissions) => {
      const { action, canUseCases } = setup(permissions);
      expect(action.isCompatible({ episodes: [makeClassicEpisode('a')] })).toBe(false);
      expect(canUseCases).toHaveBeenCalledWith(['observability']);
    });

    it('supports bulk', () => {
      const { action } = setup();
      expect(action.supportsBulk).not.toBe(false);
    });
  });

  describe('execute', () => {
    const run = async (episodes: AlertEpisode[], onSuccess?: () => void) => {
      const { action, cases, groupAlertsByRule } = setup();
      await action.execute({ episodes, onSuccess });
      const [deps, options] = openAddToCaseModal.mock.calls[0];
      return { cases, groupAlertsByRule, deps, options };
    };

    it('opens the modal with the cases service, owner and services', async () => {
      const { cases, deps } = await run([makeClassicEpisode('a')]);

      expect(openAddToCaseModal).toHaveBeenCalledTimes(1);
      expect(deps).toMatchObject({ cases, owner: 'observability', kibanaServices: {} });
    });

    it('builds attachments for every classic alert when creating a new case', async () => {
      const { groupAlertsByRule, options } = await run([
        makeClassicEpisode('a', { ruleId: 'rule-1', ruleName: 'Rule 1' }),
        makeClassicEpisode('b', { ruleId: 'rule-2', ruleName: 'Rule 2' }),
      ]);

      options.getAttachments({ theCase: undefined });

      expect(groupAlertsByRule).toHaveBeenCalledWith(
        [
          {
            ecs: { _id: 'a', _index: '.alerts-test' },
            data: [
              { field: 'kibana.alert.rule.uuid', value: ['rule-1'] },
              { field: 'kibana.alert.rule.name', value: ['Rule 1'] },
            ],
          },
          {
            ecs: { _id: 'b', _index: '.alerts-test' },
            data: [
              { field: 'kibana.alert.rule.uuid', value: ['rule-2'] },
              { field: 'kibana.alert.rule.name', value: ['Rule 2'] },
            ],
          },
        ],
        'observability'
      );
    });

    it('skips alerts already attached to the chosen case', async () => {
      const { groupAlertsByRule, options } = await run([
        makeClassicEpisode('a', { caseIds: ['case-1'] }),
        makeClassicEpisode('b', { caseIds: ['case-2'] }),
        makeClassicEpisode('c'),
      ]);

      options.getAttachments({ theCase: { id: 'case-1', owner: 'observability' } });

      const [items] = groupAlertsByRule.mock.calls[0];
      expect(items.map(({ ecs }: CaseAlertItem) => ecs._id)).toEqual(['b', 'c']);
    });

    it('groups no alerts when everything is already attached', async () => {
      const { groupAlertsByRule, options } = await run([
        makeClassicEpisode('a', { caseIds: ['case-1'] }),
      ]);

      options.getAttachments({ theCase: { id: 'case-1', owner: 'observability' } });

      expect(groupAlertsByRule).toHaveBeenCalledWith([], 'observability');
    });

    it("uses the chosen case's owner for the attachments", async () => {
      const { groupAlertsByRule, options } = await run([makeClassicEpisode('a')]);

      options.getAttachments({ theCase: { id: 'case-1', owner: 'cases' } });

      expect(groupAlertsByRule).toHaveBeenCalledWith(expect.any(Array), 'cases');
    });

    it('configures the already attached toast', async () => {
      const { options } = await run([makeClassicEpisode('a')]);

      expect(options.noAttachmentsToaster).toEqual({
        title: 'No alerts added to the case',
        content: 'All selected alerts are already attached to the case',
      });
    });

    it('calls the caller onSuccess when the attachments are added', async () => {
      const onSuccess = jest.fn();
      const { options } = await run([makeClassicEpisode('a')], onSuccess);

      options.onSuccess();

      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it('does not fail when no onSuccess callback was provided', async () => {
      const { options } = await run([makeClassicEpisode('a')]);

      expect(() => options.onSuccess()).not.toThrow();
    });
  });
});
