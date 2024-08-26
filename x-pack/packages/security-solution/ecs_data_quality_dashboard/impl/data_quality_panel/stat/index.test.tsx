/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Props, Stat, arePropsEqualOneLevelDeep } from '.';
import { TestExternalProviders } from '../mock/test_providers/test_providers';

describe('Stat', () => {
  it('renders stat with badge', () => {
    render(<Stat badgeText="thebadge" badgeColor="hollow" />);
    expect(screen.getByTestId('stat')).toHaveTextContent('thebadge');
  });

  it('renders stat with tooltip', async () => {
    render(<Stat badgeText="thebadge" badgeColor="hollow" tooltipText="thetooltip" />);
    userEvent.hover(screen.getByText('thebadge'));
    expect(screen.getByText('thebadge')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('thetooltip')).toBeInTheDocument());
  });

  it('renders stat with children', () => {
    render(
      <TestExternalProviders>
        <Stat badgeText="thebadge" badgeColor="hollow">
          {'thechildren'}
        </Stat>
      </TestExternalProviders>
    );
    expect(screen.getByText('thechildren')).toBeInTheDocument();
    expect(screen.getByText('thebadge')).toBeInTheDocument();
  });
});

describe('arePropsEqualOneLevelDeep', () => {
  describe('when badgeProps are equal', () => {
    it('returns true', () => {
      const prevProps = { badgeProps: { color: 'hollow' } } as Props;
      const nextProps = { badgeProps: { color: 'hollow' } } as Props;

      expect(arePropsEqualOneLevelDeep(prevProps, nextProps)).toBe(true);
    });
  });

  describe('when badgeProps are not equal', () => {
    it('returns false', () => {
      const prevProps = { badgeProps: { color: 'hollow' } } as Props;
      const nextProps = { badgeProps: { color: 'primary' } } as Props;

      expect(arePropsEqualOneLevelDeep(prevProps, nextProps)).toBe(false);
    });
  });

  describe('when other props are passed', () => {
    describe('when props are equal', () => {
      it('returns true', () => {
        const prevProps = { badgeText: '1' } as Props;
        const nextProps = { badgeText: '1' } as Props;

        expect(arePropsEqualOneLevelDeep(prevProps, nextProps)).toBe(true);
      });
    });

    describe('when props are not equal', () => {
      it('returns false', () => {
        const prevProps = { badgeText: '1' } as Props;
        const nextProps = { badgeText: '2' } as Props;

        expect(arePropsEqualOneLevelDeep(prevProps, nextProps)).toBe(false);
      });
    });
  });
});
