/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { userProfiles, userProfilesMap } from '../../../../../containers/user_profiles/api.mock';
import { basicCase } from '../../../../../containers/mock';
import { renderWithTestingProviders } from '../../../../../common/mock';
import { ParticipantsField } from './participants_field';

describe('ParticipantsField', () => {
  it('renders user avatars in a bordered panel', () => {
    renderWithTestingProviders(
      <ParticipantsField
        title="Participants"
        users={[
          {
            uid: userProfiles[0].uid,
            user: {
              email: userProfiles[0].user.email,
              full_name: userProfiles[0].user.full_name,
              username: userProfiles[0].user.username,
            },
          },
        ]}
        userProfiles={userProfilesMap}
        isLoading={false}
        dataTestSubj="case-view-participants-field-panel"
        caseId={basicCase.id}
        caseTitle={basicCase.title}
      />
    );

    expect(screen.getByTestId('case-view-participants-field-panel')).toBeInTheDocument();
    expect(screen.getByText('Participants')).toBeInTheDocument();
    expect(screen.getByTestId('case-user-profile-avatar-damaged_raccoon')).toBeInTheDocument();
    expect(screen.queryByTestId('case-view-assignees-add-button')).not.toBeInTheDocument();
  });

  it('returns null when there are no users and it is not loading', () => {
    const { container } = renderWithTestingProviders(
      <ParticipantsField
        title="Participants"
        users={[]}
        userProfiles={new Map()}
        isLoading={false}
        dataTestSubj="case-view-participants-field-panel"
        caseId={basicCase.id}
        caseTitle={basicCase.title}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('shows a loading spinner when loading and there are no users yet', () => {
    renderWithTestingProviders(
      <ParticipantsField
        title="Participants"
        users={[]}
        userProfiles={new Map()}
        isLoading={true}
        dataTestSubj="case-view-participants-field-panel"
        caseId={basicCase.id}
        caseTitle={basicCase.title}
      />
    );

    expect(screen.getByTestId('case-view-participants-field-panel')).toBeInTheDocument();
    expect(screen.getByTestId('case-view-participants-field-panel-loading')).toBeInTheDocument();
  });
});
