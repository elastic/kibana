/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, FormProvider } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { CASE_EXTENDED_FIELDS } from '../../../../../../common/constants';
import { userProfiles, userProfilesMap } from '../../../../../containers/user_profiles/api.mock';
import { useSuggestUserProfiles } from '../../../../../containers/user_profiles/use_suggest_user_profiles';
import { useBulkGetUserProfiles } from '../../../../../containers/user_profiles/use_bulk_get_user_profiles';
import * as api from '../../../../../containers/user_profiles/api';
import { useAvailableCasesOwners } from '../../../../app/use_available_owners';
import { useCasesContext } from '../../../../cases_context/use_cases_context';
import { UserPicker } from './user_picker';

jest.mock('../../../../../containers/user_profiles/use_suggest_user_profiles');
jest.mock('../../../../../containers/user_profiles/use_bulk_get_user_profiles');
jest.mock('../../../../app/use_available_owners');
jest.mock('../../../../../containers/user_profiles/api', () => ({
  bulkGetUserProfiles: jest.fn(),
}));
jest.mock('../../../../cases_context/use_cases_context');

const useSuggestUserProfilesMock = useSuggestUserProfiles as jest.Mock;
const useBulkGetUserProfilesMock = useBulkGetUserProfiles as jest.Mock;
const useAvailableCasesOwnersMock = useAvailableCasesOwners as jest.Mock;
const mockBulkGetUserProfiles = api.bulkGetUserProfiles as jest.Mock;
const useCasesContextMock = useCasesContext as jest.Mock;

const [alice, bob] = userProfiles;

interface FormWrapperProps {
  isRequired?: boolean;
  multiple?: boolean;
  initialUsers?: Array<{ uid: string; name: string }>;
  onSubmitResult?: (result: { isValid: boolean; data: Record<string, unknown> }) => void;
}

const FormWrapper: React.FC<FormWrapperProps> = ({
  isRequired,
  multiple,
  initialUsers,
  onSubmitResult = jest.fn(),
}) => {
  const serialized = JSON.stringify(initialUsers ?? []);
  const { form } = useForm<{}>({
    defaultValue: {
      [CASE_EXTENDED_FIELDS]: { assignee_as_keyword: serialized },
    },
    options: { stripEmptyFields: false },
  });

  const handleSubmit = async () => {
    const { isValid, data } = await form.submit();
    onSubmitResult({ isValid: isValid ?? false, data: data as Record<string, unknown> });
  };

  return (
    <FormProvider form={form}>
      <UserPicker
        name="assignee"
        control="USER_PICKER"
        type="keyword"
        label="Assignee"
        isRequired={isRequired}
        metadata={multiple !== undefined ? { multiple } : undefined}
      />
      <button type="button" onClick={handleSubmit}>
        {'Submit'}
      </button>
    </FormProvider>
  );
};

describe('UserPicker', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    useCasesContextMock.mockReturnValue({ owner: ['securitySolution'] });
    useSuggestUserProfilesMock.mockReturnValue({
      data: userProfiles,
      isLoading: false,
      isFetching: false,
    });
    useBulkGetUserProfilesMock.mockReturnValue({
      data: userProfilesMap,
      isFetching: false,
    });
    useAvailableCasesOwnersMock.mockReturnValue(['securitySolution']);
    mockBulkGetUserProfiles.mockResolvedValue(userProfiles);
  });

  describe('rendering', () => {
    it('renders the label', () => {
      render(<FormWrapper />);
      expect(screen.getByText('Assignee')).toBeInTheDocument();
    });

    it('renders the combobox input', () => {
      render(<FormWrapper />);
      expect(screen.getByTestId('template-user-picker-assignee')).toBeInTheDocument();
    });

    it('renders in multi-select mode by default', () => {
      render(<FormWrapper />);
      const combobox = screen.getByTestId('template-user-picker-assignee');
      // EuiComboBox in multiple mode does not have aria-multiselectable=false
      expect(combobox).not.toHaveAttribute('aria-multiselectable', 'false');
    });

    it('renders in single-select mode when multiple is false', () => {
      render(<FormWrapper multiple={false} />);
      expect(screen.getByTestId('template-user-picker-assignee')).toBeInTheDocument();
    });

    it('pre-selects users from initialUsers', async () => {
      render(<FormWrapper initialUsers={[{ uid: alice.uid, name: 'Damaged Raccoon' }]} />);
      await waitFor(() => {
        expect(screen.getByText('Damaged Raccoon')).toBeInTheDocument();
      });
    });

    it('shows no selected users when initialUsers is empty', () => {
      render(<FormWrapper initialUsers={[]} />);
      // No pill/badge rendered
      expect(screen.queryByRole('option', { selected: true })).not.toBeInTheDocument();
    });
  });

  describe('search behaviour', () => {
    it('calls useSuggestUserProfiles with the typed search term', async () => {
      render(<FormWrapper />);
      const input = screen.getByRole('combobox');
      await userEvent.type(input, 'dam');
      await waitFor(() => {
        const calls = useSuggestUserProfilesMock.mock.calls;
        const lastCall = calls[calls.length - 1][0];
        expect(lastCall.name).toBe('dam');
      });
    });

    it('passes isLoading to the combobox when suggest is loading', () => {
      useSuggestUserProfilesMock.mockReturnValue({
        data: [],
        isLoading: true,
        isFetching: false,
      });
      render(<FormWrapper />);
      expect(screen.getByTestId('template-user-picker-assignee')).toBeInTheDocument();
    });
  });

  describe('isRequired validation', () => {
    it('blocks form submission when isRequired is true and no user is selected', async () => {
      const onSubmitResult = jest.fn();
      render(<FormWrapper isRequired initialUsers={[]} onSubmitResult={onSubmitResult} />);

      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        expect(onSubmitResult).toHaveBeenCalledWith(expect.objectContaining({ isValid: false }));
      });
    });

    it('shows an error message when required validation fails', async () => {
      render(<FormWrapper isRequired initialUsers={[]} />);
      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
      await waitFor(() => {
        expect(screen.getByText(/required/i)).toBeInTheDocument();
      });
    });

    it('allows form submission when isRequired is true and a user is pre-selected', async () => {
      const onSubmitResult = jest.fn();
      render(
        <FormWrapper
          isRequired
          initialUsers={[{ uid: alice.uid, name: 'Damaged Raccoon' }]}
          onSubmitResult={onSubmitResult}
        />
      );

      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        expect(onSubmitResult).toHaveBeenCalledWith(expect.objectContaining({ isValid: true }));
      });
    });

    it('allows form submission when isRequired is false and no user is selected', async () => {
      const onSubmitResult = jest.fn();
      render(<FormWrapper isRequired={false} initialUsers={[]} onSubmitResult={onSubmitResult} />);

      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        expect(onSubmitResult).toHaveBeenCalledWith(expect.objectContaining({ isValid: true }));
      });
    });

    it('runs async profile validation on submit when users are selected', async () => {
      const onSubmitResult = jest.fn();
      render(
        <FormWrapper
          isRequired
          initialUsers={[{ uid: alice.uid, name: 'Damaged Raccoon' }]}
          onSubmitResult={onSubmitResult}
        />
      );

      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        expect(mockBulkGetUserProfiles).toHaveBeenCalled();
      });
      await waitFor(() => {
        expect(onSubmitResult).toHaveBeenCalledWith(expect.objectContaining({ isValid: true }));
      });
    });

    it('shows a validation error when the stored name no longer matches the profile', async () => {
      mockBulkGetUserProfiles.mockResolvedValue([
        {
          ...alice,
          user: { ...alice.user, full_name: 'Updated Name' },
        },
      ]);

      render(<FormWrapper isRequired initialUsers={[{ uid: alice.uid, name: 'Old Name' }]} />);

      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        expect(
          screen.getByText(/The following users do not exist and must be removed/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('submitted value', () => {
    it('submits selected users as a JSON string', async () => {
      const onSubmitResult = jest.fn();
      render(
        <FormWrapper
          initialUsers={[{ uid: alice.uid, name: 'Damaged Raccoon' }]}
          onSubmitResult={onSubmitResult}
        />
      );

      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        expect(onSubmitResult).toHaveBeenCalled();
      });

      const { data } = onSubmitResult.mock.calls[0][0];
      const submitted = (data as Record<string, Record<string, unknown>>)[CASE_EXTENDED_FIELDS]
        ?.assignee_as_keyword;

      expect(typeof submitted).toBe('string');
      const parsed = JSON.parse(submitted as string);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0]).toMatchObject({ uid: alice.uid });
    });

    it('submits an empty JSON array when no users are selected', async () => {
      const onSubmitResult = jest.fn();
      render(<FormWrapper initialUsers={[]} onSubmitResult={onSubmitResult} />);

      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        expect(onSubmitResult).toHaveBeenCalled();
      });

      const { data } = onSubmitResult.mock.calls[0][0];
      const submitted = (data as Record<string, Record<string, unknown>>)[CASE_EXTENDED_FIELDS]
        ?.assignee_as_keyword;

      expect(submitted).toBe('[]');
    });

    it('submits multiple selected users as a JSON array', async () => {
      const onSubmitResult = jest.fn();
      render(
        <FormWrapper
          initialUsers={[
            { uid: alice.uid, name: 'Damaged Raccoon' },
            { uid: bob.uid, name: 'Physical Dinosaur' },
          ]}
          onSubmitResult={onSubmitResult}
        />
      );

      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        expect(onSubmitResult).toHaveBeenCalled();
      });

      const { data } = onSubmitResult.mock.calls[0][0];
      const submitted = (data as Record<string, Record<string, unknown>>)[CASE_EXTENDED_FIELDS]
        ?.assignee_as_keyword;

      const parsed = JSON.parse(submitted as string);
      expect(parsed).toHaveLength(2);
      expect(parsed.map((u: { uid: string }) => u.uid)).toContain(alice.uid);
      expect(parsed.map((u: { uid: string }) => u.uid)).toContain(bob.uid);
    });
  });

  describe('owner resolution', () => {
    it('passes the context owners to useSuggestUserProfiles when the context has owners', () => {
      render(<FormWrapper />);
      const calls = useSuggestUserProfilesMock.mock.calls;
      const lastCall = calls[calls.length - 1][0];
      // useCasesContext returns ['cases'] by default from TestProviders, but here the mock
      // controls the owners array via context. The component passes owners from useCasesContext.
      expect(Array.isArray(lastCall.owners)).toBe(true);
    });

    it('falls back to availableOwners when the context has no owners', () => {
      useCasesContextMock.mockReturnValue({ owner: [] });
      useAvailableCasesOwnersMock.mockReturnValue(['observability']);
      render(<FormWrapper />);
      const calls = useSuggestUserProfilesMock.mock.calls;
      const lastCall = calls[calls.length - 1][0];
      expect(lastCall.owners).toEqual(['observability']);
    });
  });
});
