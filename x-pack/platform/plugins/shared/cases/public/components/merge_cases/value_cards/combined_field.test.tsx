/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithTestingProviders } from '../../../common/mock';
import { useGetTags } from '../../../containers/use_get_tags';
import { useBulkGetUserProfiles } from '../../../containers/user_profiles/use_bulk_get_user_profiles';
import { useSuggestUserProfiles } from '../../../containers/user_profiles/use_suggest_user_profiles';
import { CombinedAssigneesField, CombinedExtendedField, CombinedTagsField } from './combined_field';
import { buildDifferencesPreview, impactedSystemsField } from './test_fixtures';

jest.mock('../../../common/lib/kibana');
jest.mock('../../../containers/use_get_tags');
jest.mock('../../../containers/user_profiles/use_bulk_get_user_profiles');
jest.mock('../../../containers/user_profiles/use_suggest_user_profiles');

const useGetTagsMock = useGetTags as jest.Mock;
const useBulkGetUserProfilesMock = useBulkGetUserProfiles as jest.Mock;
const useSuggestUserProfilesMock = useSuggestUserProfiles as jest.Mock;

describe('combined fields', () => {
  beforeEach(() => {
    useGetTagsMock.mockReturnValue({ data: ['phishing'], isLoading: false });
    useBulkGetUserProfilesMock.mockReturnValue({
      data: new Map([
        ['u-priya', { uid: 'u-priya', user: { username: 'priya', full_name: 'Priya Raman' } }],
      ]),
      isLoading: false,
    });
    useSuggestUserProfilesMock.mockReturnValue({ data: [], isFetching: false });
  });

  it('shows every case tag with how many cases had it', () => {
    const { fields } = buildDifferencesPreview();
    renderWithTestingProviders(
      <CombinedTagsField tags={fields.tags.value} field={fields.tags} onChange={jest.fn()} />
    );

    expect(screen.getByText('brute-force (2)')).toBeInTheDocument();
    expect(screen.getByText('vpn')).toBeInTheDocument();
  });

  it('offers to remove single-case tags when over the limit', async () => {
    const onChange = jest.fn();
    const { fields } = buildDifferencesPreview();
    const tagsField = { ...fields.tags, max: 2 };
    renderWithTestingProviders(
      <CombinedTagsField tags={fields.tags.value} field={tagsField} onChange={onChange} />
    );

    expect(screen.getByTestId('merge-tags-over-limit')).toHaveTextContent(
      '3 tags; a case holds 2. Remove 1 to continue.'
    );
    await userEvent.click(screen.getByTestId('merge-tags-remove-single-case'));
    expect(onChange).toHaveBeenCalledWith(['brute-force']);
  });

  it("can't change assignees without the privilege, and says so", () => {
    const { fields } = buildDifferencesPreview();
    renderWithTestingProviders(
      <CombinedAssigneesField
        assignees={[]}
        field={{ ...fields.assignees, canChange: false, unavailableReason: 'license' }}
        onChange={jest.fn()}
      />
    );

    expect(screen.getByTestId('merge-assignees-locked')).toHaveTextContent(
      'The new case gets no assignees.'
    );
    expect(screen.getByText('Changing assignees needs a Platinum license.')).toBeInTheDocument();
  });

  it('names the existing destination that keeps its assignees', () => {
    const { fields } = buildDifferencesPreview();
    renderWithTestingProviders(
      <CombinedAssigneesField
        assignees={[{ uid: 'u-priya' }]}
        field={{ ...fields.assignees, canChange: false, unavailableReason: 'privilege' }}
        destinationRef="#121"
        onChange={jest.fn()}
      />
    );

    expect(screen.getByTestId('merge-assignees-locked')).toHaveTextContent(
      '#121 keeps its own assignees. Priya Raman'
    );
  });

  it("combines a checkbox group within the template's options", async () => {
    const onChange = jest.fn();
    renderWithTestingProviders(
      <CombinedExtendedField
        field={impactedSystemsField}
        value={impactedSystemsField.value}
        onChange={onChange}
        templateName="Identity incident"
      />
    );

    expect(screen.getByTestId('merge-multi-not-copied')).toHaveTextContent(
      `"Jump host" isn't an option in Identity incident and isn't copied.`
    );
    await userEvent.click(screen.getByLabelText('Okta'));
    expect(onChange).toHaveBeenCalledWith('["VPN","Backup"]');
  });
});
