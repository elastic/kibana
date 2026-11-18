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
import {
  applyExclusions,
  buildAttachmentsRequest,
  buildMergeRequest,
  buildPreviewFields,
  canMergeCases,
  combineDescriptions,
  formatCaseList,
  getAttachmentsToCopyCount,
  getCaseReference,
  getConflictKey,
  getFieldValues,
  getKeysOutsideNewest,
  getLatestDestinationId,
  getMergeBlockingReason,
  getMergeDisabledReason,
  getRoomForAlerts,
  getUnresolvedConflicts,
  hasFieldChoice,
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

  describe('getLatestDestinationId', () => {
    it('returns the last destination', () => {
      expect(
        getLatestDestinationId({
          mergedInto: ['first', 'latest'],
          mergedAt: '2024-01-01T00:00:00.000Z',
          closedByMerge: true,
        })
      ).toBe('latest');
    });

    it('returns undefined for a case that was never merged', () => {
      expect(getLatestDestinationId(null)).toBeUndefined();
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
      expect(getRoomForAlerts(preview.attachments.alerts, preview.choices!, new Set())).toBe(0);
      expect(
        getRoomForAlerts(preview.attachments.alerts, preview.choices!, new Set(['attack-1']))
      ).toBe(1);
    });

    it('leaves out everything but the most recently added alerts', () => {
      expect(getKeysOutsideNewest(preview.choices!.alerts, 1)).toEqual(['alert-3', 'alert-1']);
    });

    it('adds up every attachment kind that is copied', () => {
      expect(getAttachmentsToCopyCount(applyExclusions(preview, new Set()))).toBe(1007);
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

    it('sends nothing without choices or exclusions', () => {
      expect(buildAttachmentsRequest(null, new Set(['alert-1']))).toBeUndefined();
      expect(buildAttachmentsRequest(preview.choices, new Set(['stale']))).toBeUndefined();
    });
  });

  describe('getMergeBlockingReason', () => {
    const preview = buildMergePreview({ conflicts: [] });
    const args = {
      caseCount: 2,
      canChooseDestination: true,
      preview,
      attachments: applyExclusions(preview, new Set()),
      values: getFieldValues(preview, {}),
      unresolvedConflicts: [],
      includeAssignees: true,
    };

    it('does not block a valid merge', () => {
      expect(getMergeBlockingReason(args)).toBeUndefined();
    });

    it('blocks until every conflict is resolved', () => {
      expect(
        getMergeBlockingReason({
          ...args,
          unresolvedConflicts: [titleConflict, { ...titleConflict, field: 'severity' }],
        })
      ).toBe('Resolve 2 conflicts to merge');
    });

    it('names an empty required field', () => {
      expect(
        getMergeBlockingReason({
          ...args,
          unresolvedConflicts: [
            {
              field: 'extendedFields',
              key: 'verdict_as_keyword',
              label: 'Verdict',
              reason: 'required',
              resolved: false,
            },
          ],
        })
      ).toBe('Fill in Verdict to merge');
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

      expect(
        getMergeBlockingReason({
          ...args,
          preview: overLimit,
          attachments: applyExclusions(overLimit, new Set()),
        })
      ).toBe('Leave out 240 alerts to merge');
    });

    it('needs a destination the user can merge into', () => {
      expect(getMergeBlockingReason({ ...args, canChooseDestination: false })).toBe(
        'Add an open case to merge into'
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
          note: '  ',
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

    it('sends the destination, the choices, the note and closeSources', () => {
      expect(
        buildMergeRequest({
          caseIds: ['case-1', 'case-2'],
          destinationCaseId: 'case-1',
          choices: {},
          includeAssignees: true,
          closeSources: false,
          note: ' Duplicates ',
          attachments: { alerts: { mode: 'exclude', keys: ['alert-1'] } },
        })
      ).toEqual({
        caseIds: ['case-1', 'case-2'],
        destinationCaseId: 'case-1',
        attachments: { alerts: { mode: 'exclude', keys: ['alert-1'] } },
        closeSources: false,
        note: 'Duplicates',
      });
    });
  });
});
