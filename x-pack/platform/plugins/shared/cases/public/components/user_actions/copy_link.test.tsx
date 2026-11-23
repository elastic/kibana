/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import copy from 'copy-to-clipboard';

import { useKibana } from '../../common/lib/kibana';
import { renderWithTestingProviders } from '../../common/mock';
import { UserActionCopyLink } from './copy_link';

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

jest.mock('../../common/navigation/hooks');
jest.mock('copy-to-clipboard', () => jest.fn());
jest.mock('../../common/lib/kibana');

const mockGetUrlForApp = jest.fn(
  (appId: string, options?: { path?: string; absolute?: boolean }) =>
    `${appId}${options?.path ?? ''}`
);

const props = {
  id: 'comment-id',
};

describe('UserActionCopyLink ', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaMock().services.application.getUrlForApp = mockGetUrlForApp;
  });

  it('it renders', async () => {
    renderWithTestingProviders(<UserActionCopyLink {...props} />);

    expect(screen.getByTestId(`copy-link-${props.id}`)).toBeInTheDocument();
  });

  it('calls copy clipboard correctly', async () => {
    renderWithTestingProviders(<UserActionCopyLink {...props} />);

    await userEvent.click(screen.getByTestId(`copy-link-${props.id}`));
    expect(copy).toHaveBeenCalledWith('/app/security/cases/test');
  });
});
