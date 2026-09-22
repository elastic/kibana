/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';
import { screen } from '@testing-library/react';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';

import { CloneTransformSection } from './clone_transform_section';

jest.mock('../../services/navigation');

const mockUseSearchItems = jest.fn();
const mockUseGetTransform = jest.fn();

jest.mock('../../hooks', () => ({
  useGetTransform: (...args: unknown[]) => mockUseGetTransform(...args),
  useTransformCapabilities: () => ({
    canGetTransform: true,
    canPreviewTransform: true,
    canCreateTransform: true,
    canStartStopTransform: true,
  }),
}));

jest.mock('../../hooks/use_documentation_links', () => ({
  useDocumentationLinks: () => ({ esTransform: 'https://example.test' }),
}));

jest.mock('../../hooks/use_search_items', () => ({
  useSearchItems: () => mockUseSearchItems(),
}));

jest.mock('../create_transform/components/wizard', () => ({
  Wizard: () => <div data-test-subj="mockedCloneWizard" />,
}));

const renderCloneSection = (search = '?dataViewId=test-data-view') => {
  const history = createMemoryHistory({ initialEntries: [`/clone/transform-1${search}`] });
  return renderWithI18n(
    <MockAppHeaderProvider>
      <Router history={history}>
        <CloneTransformSection
          history={history}
          location={history.location}
          match={{
            isExact: true,
            path: '/clone/:transformId',
            url: '/clone/transform-1',
            params: { transformId: 'transform-1' },
          }}
        />
      </Router>
    </MockAppHeaderProvider>
  );
};

describe('Transform: <CloneTransformSection />', () => {
  beforeEach(() => {
    mockUseSearchItems.mockReturnValue({
      error: undefined,
      searchItems: undefined,
      setSavedObjectId: jest.fn(),
    });
    mockUseGetTransform.mockReturnValue({
      data: undefined,
      error: null,
    });
  });

  test('keeps AppHeader mounted and shows a loading skeleton until the clone config is ready', () => {
    renderCloneSection();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Clone transform');
    expect(screen.getByTestId('transformCloneLoading')).toBeInTheDocument();
    expect(screen.queryByTestId('mockedCloneWizard')).not.toBeInTheDocument();
  });

  test('keeps AppHeader mounted and shows an error callout when loading the transform fails', () => {
    mockUseGetTransform.mockReturnValue({
      data: undefined,
      error: { message: 'transform load failed' },
    });

    renderCloneSection();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Clone transform');
    expect(
      screen.getByText('An error occurred getting the transform configuration.')
    ).toBeInTheDocument();
    expect(screen.getByText(/transform load failed/)).toBeInTheDocument();
    expect(screen.queryByTestId('transformCloneLoading')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mockedCloneWizard')).not.toBeInTheDocument();
  });

  test('renders the wizard when the clone config is ready', () => {
    mockUseSearchItems.mockReturnValue({
      error: undefined,
      searchItems: { id: 'test-data-view' },
      setSavedObjectId: jest.fn(),
    });
    mockUseGetTransform.mockReturnValue({
      data: {
        transforms: [
          {
            id: 'transform-1',
            source: { index: ['test-index'] },
            dest: { index: 'dest-index' },
            pivot: { group_by: {}, aggregations: {} },
          },
        ],
      },
      error: null,
    });

    renderCloneSection();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Clone transform');
    expect(screen.getByTestId('mockedCloneWizard')).toBeInTheDocument();
    expect(screen.queryByTestId('transformCloneLoading')).not.toBeInTheDocument();
  });
});
