/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { basicCase } from '../../../../../../containers/mock';
import { useCaseViewNavigation } from '../../../../../../common/navigation';
import * as caseViewI18n from '../../../../../case_view/translations';
import { UserAvatarWithEmail } from './user_avatar_with_email';
import { renderWithTestingProviders } from '../../../../../../common/mock';

jest.mock('../../../../../../common/navigation');

const useCaseViewNavigationMock = useCaseViewNavigation as jest.Mock;

describe('UserAvatarWithEmail', () => {
  const caseLink = 'https://example.com/cases/test';
  const getCaseViewUrl = jest.fn().mockReturnValue(caseLink);

  beforeEach(() => {
    jest.clearAllMocks();
    useCaseViewNavigationMock.mockReturnValue({ getCaseViewUrl });
  });

  it('renders a mailto link for the avatar when the user has an email', () => {
    renderWithTestingProviders(
      <UserAvatarWithEmail
        caseId={basicCase.id}
        caseTitle={basicCase.title}
        userInfo={{
          user: {
            email: 'damaged_raccoon@elastic.co',
            full_name: 'Damaged Raccoon',
            username: 'damaged_raccoon',
          },
        }}
      />
    );

    expect(screen.getByTestId('user-picker-field-email-avatar-link')).toHaveAttribute(
      'href',
      `mailto:damaged_raccoon@elastic.co?subject=${encodeURIComponent(
        caseViewI18n.EMAIL_SUBJECT(basicCase.title)
      )}&body=${encodeURIComponent(caseViewI18n.EMAIL_BODY(caseLink))}`
    );
  });

  it('falls back to the profile tooltip when the user has no email', () => {
    renderWithTestingProviders(
      <UserAvatarWithEmail
        caseId={basicCase.id}
        caseTitle={basicCase.title}
        userInfo={{
          user: {
            email: undefined,
            full_name: 'Damaged Raccoon',
            username: 'damaged_raccoon',
          },
        }}
      />
    );

    expect(screen.queryByTestId('user-picker-field-email-avatar-link')).not.toBeInTheDocument();
    expect(screen.getByTestId('case-user-profile-avatar-damaged_raccoon')).toBeInTheDocument();
  });
});
