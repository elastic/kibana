/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { SuggestionBadge, ClassicStreamBadge, WiredStreamBadge, QueryStreamBadge } from '.';

// Mock EUI theme hooks
jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    useEuiTheme: () => ({
      euiTheme: {
        colors: {
          backgroundLightAccent: '#e6f1fa',
        },
      },
    }),
  };
});

// Mock useKibana for LifecycleBadge and DiscoverBadgeButton
jest.mock('../../hooks/use_kibana', () => ({
  useKibana: () => ({
    dependencies: {
      start: {
        share: {
          url: {
            locators: {
              get: () => ({
                getRedirectUrl: () => 'https://example.com/ilm',
              }),
              useUrl: () => null,
            },
          },
        },
      },
    },
  }),
}));

describe('Stream Badges', () => {
  describe('SuggestionBadge', () => {
    it('should render with correct text', () => {
      render(<SuggestionBadge />);

      expect(screen.getByText('Suggested')).toBeInTheDocument();
    });

    it('should have sparkles icon', () => {
      render(<SuggestionBadge />);

      const badge = screen.getByTestId('suggestionStreamBadge');
      expect(badge).toBeInTheDocument();
    });

    it('should render with correct data-test-subj', () => {
      render(<SuggestionBadge />);

      expect(screen.getByTestId('suggestionStreamBadge')).toBeInTheDocument();
    });

    it('should be wrapped in a tooltip', () => {
      render(<SuggestionBadge />);

      // EuiToolTip wraps content in a span with tabIndex for accessibility
      const badge = screen.getByTestId('suggestionStreamBadge');
      expect(badge).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('ClassicStreamBadge', () => {
    it('should render with correct text', () => {
      render(<ClassicStreamBadge />);

      expect(screen.getByText('Classic')).toBeInTheDocument();
    });

    it('should render with correct data-test-subj', () => {
      render(<ClassicStreamBadge />);

      expect(screen.getByTestId('classicStreamBadge')).toBeInTheDocument();
    });
  });

  describe('WiredStreamBadge', () => {
    it('should render with correct text', () => {
      render(<WiredStreamBadge />);

      expect(screen.getByText('Wired')).toBeInTheDocument();
    });

    it('should render with correct data-test-subj', () => {
      render(<WiredStreamBadge />);

      expect(screen.getByTestId('wiredStreamBadge')).toBeInTheDocument();
    });
  });

  describe('QueryStreamBadge', () => {
    it('should render with correct text', () => {
      render(<QueryStreamBadge />);

      expect(screen.getByText('Query stream')).toBeInTheDocument();
    });
  });
});
