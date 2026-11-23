/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import type { MergeCasesPreviewResponse } from '../../../../common/types/api';
import { CaseSeverity, CustomFieldTypes } from '../../../../common/types/domain';
import { renderWithTestingProviders } from '../../../common/mock';
import { useGetCategories } from '../../../containers/use_get_categories';
import { useGetTags } from '../../../containers/use_get_tags';
import { useBulkGetUserProfiles } from '../../../containers/user_profiles/use_bulk_get_user_profiles';
import { useSuggestUserProfiles } from '../../../containers/user_profiles/use_suggest_user_profiles';
import type { MergeFieldChoices, MergeFieldKey } from '../utils';
import type { DifferencesStepProps } from './differences_step';
import { DifferencesStep } from './differences_step';
import { focusFieldRow } from '../value_cards/field_row';
import {
  CASES,
  IDENTITY_TEMPLATE,
  buildConflict,
  buildDifferencesPreview,
  businessImpactField,
} from '../value_cards/test_fixtures';

jest.mock('../../../common/lib/kibana');
jest.mock('../../../containers/use_get_tags');
jest.mock('../../../containers/use_get_categories');
jest.mock('../../../containers/user_profiles/use_bulk_get_user_profiles');
jest.mock('../../../containers/user_profiles/use_suggest_user_profiles');

const useGetTagsMock = useGetTags as jest.Mock;
const useGetCategoriesMock = useGetCategories as jest.Mock;
const useBulkGetUserProfilesMock = useBulkGetUserProfiles as jest.Mock;
const useSuggestUserProfilesMock = useSuggestUserProfiles as jest.Mock;

const setupStep = (
  overrides: Partial<DifferencesStepProps> & { preview?: MergeCasesPreviewResponse } = {}
) => {
  const props: DifferencesStepProps = {
    preview: buildDifferencesPreview(),
    choices: {},
    needsReview: new Set<MergeFieldKey>(),
    aiReasons: new Map<MergeFieldKey, string>(),
    caseAssignmentAuthorized: true,
    isDisabled: false,
    onSetField: jest.fn(),
    onSetCustomField: jest.fn(),
    onSetExtendedField: jest.fn(),
    onClearField: jest.fn(),
    ...overrides,
  };
  renderWithTestingProviders(<DifferencesStep {...props} />);
  return props;
};

const rowState = (key: string) =>
  screen.getByTestId(`merge-field-row-${key}`).getAttribute('data-merge-field-state');

describe('DifferencesStep', () => {
  beforeEach(() => {
    useGetTagsMock.mockReturnValue({ data: [], isLoading: false });
    useGetCategoriesMock.mockReturnValue({
      data: ['Credential access', 'Identity'],
      isLoading: false,
    });
    useBulkGetUserProfilesMock.mockReturnValue({ data: new Map(), isLoading: false });
    useSuggestUserProfilesMock.mockReturnValue({ data: [], isFetching: false });
  });

  it("shows the AI's reason on the fields it chose", () => {
    setupStep({
      choices: { severity: CaseSeverity.CRITICAL },
      aiReasons: new Map<MergeFieldKey, string>([['severity', '#124 is critical.']]),
    });

    const row = screen.getByTestId('merge-field-row-severity');
    expect(row).toHaveAttribute('data-merge-field-ai', 'true');
    expect(within(row).getByTestId('merge-field-row-state')).toHaveTextContent('Chosen by AI');
    expect(within(row).getByTestId('merge-field-ai-reason')).toHaveTextContent('#124 is critical.');
    expect(screen.getByTestId('merge-field-row-title')).not.toHaveAttribute('data-merge-field-ai');
  });

  it('groups the fields by kind, saying how many are left in each', () => {
    setupStep({ choices: { title: 'Password spray against the Okta tenant' } });

    const template = screen.getByTestId('merge-conflict-section-template');
    expect(within(template).getByTestId('merge-field-row-template')).toBeInTheDocument();
    const details = screen.getByTestId('merge-conflict-section-details');
    for (const key of ['title', 'description', 'severity', 'category']) {
      expect(within(details).getByTestId(`merge-field-row-${key}`)).toBeInTheDocument();
    }
    expect(within(details).getByTestId('merge-conflict-section-summary')).toHaveTextContent(
      '4 fields · 3 left'
    );
    const combined = screen.getByTestId('merge-conflict-section-combined');
    expect(within(combined).getByTestId('merge-field-row-tags')).toBeInTheDocument();
  });

  it('lists the differences with the template first and nothing picked', () => {
    setupStep();

    const rows = screen
      .getAllByTestId(/^merge-field-row-/)
      .map((row) => row.getAttribute('data-test-subj'))
      .filter((testSubj) => testSubj !== 'merge-field-row-state');
    expect(rows.slice(0, 5)).toEqual([
      'merge-field-row-template',
      'merge-field-row-title',
      'merge-field-row-description',
      'merge-field-row-severity',
      'merge-field-row-category',
    ]);
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).not.toBeChecked();
    }
    expect(rowState('title')).toBe('chooseOne');
    expect(
      within(screen.getByTestId('merge-field-row-title')).getByTestId('merge-field-row-state')
    ).toHaveTextContent('Choose one');
  });

  it('records the value the user picks', async () => {
    const handlers = setupStep();

    await userEvent.click(screen.getByText('Impossible travel for j.chen (Lagos to Oslo)'));
    expect(handlers.onSetField).toHaveBeenCalledWith(
      'title',
      'Impossible travel for j.chen (Lagos to Oslo)'
    );
  });

  it('shows a picked field as chosen', () => {
    setupStep({ choices: { title: 'Password spray against the Okta tenant' } });

    expect(rowState('title')).toBe('chosen');
  });

  it('types a title no case holds into the Other card', async () => {
    const handlers = setupStep();

    await userEvent.click(screen.getByText('Other title'));
    await userEvent.type(screen.getByTestId('merge-other-input'), 'W');
    expect(handlers.onSetField).toHaveBeenCalledWith('title', 'W');
  });

  it('opens "Other title" over a picked title, starting from that title', async () => {
    setupStep({ choices: { title: 'Password spray against the Okta tenant' } });

    await userEvent.click(screen.getByText('Other title'));

    expect(screen.getByTestId('merge-other-input')).toHaveValue(
      'Password spray against the Okta tenant'
    );
  });

  it("offers each case's description the same way as a title", async () => {
    const handlers = setupStep();
    const row = within(screen.getByTestId('merge-field-row-description'));

    expect(row.getByText('Over 300 failed sign-ins.')).toBeInTheDocument();
    expect(row.getByText('svc-backup failed 520 logins.')).toBeInTheDocument();
    expect(row.getByText('Other description')).toBeInTheDocument();
    expect(row.queryByText(/Combine/)).not.toBeInTheDocument();

    await userEvent.click(row.getByText('svc-backup failed 520 logins.'));
    expect(handlers.onSetField).toHaveBeenCalledWith(
      'description',
      'svc-backup failed 520 logins.'
    );
  });

  it("starts your own description from every case's description", async () => {
    const handlers = setupStep();
    const row = within(screen.getByTestId('merge-field-row-description'));

    await userEvent.click(row.getByText('Other description'));

    const [[field, value]] = (handlers.onSetField as jest.Mock).mock.calls;
    expect(field).toBe('description');
    expect(value).toContain('**From #118**\n\nOver 300 failed sign-ins.');
    expect(value).toContain('**From #121, #124, #130**\n\nsvc-backup failed 520 logins.');
  });

  it('keeps your own description when Other is picked again', async () => {
    const handlers = setupStep({ choices: { description: 'My summary' } });
    const row = within(screen.getByTestId('merge-field-row-description'));

    expect(row.getByTestId('merge-other-input')).toHaveValue('My summary');
    await userEvent.click(row.getByText('Other description'));
    expect(handlers.onSetField).not.toHaveBeenCalled();
  });

  it('shows the template fields only once the template is decided', () => {
    setupStep();
    expect(
      screen.queryByTestId('merge-field-row-extendedFields.attack_vector_as_keyword')
    ).toBeNull();
    expect(screen.getByTestId('merge-template-fields-hidden')).toBeInTheDocument();
  });

  it("disables a value the chosen template doesn't offer", () => {
    setupStep({ choices: { template: IDENTITY_TEMPLATE } });

    const row = screen.getByTestId('merge-field-row-extendedFields.attack_vector_as_keyword');
    expect(within(row).getByTestId('merge-value-card-invalid')).toHaveTextContent(
      'Not an option in Identity incident'
    );
    expect(
      within(row)
        .getAllByRole('radio')
        .filter((radio) => (radio as HTMLInputElement).disabled)
    ).toHaveLength(1);
  });

  it('asks for a required template field no case has', () => {
    const preview = buildDifferencesPreview({
      conflicts: [buildConflict('extendedFields', businessImpactField.key, 'required')],
      fields: {
        ...buildDifferencesPreview().fields,
        template: { ...buildDifferencesPreview().fields.template, hasConflict: false },
        extendedFields: [businessImpactField],
      },
    });
    setupStep({ preview });

    const row = screen.getByTestId('merge-field-row-extendedFields.business_impact_as_keyword');
    expect(row).toHaveAttribute('data-merge-field-state', 'required');
    expect(within(row).getByTestId('merge-field-row-state')).toHaveTextContent(
      'Required by Credential access triage'
    );
    expect(within(row).getByTestId('merge-other-input')).toBeInTheDocument();
  });

  it('flags tags over the limit with how many to remove', () => {
    const tooMany = Array.from({ length: 203 }, (_, index) => `tag-${index}`);
    setupStep({ choices: { tags: tooMany } });

    expect(rowState('tags')).toBe('overLimit');
    expect(
      within(screen.getByTestId('merge-field-row-tags')).getByTestId('merge-field-row-state')
    ).toHaveTextContent('Remove 3');
  });

  it("locks assignees the user can't change", () => {
    const preview = buildDifferencesPreview();
    setupStep({
      preview: {
        ...preview,
        fields: {
          ...preview.fields,
          assignees: {
            ...preview.fields.assignees,
            canChange: false,
            unavailableReason: 'license',
          },
        },
      },
    });

    expect(rowState('assignees')).toBe('locked');
    expect(screen.getByTestId('merge-assignees-locked')).toBeInTheDocument();
  });

  it('lists the fields every case agrees on separately', async () => {
    const preview = buildDifferencesPreview({ conflicts: [buildConflict('severity')] });
    setupStep({
      preview: {
        ...preview,
        fields: {
          ...preview.fields,
          title: { ...preview.fields.title, hasConflict: false, value: 'Same title' },
        },
      },
    });

    await userEvent.click(screen.getByText(/Same in every case/));
    expect(screen.getByText('Same title')).toBeInTheDocument();
  });

  it('opens a case list from a "+N" chip without picking the value', async () => {
    const preview = buildDifferencesPreview();
    const handlers = setupStep({
      preview: {
        ...preview,
        fields: {
          ...preview.fields,
          category: {
            ...preview.fields.category,
            options: [
              { value: 'Identity', caseIds: ['c118', 'c121', 'c124', 'c130'] },
              { value: 'Credential access', caseIds: ['c118'] },
            ],
          },
        },
      },
    });

    await userEvent.click(
      within(screen.getByTestId('merge-field-row-category')).getByTestId('merge-case-refs-more')
    );
    await waitForEuiPopoverOpen();
    expect(handlers.onSetField).not.toHaveBeenCalled();
  });

  it('focuses the field Review sent the user back to', () => {
    setupStep({ focusField: 'category' });

    expect(screen.getByTestId('merge-field-row-category')).toHaveFocus();
  });

  it('collapses a section from its title, keeping its summary in view', async () => {
    setupStep();

    const details = screen.getByTestId('merge-conflict-section-details');
    const toggle = within(details).getByTestId('merge-conflict-section-toggle');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await userEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(within(details).getByTestId('merge-conflict-section-summary')).toHaveTextContent(
      '4 fields · 4 left'
    );
  });

  it('opens a collapsed section to focus a field in it', async () => {
    setupStep();
    const toggle = within(screen.getByTestId('merge-conflict-section-details')).getByTestId(
      'merge-conflict-section-toggle'
    );
    await userEvent.click(toggle);

    act(() => focusFieldRow('title'));

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('merge-field-row-title')).toHaveFocus();
  });

  it('scrolls smoothly to a field unless the user prefers reduced motion', () => {
    setupStep();
    const row = screen.getByTestId('merge-field-row-title');
    row.scrollIntoView = jest.fn();
    const originalMatchMedia = window.matchMedia;
    const matchMedia = jest.fn().mockReturnValue({ matches: false });
    window.matchMedia = matchMedia;

    focusFieldRow('title', { smooth: true });
    expect(row.scrollIntoView).toHaveBeenLastCalledWith({ block: 'center', behavior: 'smooth' });
    expect(row).toHaveFocus();

    matchMedia.mockReturnValue({ matches: true });
    focusFieldRow('title', { smooth: true });
    expect(row.scrollIntoView).toHaveBeenLastCalledWith({ block: 'center', behavior: 'auto' });

    window.matchMedia = originalMatchMedia;
  });

  describe('values every case agrees on', () => {
    const allCases = CASES.map(({ id }) => id);
    const agreedPreview = (): MergeCasesPreviewResponse => {
      const preview = buildDifferencesPreview({ conflicts: [buildConflict('severity')] });
      return {
        ...preview,
        fields: {
          ...preview.fields,
          title: {
            ...preview.fields.title,
            value: 'Same title',
            provenance: 'same',
            options: [{ value: 'Same title', caseIds: allCases }],
            hasConflict: false,
          },
          customFields: [
            {
              key: 'escalated',
              type: CustomFieldTypes.TOGGLE,
              label: 'Escalated to IR',
              required: false,
              value: false,
              provenance: 'same',
              sourceCaseId: null,
              options: [{ value: false, caseIds: allCases }],
              hasConflict: false,
            },
          ],
        },
      };
    };
    const sameRow = (key: string) => within(screen.getByTestId(`merge-same-row-${key}`));
    const openSection = () =>
      userEvent.click(
        within(screen.getByTestId('merge-same-in-every-case')).getByTestId(
          'merge-conflict-section-toggle'
        )
      );

    it('edits a value beside it and saves it', async () => {
      const handlers = setupStep({ preview: agreedPreview() });
      await openSection();

      await userEvent.click(sameRow('title').getByRole('button', { name: 'Edit Title' }));
      const input = sameRow('title').getByTestId('merge-other-input');
      expect(input).toHaveValue('Same title');
      await userEvent.clear(input);
      await userEvent.type(input, 'Credential attacks on j.chen{enter}');

      expect(handlers.onSetField).toHaveBeenCalledWith('title', 'Credential attacks on j.chen');
      expect(sameRow('title').queryByTestId('merge-same-edit-form')).toBeNull();
    });

    it('switches a toggle every case agrees on', async () => {
      const handlers = setupStep({ preview: agreedPreview() });
      await openSection();
      const row = sameRow('customFields.escalated');

      await userEvent.click(row.getByRole('button', { name: 'Edit Escalated to IR' }));
      await userEvent.click(row.getByRole('switch'));
      await userEvent.click(row.getByTestId('merge-same-save'));

      expect(handlers.onSetCustomField).toHaveBeenCalledWith('escalated', {
        type: CustomFieldTypes.TOGGLE,
        value: true,
      });
    });

    it('keeps the value on Cancel and gives focus back to Edit', async () => {
      const handlers = setupStep({ preview: agreedPreview() });
      await openSection();
      const row = sameRow('title');

      await userEvent.click(row.getByRole('button', { name: 'Edit Title' }));
      await userEvent.type(row.getByTestId('merge-other-input'), ' (draft)');
      await userEvent.click(row.getByTestId('merge-same-cancel'));

      expect(handlers.onSetField).not.toHaveBeenCalled();
      expect(row.getByTestId('merge-same-value')).toHaveTextContent('Same title');
      expect(row.getByRole('button', { name: 'Edit Title' })).toHaveFocus();
    });

    it("won't save an empty title, and saving the cases' value changes nothing", async () => {
      const handlers = setupStep({ preview: agreedPreview() });
      await openSection();
      const row = sameRow('title');

      await userEvent.click(row.getByRole('button', { name: 'Edit Title' }));
      await userEvent.clear(row.getByTestId('merge-other-input'));
      expect(row.getByTestId('merge-same-save')).toBeDisabled();

      await userEvent.type(row.getByTestId('merge-other-input'), 'Same title');
      await userEvent.click(row.getByTestId('merge-same-save'));
      expect(handlers.onClearField).toHaveBeenCalledWith('title');
      expect(handlers.onSetField).not.toHaveBeenCalled();
    });

    it('shows a change with what the cases hold, opens on it, and undoes it', async () => {
      const handlers = setupStep({
        preview: agreedPreview(),
        choices: {
          customFields: { escalated: { type: CustomFieldTypes.TOGGLE, value: true } },
        },
      });
      const section = within(screen.getByTestId('merge-same-in-every-case'));
      expect(section.getByTestId('merge-conflict-section-toggle')).toHaveAttribute(
        'aria-expanded',
        'true'
      );
      expect(section.getByTestId('merge-conflict-section-summary')).toHaveTextContent(
        '2 fields · 1 changed'
      );

      const row = sameRow('customFields.escalated');
      expect(row.getByTestId('merge-same-value')).toHaveTextContent('On');
      expect(row.getByTestId('merge-same-changed-from')).toHaveTextContent('Off in all 4 cases');
      expect(row.getByTestId('merge-same-your-change')).toHaveTextContent('Your change');

      await userEvent.click(
        row.getByRole('button', { name: 'Undo your change to Escalated to IR' })
      );
      expect(handlers.onClearField).toHaveBeenCalledWith('customFields.escalated');
    });

    it('opens the collapsed section to focus a field Review sent the user back to', () => {
      setupStep({ preview: agreedPreview() });

      act(() => focusFieldRow('title'));

      expect(screen.getByTestId('merge-same-row-title')).toHaveFocus();
    });
  });

  it('says when nothing differs', () => {
    const choices: MergeFieldChoices = {};
    setupStep({ preview: buildDifferencesPreview({ conflicts: [] }), choices });

    expect(screen.getByTestId('merge-differences-intro')).toHaveTextContent(
      'Every field is the same in all cases'
    );
  });
});
