/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseSeverity } from '../../../../common/types/domain';
import type { MergeFieldKey } from '../utils';
import {
  getChosenOptionIssue,
  getDifferencesSummary,
  getFillableKeys,
  getFillFromCaseChoices,
  isTemplateDecided,
} from './field_state';
import {
  IDENTITY_TEMPLATE,
  attackVectorField,
  buildConflict,
  buildDifferencesPreview,
  businessImpactField,
} from './test_fixtures';

const noReview = new Set<MergeFieldKey>();

describe('getDifferencesSummary', () => {
  it('counts every field that differs and blocks them all until the user picks', () => {
    const preview = buildDifferencesPreview();
    const summary = getDifferencesSummary(preview, {}, noReview);

    // The template-only attack vector is hidden until the template is decided.
    expect(summary.total).toBe(7);
    expect(summary.resolved).toBe(0);
    expect(summary.blocking.map(({ key }) => key)).toEqual([
      'template',
      'title',
      'description',
      'severity',
      'category',
      'customFields.ticket',
      'extendedFields.verdict_as_keyword',
    ]);
    expect(summary.blocking.every(({ state }) => state === 'chooseOne')).toBe(true);
  });

  it('settles a field once the user picks a value', () => {
    const preview = buildDifferencesPreview();
    const summary = getDifferencesSummary(
      preview,
      { title: 'Password spray against the Okta tenant', severity: CaseSeverity.HIGH },
      noReview
    );

    expect(summary.resolved).toBe(2);
    expect(summary.blocking.map(({ key }) => key)).not.toContain('title');
  });

  it('shows template fields once the template is decided', () => {
    const preview = buildDifferencesPreview();
    const summary = getDifferencesSummary(preview, { template: IDENTITY_TEMPLATE }, noReview);

    expect(summary.blocking.map(({ key }) => key)).toContain(
      'extendedFields.attack_vector_as_keyword'
    );
  });

  it('keeps a required field open until the server accepts a value', () => {
    const preview = buildDifferencesPreview({
      conflicts: [buildConflict('extendedFields', businessImpactField.key, 'required')],
      fields: {
        ...buildDifferencesPreview().fields,
        template: { ...buildDifferencesPreview().fields.template, hasConflict: false },
        extendedFields: [businessImpactField],
      },
    });
    const summary = getDifferencesSummary(
      preview,
      { extendedFields: { [businessImpactField.key]: 'Outage' } },
      noReview
    );

    expect(summary.blocking).toEqual([
      {
        key: 'extendedFields.business_impact_as_keyword',
        label: 'Business impact',
        state: 'required',
      },
    ]);
  });

  it('flags a picked value the template rejects', () => {
    const preview = buildDifferencesPreview();
    const choices = {
      template: IDENTITY_TEMPLATE,
      extendedFields: { [attackVectorField.key]: 'Brute force' },
    };

    expect(
      getChosenOptionIssue(preview, choices, 'extendedFields.attack_vector_as_keyword')?.code
    ).toBe('notAnOption');
    expect(
      getDifferencesSummary(preview, choices, noReview).blocking.find(
        ({ key }) => key === 'extendedFields.attack_vector_as_keyword'
      )?.state
    ).toBe('invalid');
  });

  it('blocks tags and assignees over their limits', () => {
    const preview = buildDifferencesPreview({ conflicts: [] });
    const tooManyTags = Array.from({ length: 203 }, (_, index) => `tag-${index}`);
    const summary = getDifferencesSummary(preview, { tags: tooManyTags }, noReview);

    expect(summary.blocking).toEqual([{ key: 'tags', label: 'Tags', state: 'overLimit' }]);
  });

  it("doesn't settle a field with an emptied value", () => {
    const preview = buildDifferencesPreview();
    const summary = getDifferencesSummary(preview, { title: '   ' }, noReview);

    expect(summary.blocking.map(({ key }) => key)).toContain('title');
  });

  it('reopens a field the server refused', () => {
    const preview = buildDifferencesPreview();
    const summary = getDifferencesSummary(
      preview,
      { title: 'Something' },
      new Set<MergeFieldKey>(['title'])
    );

    expect(summary.blocking.map(({ key }) => key)).toContain('title');
  });
});

describe('isTemplateDecided', () => {
  it('is decided when the cases agree or the user picked', () => {
    const preview = buildDifferencesPreview();
    expect(isTemplateDecided(preview, {})).toBe(false);
    expect(isTemplateDecided(preview, { template: null })).toBe(true);
  });
});

describe('getFillFromCaseChoices', () => {
  it("takes one case's value for every field that differs", () => {
    const preview = buildDifferencesPreview();
    const filled = getFillFromCaseChoices(preview, {}, 'c124');

    expect(filled).toEqual({
      template: IDENTITY_TEMPLATE,
      title: 'Impossible travel for j.chen (Lagos to Oslo)',
      description: 'svc-backup failed 520 logins.',
      severity: CaseSeverity.CRITICAL,
      category: 'Identity',
      customFields: { ticket: { type: 'text', value: 'INC-20457' } },
      extendedFields: { verdict_as_keyword: 'True positive' },
    });
  });

  it('keeps what a field has when the case has no value or the template rejects it', () => {
    const preview = buildDifferencesPreview();
    const filled = getFillFromCaseChoices(preview, { template: IDENTITY_TEMPLATE }, 'c118');

    // #118 has no ticket, and its attack vector isn't an Identity incident option.
    expect(filled.customFields).toBeUndefined();
    expect(filled.extendedFields).toEqual({ verdict_as_keyword: 'Undetermined' });
  });

  it('replaces values that are already set, picked or filled', () => {
    const preview = buildDifferencesPreview();
    const choices = { title: 'Mine', severity: CaseSeverity.LOW };

    expect(getFillableKeys(preview, choices)).toEqual(
      expect.arrayContaining(['title', 'severity'])
    );
    expect(getFillFromCaseChoices(preview, choices, 'c118')).toMatchObject({
      title: preview.fields.title.options.find(({ caseIds }) => caseIds.includes('c118'))?.value,
      severity: CaseSeverity.HIGH,
      category: 'Credential access',
    });
  });
});
