/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { z } from '@kbn/zod/v4';
import type { UserProfile } from '@kbn/user-profile-components';
import { MAX_ASSIGNEES_PER_CASE } from '../../../common/constants';
import { TestProviders } from '../../common/mock';
import { userProfiles } from '../../containers/user_profiles/api.mock';
import * as api from '../../containers/user_profiles/api';
import * as createI18n from '../create/translations';
import { AssigneesField, assigneesFieldSchema } from './assignees_field';
import { renderWithForm } from './test_utils';

jest.mock('../../containers/user_profiles/api');

const currentUserProfile = userProfiles[0];
const schema = z.object({ assignees: assigneesFieldSchema });

const renderField = (assignees: Array<{ uid: string }> = []) =>
  renderWithForm({
    schema,
    defaultValues: { assignees },
    wrapper: TestProviders,
    children: <AssigneesField />,
  });

const waitForEnabled = () =>
  waitFor(() => expect(screen.queryByTestId('comboBoxSearchInput')).not.toBeDisabled());

describe('AssigneesField', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(api, 'getCurrentUserProfile').mockResolvedValue(currentUserProfile);
  });

  it('renders', async () => {
    renderField();
    await waitForEnabled();

    expect(await screen.findByTestId('createCaseAssigneesComboBox')).toBeInTheDocument();
  });

  it('does not render the assign yourself link without a current user profile', async () => {
    jest.spyOn(api, 'getCurrentUserProfile').mockResolvedValue(undefined as unknown as UserProfile);

    renderField();
    await waitForEnabled();

    expect(screen.queryByTestId('create-case-assign-yourself-link')).not.toBeInTheDocument();
  });

  it('assigns the current user and then disables the link', async () => {
    const { form } = renderField();
    await waitForEnabled();

    await userEvent.click(await screen.findByTestId('create-case-assign-yourself-link'));

    await waitFor(() =>
      expect(form().getValues('assignees')).toEqual([{ uid: currentUserProfile.uid }])
    );
    expect(await screen.findByTestId('create-case-assign-yourself-link')).toBeDisabled();
  });

  it('assigns a user picked from the suggestions', async () => {
    const { form } = renderField();
    await waitForEnabled();

    await userEvent.type(await screen.findByTestId('comboBoxSearchInput'), 'dr', { delay: 1 });
    await userEvent.click(await screen.findByText(`${currentUserProfile.user.full_name}`));

    await waitFor(() =>
      expect(form().getValues('assignees')).toEqual([{ uid: currentUserProfile.uid }])
    );
  });

  it('fetches profiles of selected users the suggest API did not return', async () => {
    const userProfile = {
      uid: 'u_unknown_0',
      enabled: true,
      data: {},
      user: { username: 'uncertain_crawdad', full_name: 'Uncertain Crawdad' },
    };
    const bulkGet = jest.spyOn(api, 'bulkGetUserProfiles').mockResolvedValue([userProfile]);

    renderField([{ uid: userProfile.uid }]);

    expect(await screen.findByText('Uncertain Crawdad')).toBeInTheDocument();
    expect(bulkGet).toHaveBeenCalledWith(expect.objectContaining({ uids: [userProfile.uid] }));
  });

  it('shows the schema error when there are too many assignees', async () => {
    renderField(
      Array.from({ length: MAX_ASSIGNEES_PER_CASE + 1 }, (_, index) => ({ uid: `u_${index}` }))
    );
    await waitForEnabled();

    await userEvent.click(screen.getByText('Submit'));

    expect(await screen.findByText(createI18n.INVALID_ASSIGNEES)).toBeInTheDocument();
  });
});
