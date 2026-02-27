/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import { TestProviders, renderWithTestingProviders } from '../../common/mock';
import { HeaderPage } from '.';
import { useMountAppended } from '../../utils/use_mount_appended';

jest.mock('../../common/navigation/hooks');

describe('HeaderPage', () => {
  const mount = useMountAppended();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', () => {
    renderWithTestingProviders(
      <TestProviders>
        <HeaderPage border title="Test title">
          <p>{'Test supplement'}</p>
        </HeaderPage>
      </TestProviders>
    );

    expect(screen.getByText('Test title')).toBeInTheDocument();
    expect(screen.getByText('Test supplement')).toBeInTheDocument();
  });

  it('renders the `incremental_id` when provided', () => {
    renderWithTestingProviders(
      <TestProviders>
        <HeaderPage border title="Test title" incrementalId={1337} />
      </TestProviders>
    );

    expect(screen.getByText('#1337')).toBeInTheDocument();
  });

  it('does not render the `incremental_id` when not provided', () => {
    renderWithTestingProviders(
      <TestProviders>
        <HeaderPage border title="Test title" />
      </TestProviders>
    );

    expect(screen.queryByTestId('cases-incremental-id-text')).not.toBeInTheDocument();
  });

  it('DOES NOT render the back link when not provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderPage title="Test title" />
      </TestProviders>
    );

    expect(wrapper.find('.casesHeaderPage__linkBack').first().exists()).toBe(false);
  });

  it('renders supplements when children provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderPage title="Test title">
          <p>{'Test supplement'}</p>
        </HeaderPage>
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="header-page-supplements"]').first().exists()).toBe(true);
  });

  it('DOES NOT render supplements when children not provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderPage title="Test title" />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="header-page-supplements"]').first().exists()).toBe(false);
  });

  describe('Badges', () => {
    it('does not render the badge if the release is ga', () => {
      renderWithTestingProviders(<HeaderPage title="Test title" />);

      expect(screen.getByText('Test title')).toBeInTheDocument();
      expect(screen.queryByText('Beta')).toBeFalsy();
      expect(screen.queryByText('Technical preview')).toBeFalsy();
    });

    it('does render the beta badge', () => {
      renderWithTestingProviders(<HeaderPage title="Test title" />, {
        wrapperProps: { releasePhase: 'beta' },
      });

      expect(screen.getByText('Test title')).toBeInTheDocument();
      expect(screen.getByText('Beta')).toBeInTheDocument();
    });

    it('does render the experimental badge', () => {
      renderWithTestingProviders(<HeaderPage title="Test title" />, {
        wrapperProps: { releasePhase: 'experimental' },
      });

      expect(screen.getByText('Test title')).toBeInTheDocument();
      expect(screen.getByText('Technical preview')).toBeInTheDocument();
    });
  });
});
