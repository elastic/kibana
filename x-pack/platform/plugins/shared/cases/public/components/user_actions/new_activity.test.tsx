/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { EuiCommentProps } from '@elastic/eui';
import type { UserActionUI } from '../../containers/types';
import { TestProviders } from '../../common/mock';
import { createLastVisitDivider, hasAfterLastVisitClass, markNewActivity } from './new_activity';

const since = '2026-11-17T17:42:00.000Z';
const me = { uid: 'u_me', user: { username: 'me' } } as never;

const userAction = (createdAt: string, profileUid: string): UserActionUI =>
  ({ createdAt, createdBy: { profileUid, username: profileUid } } as unknown as UserActionUI);

const timestamp = <span>{'5 minutes ago'}</span>;
const comment: EuiCommentProps = { username: 'sam', timestamp };

describe('markNewActivity', () => {
  it('leaves activity before the last visit unchanged', () => {
    const result = markNewActivity([comment], userAction('2026-11-17T10:00:00.000Z', 'u_sam'), {
      since,
      currentUserProfile: me,
    });

    expect(result).toEqual([comment]);
  });

  it('adds a New badge to activity by another user after the last visit', () => {
    const [result] = markNewActivity([comment], userAction('2026-11-18T10:00:00.000Z', 'u_sam'), {
      since,
      currentUserProfile: me,
    });

    render(<>{result.timestamp}</>, { wrapper: TestProviders });

    expect(screen.getByTestId('user-action-new-badge')).toBeInTheDocument();
    expect(hasAfterLastVisitClass(result)).toBe(true);
  });

  it('marks own activity after the last visit without a New badge', () => {
    const [result] = markNewActivity([comment], userAction('2026-11-18T10:00:00.000Z', 'u_me'), {
      since,
      currentUserProfile: me,
    });

    expect(hasAfterLastVisitClass(result)).toBe(true);
    expect(result.timestamp).toBe(comment.timestamp);
  });
});

describe('createLastVisitDivider', () => {
  it('renders a Last visit label', () => {
    const { children } = createLastVisitDivider();

    render(<>{children}</>, { wrapper: TestProviders });

    expect(screen.getByText('Last visit')).toBeInTheDocument();
  });
});
