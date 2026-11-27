/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MergeAttachmentChoices, MergeConflict } from '../../../common/types/api';
import { CaseSeverity, CustomFieldTypes } from '../../../common/types/domain';
import { basicCase } from '../../containers/mock';
import { buildMergePreview, mergeSummary, titleConflict } from './mock';
import type { MergeStepStates } from './utils';
import {
  applyExclusions,
  buildAttachmentsRequest,
  buildMergeRequest,
  buildPreviewFields,
  canMergeCases,
  canOpenStep,
  combineDescriptions,
  formatCaseList,
  formatTemplateFieldValue,
  getAttachmentsStepBlocker,
  getCaseReference,
  getCasesStepBlocker,
  getChoiceKeys,
  getConflictKey,
  getDifferencesStepBlocker,
  getExclusionsKeepingNewest,
  getFieldValues,
  getFirstBlockedStep,
  getKeysOutsideNewest,
  getMergedCasePreview,
  getMergeDisabledReason,
  getNextStep,
  getPreviousStep,
  getRoomForAlerts,
  getUnresolvedConflicts,
  hasFieldChoice,
  isDifferencesStepSkippable,
  splitOverflow,
  toAiReasons,
  toChoicesFromFields,
} from './utils';

const alertChoice = (key: string, addedAt: string) => ({
  key,
  sourceCaseId: 'case-2',
  addedAt,
  alertId: key,
  index: '.alerts',
  ruleId: 'rule-1',
  ruleName: 'Rule 1',
});

const choices = (overrides: Partial<MergeAttachmentChoices> = {}): MergeAttachmentChoices => ({
  alerts: [],
  events: [],
  attacks: [],
  observables: [],
  other: [],
  ...overrides,
});

describe('merge cases utils', () => {
  describe('getCaseReference', () => {
    it('uses the case number when there is one', () => {
      expect(getCaseReference({ incrementalId: 118, title: 'Phishing' })).toBe('#118');
    });

    it('falls back to the title', () => {
      expect(getCaseReference({ incrementalId: null, title: 'Phishing' })).toBe('Phishing');
    });
  });

  describe('formatCaseList', () => {
    it('joins references the way the locale writes a list', () => {
      expect(formatCaseList(['#118', '#121', '#124'])).toBe('#118, #121, and #124');
    });
  });

  describe('canMergeCases', () => {
    it('needs update and add comment, but not create', () => {
      expect(canMergeCases({ update: true, createComment: true })).toBe(true);
      expect(canMergeCases({ update: false, createComment: true })).toBe(false);
      expect(canMergeCases({ update: true, createComment: false })).toBe(false);
    });
  });

  describe('getMergeDisabledReason', () => {
    const securityCase = { ...basicCase, owner: 'securitySolution' };

    it('allows two to ten cases from one solution', () => {
      expect(getMergeDisabledReason([securityCase, securityCase])).toBeUndefined();
    });

    it('requires at least two cases', () => {
      expect(getMergeDisabledReason([securityCase])).toBe('Select at least 2 cases to merge.');
    });

    it('allows at most ten cases', () => {
      expect(getMergeDisabledReason(Array(11).fill(securityCase))).toBe(
        'Select 10 or fewer cases to merge.'
      );
    });

    it('requires cases from one solution', () => {
      expect(getMergeDisabledReason([securityCase, { ...basicCase, owner: 'observability' }])).toBe(
        'Select cases from one solution to merge them.'
      );
    });
  });

  describe('conflicts', () => {
    const preview = buildMergePreview();

    it('keys custom and template field conflicts by their field key', () => {
      expect(getConflictKey({ field: 'extendedFields', key: 'verdict_as_keyword' })).toBe(
        'extendedFields.verdict_as_keyword'
      );
      expect(getConflictKey({ field: 'title' })).toBe('title');
    });

    it('leaves a conflict unresolved until the user acts on the field', () => {
      expect(getUnresolvedConflicts(preview, {}, new Set())).toEqual([titleConflict]);
    });

    it('resolves a conflict once the user chooses a value, even the suggestion', () => {
      expect(getUnresolvedConflicts(preview, { title: 'Phishing' }, new Set())).toEqual([]);
    });

    it('reopens a conflict the server asked to review again', () => {
      expect(getUnresolvedConflicts(preview, { title: 'Phishing' }, new Set(['title']))).toEqual([
        titleConflict,
      ]);
    });

    it('keeps a required field unresolved until the server accepts the value', () => {
      const required: MergeConflict = {
        field: 'extendedFields',
        key: 'verdict_as_keyword',
        reason: 'required',
        resolved: false,
      };
      const withRequired = buildMergePreview({ conflicts: [required] });
      const userChoices = { extendedFields: { verdict_as_keyword: 'malicious' } };

      expect(getUnresolvedConflicts(withRequired, userChoices, new Set())).toEqual([required]);
      expect(
        getUnresolvedConflicts(
          buildMergePreview({ conflicts: [{ ...required, resolved: true }] }),
          userChoices,
          new Set()
        )
      ).toEqual([]);
    });

    it('counts a null choice, such as no template, as a choice', () => {
      expect(hasFieldChoice({ template: null }, 'template')).toBe(true);
      expect(hasFieldChoice({}, 'template')).toBe(false);
    });
  });

  describe('getFieldValues', () => {
    it('takes the user choice over the suggestion', () => {
      const values = getFieldValues(buildMergePreview(), {
        title: 'Merged phishing',
        category: null,
      });

      expect(values.title).toBe('Merged phishing');
      expect(values.category).toBeNull();
      expect(values.tags).toEqual(['phishing']);
    });
  });

  describe('combineDescriptions', () => {
    it('uses the combined value from the server when there is one', () => {
      const preview = buildMergePreview();
      preview.fields.description.combinedValue = 'combined';

      expect(combineDescriptions(preview)).toBe('combined');
    });

    it('joins every description under a heading naming its cases', () => {
      expect(combineDescriptions(buildMergePreview())).toBe(
        '**From #118, #119**\n\nFirst description'
      );
    });
  });

  describe('attachments', () => {
    const attackAlerts = ['alert-a', 'alert-b'];
    const preview = buildMergePreview({
      attachments: {
        alerts: {
          ...mergeSummary({ total: 1003, toCopy: 1003, max: 1000, overBy: 3 }),
          byRule: [],
        },
        attacks: mergeSummary({ total: 2, toCopy: 2 }),
      },
      choices: choices({
        alerts: [
          alertChoice('alert-1', '2024-01-01T00:00:00.000Z'),
          alertChoice('alert-2', '2024-01-03T00:00:00.000Z'),
          alertChoice('alert-3', '2024-01-02T00:00:00.000Z'),
        ],
        attacks: [
          {
            key: 'attack-1',
            sourceCaseId: 'case-2',
            addedAt: '2024-01-01T00:00:00.000Z',
            attackId: 'attack-1',
            title: 'Lateral movement',
            alertKeys: attackAlerts,
          },
          {
            key: 'attack-2',
            sourceCaseId: 'case-2',
            addedAt: '2024-01-01T00:00:00.000Z',
            attackId: 'attack-2',
            title: 'Exfiltration',
            alertKeys: ['alert-b'],
          },
        ],
      }),
    });

    it('lowers what is copied and what is over the limit', () => {
      const selected = applyExclusions(preview, new Set(['alert-1']));

      expect(selected.alerts).toMatchObject({ toCopy: 1002, overBy: 2, excluded: 1 });
    });

    it('leaves out the alerts an attack alone brought', () => {
      const selected = applyExclusions(preview, new Set(['attack-1']));

      // alert-b also belongs to the kept attack-2, so only alert-a leaves.
      expect(selected.alerts).toMatchObject({ toCopy: 1002, overBy: 2, excluded: 1 });
      expect(selected.attacks).toMatchObject({ toCopy: 1, excluded: 1 });
    });

    it('reports how many standalone alerts fit after the attacks left out', () => {
      expect(getRoomForAlerts(preview.attachments.alerts, preview.choices, new Set())).toBe(0);
      expect(
        getRoomForAlerts(preview.attachments.alerts, preview.choices, new Set(['attack-1']))
      ).toBe(1);
    });

    it('leaves out everything but the most recently added alerts', () => {
      expect(getKeysOutsideNewest(preview.choices.alerts, 1)).toEqual(['alert-3', 'alert-1']);
    });

    it('keeps the newest alerts that fit beside the attacks, replacing alert choices', () => {
      expect(getExclusionsKeepingNewest(preview, new Set(['attack-1', 'alert-2']))).toEqual(
        new Set(['attack-1', 'alert-3', 'alert-1'])
      );
    });

    describe('keeping the newest of every kind', () => {
      const otherChoice = (key: string, addedAt: string, countsTowardLimit: boolean) => ({
        key,
        sourceCaseId: 'case-1',
        addedAt,
        type: countsTowardLimit ? 'lens' : 'user',
        countsTowardLimit,
      });
      const kindsPreview = buildMergePreview({
        attachments: {
          observables: mergeSummary({ total: 3, toCopy: 3, max: 2, overBy: 1 }),
          other: mergeSummary({ total: 3, toCopy: 3, max: 1, overBy: 1 }),
          events: mergeSummary({ total: 1, toCopy: 1 }),
        },
        choices: choices({
          observables: ['2024-01-01', '2024-01-03', '2024-01-02'].map((day, position) => ({
            key: `obs-${position + 1}`,
            sourceCaseId: 'case-1',
            addedAt: `${day}T00:00:00.000Z`,
            typeKey: 'ipv4',
            value: `10.0.0.${position + 1}`,
          })),
          other: [
            otherChoice('lens-1', '2024-01-01T00:00:00.000Z', true),
            otherChoice('lens-2', '2024-01-02T00:00:00.000Z', true),
            otherChoice('note-1', '2024-01-01T00:00:00.000Z', false),
          ],
          events: [
            {
              key: 'event-1',
              sourceCaseId: 'case-1',
              addedAt: '2024-01-01T00:00:00.000Z',
              eventId: 'event-1',
              index: '.events',
            },
          ],
        }),
      });

      it('leaves out the oldest items that count toward each limit', () => {
        expect(getExclusionsKeepingNewest(kindsPreview, new Set())).toEqual(
          new Set(['obs-1', 'lens-1'])
        );
      });

      it('keeps choices on kinds without a limit and items that never count', () => {
        const excluded = getExclusionsKeepingNewest(kindsPreview, new Set(['event-1', 'note-1']));

        expect(excluded).toEqual(new Set(['event-1', 'note-1', 'obs-1', 'lens-1']));
        expect(applyExclusions(kindsPreview, excluded)).toMatchObject({
          observables: { overBy: 0, toCopy: 2 },
          other: { overBy: 0, toCopy: 1 },
        });
      });

      it('only touches the kinds asked for', () => {
        expect(getExclusionsKeepingNewest(kindsPreview, new Set(), ['observables'])).toEqual(
          new Set(['obs-1'])
        );
      });
    });

    it('sends the shorter list per kind', () => {
      expect(buildAttachmentsRequest(preview.choices, new Set(['alert-1']))).toEqual({
        alerts: { mode: 'exclude', keys: ['alert-1'] },
      });
      expect(
        buildAttachmentsRequest(preview.choices, new Set(['alert-1', 'alert-2', 'attack-2']))
      ).toEqual({
        alerts: { mode: 'keep', keys: ['alert-3'] },
        attacks: { mode: 'exclude', keys: ['attack-2'] },
      });
    });

    it('sends nothing without exclusions the preview offers', () => {
      expect(buildAttachmentsRequest(preview.choices, new Set())).toBeUndefined();
      expect(buildAttachmentsRequest(preview.choices, new Set(['stale']))).toBeUndefined();
    });
  });

  describe('steps', () => {
    const preview = buildMergePreview({ conflicts: [] });
    const states = (overrides: Partial<MergeStepStates> = {}): MergeStepStates => ({
      cases: { isBlocked: false, isSkippable: false },
      differences: { isBlocked: false, isSkippable: false },
      attachments: { isBlocked: false, isSkippable: false },
      review: { isBlocked: false, isSkippable: false },
      ...overrides,
    });

    it('blocks the Cases step until there are two cases and, for an existing case, the one to keep', () => {
      const ready = {
        caseCount: 2,
        canChooseDestination: true,
        mergeInto: 'new' as const,
        hasDestination: false,
      };
      expect(getCasesStepBlocker(ready)).toBeUndefined();
      expect(getCasesStepBlocker({ ...ready, caseCount: 1 })).toBe('Add another case to merge');
      expect(getCasesStepBlocker({ ...ready, canChooseDestination: false })).toBe(
        'Add an open case to merge into'
      );
      expect(getCasesStepBlocker({ ...ready, mergeInto: 'existing' })).toBe(
        'Choose the case to merge into'
      );
      expect(
        getCasesStepBlocker({ ...ready, mergeInto: 'existing', hasDestination: true })
      ).toBeUndefined();
    });

    it('says nothing while values are left to choose, as the conflicts bar counts them', () => {
      expect(
        getDifferencesStepBlocker({
          total: 6,
          resolved: 4,
          blocking: [
            { key: 'category', label: 'Category', state: 'chooseOne' },
            { key: 'extendedFields.impact_as_keyword', label: 'Impact', state: 'required' },
            { key: 'template', label: 'Template', state: 'chooseOne' },
          ],
        })
      ).toBeUndefined();
    });

    it('names a required, invalid or over-limit field', () => {
      const summary = (state: 'required' | 'invalid' | 'overLimit') => ({
        total: 0,
        resolved: 0,
        blocking: [{ key: 'tags' as const, label: 'Tags', state }],
      });
      expect(getDifferencesStepBlocker(summary('required'))).toBe('Fill in Tags to continue');
      expect(getDifferencesStepBlocker(summary('invalid'))).toBe('Change Tags to continue');
      expect(getDifferencesStepBlocker(summary('overLimit'))).toBe(
        'Bring Tags within its limit to continue'
      );
      expect(getDifferencesStepBlocker({ total: 2, resolved: 2, blocking: [] })).toBeUndefined();
    });

    it('asks to leave out what is over a limit', () => {
      const overLimit = buildMergePreview({
        conflicts: [],
        attachments: {
          alerts: {
            ...mergeSummary({ total: 1240, toCopy: 1240, max: 1000, overBy: 240 }),
            byRule: [],
          },
        },
      });

      expect(getAttachmentsStepBlocker(applyExclusions(overLimit, new Set()))).toBe(
        'Leave out 240 alerts to continue'
      );
      expect(getAttachmentsStepBlocker(applyExclusions(preview, new Set()))).toBeUndefined();
    });

    it('skips the Differences step only when nothing differs or needs a value', () => {
      expect(isDifferencesStepSkippable({ total: 0, resolved: 0, blocking: [] })).toBe(true);
      expect(isDifferencesStepSkippable({ total: 1, resolved: 1, blocking: [] })).toBe(false);
      expect(
        isDifferencesStepSkippable({
          total: 0,
          resolved: 0,
          blocking: [{ key: 'tags', label: 'Tags', state: 'overLimit' }],
        })
      ).toBe(false);
    });

    it('passes the steps with nothing to decide', () => {
      const skipBoth = states({
        differences: { isBlocked: false, isSkippable: true },
        attachments: { isBlocked: false, isSkippable: true },
      });
      expect(getNextStep('cases', skipBoth)).toEqual({
        step: 'review',
        passed: ['differences', 'attachments'],
      });
      expect(getPreviousStep('review', skipBoth)).toBe('cases');

      const skipAttachments = states({ attachments: { isBlocked: false, isSkippable: true } });
      expect(getNextStep('differences', skipAttachments)).toEqual({
        step: 'review',
        passed: ['attachments'],
      });
      expect(getPreviousStep('review', skipAttachments)).toBe('differences');
      expect(getNextStep('cases', states())).toEqual({ step: 'differences', passed: [] });
    });

    it('opens a step only when every step before it can be passed', () => {
      const blocked = states({ differences: { isBlocked: true, isSkippable: false } });
      expect(canOpenStep('differences', blocked)).toBe(true);
      expect(canOpenStep('attachments', blocked)).toBe(false);
      expect(canOpenStep('review', blocked)).toBe(false);
      expect(getFirstBlockedStep(blocked)).toBe('differences');
      expect(getFirstBlockedStep(states())).toBeUndefined();
    });
  });

  describe('getMergedCasePreview', () => {
    it("names the cases a chosen value comes from, or marks the user's own", () => {
      const preview = buildMergePreview();
      expect(getMergedCasePreview(preview, { title: 'Follow-up' }).title).toEqual({
        value: 'Follow-up',
        caseIds: ['case-2'],
        source: 'cases',
      });
      expect(getMergedCasePreview(preview, { title: 'Credential attacks' }).title).toEqual({
        value: 'Credential attacks',
        caseIds: [],
        source: 'own',
      });
    });

    it('takes the shared value for a field the cases agree on', () => {
      const merged = getMergedCasePreview(buildMergePreview(), { title: 'Phishing' });
      expect(merged.severity).toEqual({
        value: CaseSeverity.LOW,
        caseIds: ['case-1', 'case-2'],
        source: 'cases',
      });
      expect(merged.tags).toEqual(['phishing']);
    });

    it('marks combined descriptions', () => {
      const preview = buildMergePreview({
        fields: {
          description: {
            value: 'First',
            provenance: 'oldest',
            sourceCaseId: 'case-1',
            options: [
              { value: 'First', caseIds: ['case-1'] },
              { value: 'Second', caseIds: ['case-2'] },
            ],
            hasConflict: true,
            combinedValue: 'First and second',
            combinedLength: 16,
          },
        },
      });
      expect(
        getMergedCasePreview(preview, { description: 'First and second' }).description
      ).toEqual({ value: 'First and second', caseIds: ['case-1', 'case-2'], source: 'combined' });
    });

    it('formats template field lists', () => {
      expect(formatTemplateFieldValue('["VPN","Okta"]')).toBe('VPN, Okta');
      expect(formatTemplateFieldValue('[{"uid":"u1","name":"Priya Raman"}]')).toBe('Priya Raman');
      expect(formatTemplateFieldValue('Phishing')).toBe('Phishing');
    });
  });

  describe('splitOverflow', () => {
    it('shows everything up to the maximum, then a few and hides the rest', () => {
      expect(splitOverflow([1, 2, 3, 4], { max: 4, visibleWhenOverflowing: 4 })).toEqual({
        visible: [1, 2, 3, 4],
        hidden: [],
      });
      expect(splitOverflow([1, 2, 3, 4, 5, 6], { max: 5, visibleWhenOverflowing: 4 })).toEqual({
        visible: [1, 2, 3, 4],
        hidden: [5, 6],
      });
    });
  });

  describe('getChoiceKeys', () => {
    it('lists every field the choices hold', () => {
      expect(
        getChoiceKeys({
          title: 'Phishing',
          customFields: { ticket: { type: CustomFieldTypes.TEXT, value: 'INC-1' } },
          extendedFields: { impact_as_keyword: 'High' },
        })
      ).toEqual(['title', 'customFields.ticket', 'extendedFields.impact_as_keyword']);
    });
  });

  describe('toChoicesFromFields', () => {
    const phishingTemplate = { id: 'template-1', name: 'Phishing', isEnabled: true };
    const preview = buildMergePreview({
      fields: {
        template: {
          value: null,
          provenance: 'none',
          sourceCaseId: null,
          options: [],
          hasConflict: true,
          candidates: [phishingTemplate],
        },
      },
    });

    it('turns the request fields the AI chose into choices', () => {
      expect(
        toChoicesFromFields(preview, {
          title: 'Phishing wave',
          severity: CaseSeverity.HIGH,
          category: null,
          template: { id: 'template-1' },
          customFields: [{ key: 'ticket', type: CustomFieldTypes.TEXT, value: 'INC-1' }],
          extendedFields: { impact_as_keyword: 'High' },
        })
      ).toEqual({
        title: 'Phishing wave',
        severity: CaseSeverity.HIGH,
        category: null,
        template: phishingTemplate,
        customFields: { ticket: { type: CustomFieldTypes.TEXT, value: 'INC-1' } },
        extendedFields: { impact_as_keyword: 'High' },
      });
    });

    it('leaves out a template the cases do not use', () => {
      expect(toChoicesFromFields(preview, { template: { id: 'unknown' } })).toEqual({});
    });
  });

  describe('toAiReasons', () => {
    it('keys each reason by its field', () => {
      expect(
        toAiReasons([
          { field: 'title', reason: 'Covers both.' },
          { field: 'customFields', key: 'ticket', reason: 'Only #118 has one.' },
          { field: 'extendedFields', key: 'impact_as_keyword', reason: 'Highest.' },
        ])
      ).toEqual(
        new Map([
          ['title', 'Covers both.'],
          ['customFields.ticket', 'Only #118 has one.'],
          ['extendedFields.impact_as_keyword', 'Highest.'],
        ])
      );
    });
  });

  describe('buildPreviewFields', () => {
    it('sends only what the template evaluates', () => {
      expect(
        buildPreviewFields({
          title: 'ignored',
          template: { id: 'template-1', name: 'Phishing', isEnabled: true },
          extendedFields: { verdict_as_keyword: 'malicious' },
        })
      ).toEqual({
        template: { id: 'template-1' },
        extendedFields: { verdict_as_keyword: 'malicious' },
      });
      expect(buildPreviewFields({ template: null })).toEqual({ template: null });
      expect(buildPreviewFields({ title: 'only title' })).toBeUndefined();
    });
  });

  describe('buildMergeRequest', () => {
    it('sends only the fields the user acted on', () => {
      expect(
        buildMergeRequest({
          caseIds: ['case-1', 'case-2'],
          choices: {
            title: ' Phishing ',
            severity: CaseSeverity.HIGH,
            assignees: [{ uid: 'u1' }],
            customFields: {
              cf1: { type: CustomFieldTypes.TOGGLE, value: true },
              cf2: { type: CustomFieldTypes.TEXT, value: '' },
            },
          },
          includeAssignees: false,
          closeSources: true,
        })
      ).toEqual({
        caseIds: ['case-1', 'case-2'],
        fields: {
          title: 'Phishing',
          severity: CaseSeverity.HIGH,
          customFields: [
            { key: 'cf1', type: CustomFieldTypes.TOGGLE, value: true },
            { key: 'cf2', type: CustomFieldTypes.TEXT, value: null },
          ],
        },
        closeSources: true,
      });
    });

    it('sends the destination, the choices and closeSources', () => {
      expect(
        buildMergeRequest({
          caseIds: ['case-1', 'case-2'],
          destinationCaseId: 'case-1',
          choices: {},
          includeAssignees: true,
          closeSources: false,
          attachments: { alerts: { mode: 'exclude', keys: ['alert-1'] } },
        })
      ).toEqual({
        caseIds: ['case-1', 'case-2'],
        destinationCaseId: 'case-1',
        attachments: { alerts: { mode: 'exclude', keys: ['alert-1'] } },
        closeSources: false,
      });
    });
  });
});
