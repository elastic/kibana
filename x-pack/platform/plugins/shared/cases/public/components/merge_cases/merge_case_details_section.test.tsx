/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import type { MergeConflict } from '../../../common/types/api';
import { CustomFieldTypes } from '../../../common/types/domain';
import { renderWithTestingProviders } from '../../common/mock';
import { useBulkGetUserProfiles } from '../../containers/user_profiles/use_bulk_get_user_profiles';
import { MergeCaseDetailsSection } from './merge_case_details_section';
import { buildMergePreview } from './mock';
import type { MergeFieldChoices, MergeFieldKey } from './utils';
import { getConflictKey, getFieldValues } from './utils';

jest.mock('../../common/lib/kibana');
jest.mock('../../containers/user_profiles/use_bulk_get_user_profiles');

const useBulkGetUserProfilesMock = useBulkGetUserProfiles as jest.Mock;

const phishingTemplate = { id: 'template-1', name: 'Phishing', isEnabled: true };
const retiredTemplate = { id: 'template-2', name: 'Retired', isEnabled: false };

const templateConflict: MergeConflict = {
  field: 'template',
  reason: 'differentValues',
  resolved: false,
};
const requiredVerdict: MergeConflict = {
  field: 'extendedFields',
  key: 'verdict_as_keyword',
  label: 'Verdict',
  reason: 'required',
  message: 'Verdict is required.',
  resolved: false,
};

const preview = buildMergePreview({
  conflicts: [templateConflict, requiredVerdict],
  fields: {
    template: {
      value: phishingTemplate,
      provenance: 'mostUsed',
      sourceCaseId: null,
      options: [
        { value: phishingTemplate, caseIds: ['case-1'] },
        { value: retiredTemplate, caseIds: ['case-2'] },
      ],
      hasConflict: true,
      candidates: [phishingTemplate, retiredTemplate],
    },
    customFields: [
      {
        key: 'escalated',
        type: CustomFieldTypes.TOGGLE,
        label: 'Escalated',
        required: false,
        value: true,
        provenance: 'only',
        sourceCaseId: 'case-1',
        options: [{ value: true, caseIds: ['case-1'] }],
        hasConflict: false,
      },
    ],
    extendedFields: [
      {
        key: 'verdict_as_keyword',
        name: 'verdict',
        label: 'Verdict',
        control: 'INPUT_TEXT',
        multiValue: false,
        required: true,
        isGlobal: false,
        errors: [],
        value: '',
        provenance: 'none',
        sourceCaseId: null,
        options: [],
        hasConflict: false,
      },
    ],
    notCopiedFields: [{ key: 'region_as_keyword', label: 'Region', caseIds: ['case-2'] }],
  },
});

describe('MergeCaseDetailsSection', () => {
  const onSetField = jest.fn();
  const onSetCustomField = jest.fn();
  const onSetExtendedField = jest.fn();

  const renderSection = (choices: MergeFieldChoices = {}) => {
    const unresolvedKeys = new Set<MergeFieldKey>(
      preview.conflicts.map((conflict) => getConflictKey(conflict))
    );
    return renderWithTestingProviders(
      <MergeCaseDetailsSection
        preview={preview}
        values={getFieldValues(preview, choices)}
        choices={choices}
        unresolvedKeys={unresolvedKeys}
        onSetField={onSetField}
        onSetCustomField={onSetCustomField}
        onSetExtendedField={onSetExtendedField}
        showAssignees={false}
        isDisabled={false}
      />
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useBulkGetUserProfilesMock.mockReturnValue({ data: new Map(), isLoading: false });
  });

  it('suggests the template most cases use and lets the user pick no template', async () => {
    renderSection();

    expect(screen.getByTestId('merge-cases-field-template-value')).toHaveTextContent('Phishing');
    expect(screen.getByTestId('merge-cases-field-template-provenance')).toHaveTextContent(
      'Suggested: Used by most cases'
    );

    await userEvent.click(screen.getByTestId('merge-cases-field-template-conflict-trigger'));
    await waitForEuiPopoverOpen();
    await userEvent.click(screen.getByTestId('merge-cases-no-template'));

    expect(onSetField).toHaveBeenCalledWith('template', null);
  });

  it('marks a required template field and shows why it blocks', () => {
    renderSection();

    expect(
      screen.getByTestId('merge-cases-field-ext-verdict_as_keyword-required')
    ).toHaveTextContent('Required');
    expect(screen.getByTestId('merge-cases-field-ext-verdict_as_keyword-errors')).toHaveTextContent(
      'Verdict is required.'
    );
  });

  it('saves a typed template field value when the input loses focus', async () => {
    renderSection();

    await userEvent.click(screen.getByTestId('merge-cases-field-ext-verdict_as_keyword-edit'));
    await userEvent.type(
      screen.getByTestId('merge-cases-field-ext-verdict_as_keyword-input'),
      'malicious'
    );
    expect(onSetExtendedField).not.toHaveBeenCalled();
    await userEvent.tab();

    expect(onSetExtendedField).toHaveBeenCalledWith('verdict_as_keyword', 'malicious');
  });

  it('shows custom fields by type', () => {
    renderSection();

    expect(screen.getByTestId('merge-cases-field-custom-escalated-value')).toHaveTextContent('On');
  });

  it('lists the template fields that stay on the source cases', () => {
    renderSection();

    expect(screen.getByTestId('merge-cases-not-copied-fields')).toHaveTextContent('Region');
  });
});
