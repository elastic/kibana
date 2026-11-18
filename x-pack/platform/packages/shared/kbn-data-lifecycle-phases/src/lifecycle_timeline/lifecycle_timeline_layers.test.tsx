/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { EuiThemeProvider } from '@elastic/eui';
import { render, screen, within } from '@testing-library/react';
import { LifecycleTimelineContainer } from './lifecycle_timeline_container';
import { LifecycleTimelineTicks } from './lifecycle_timeline_ticks';
import { LifecycleTimelineTrack } from './lifecycle_timeline_track';

const renderWithTheme = (node: React.ReactElement) => render(node, { wrapper: EuiThemeProvider });

describe('LifecycleTimeline layers', () => {
  it('lets the track and the ticks use different grids, with an extra row between them', () => {
    renderWithTheme(
      <LifecycleTimelineContainer data-test-subj="customTimeline">
        <LifecycleTimelineTrack
          aria-label="Data phases"
          grid={{ gridTemplateColumns: '1fr 1fr 2fr' }}
          testSubjPrefix="customTimeline"
          items={[
            {
              period: { id: 'hot', label: 'Hot', color: '#FF7E62' },
              startLabel: '0',
              endLabel: '30d',
              gridColumn: 'span 2',
            },
            {
              period: { id: 'warm', label: 'Warm', color: '#FCD883' },
              startLabel: '30d',
              endLabel: '∞',
            },
          ]}
        />
        <div data-test-subj="extraRow" />
        <LifecycleTimelineTicks
          grid={{ gridTemplateColumns: '1fr 1fr 2fr' }}
          testSubjPrefix="customTimeline"
          ticks={[
            { id: 'hot', label: '0' },
            { id: 'step', label: '7d' },
            { id: 'warm', label: '30d' },
          ]}
        />
      </LifecycleTimelineContainer>
    );

    const container = screen.getByTestId('customTimeline');
    const list = within(container).getByRole('list', { name: 'Data phases' });

    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByTestId('customTimeline-period-hot').closest('li')).toHaveStyle({
      gridColumn: 'span 2',
    });
    expect(container.children[1]).toBe(screen.getByTestId('extraRow'));
    expect(screen.getByTestId('customTimeline-tick-step')).toHaveTextContent('7d');
  });

  it('leaves the end of the ticks empty when no end label is passed', () => {
    renderWithTheme(
      <LifecycleTimelineTicks
        grid={{ gridTemplateColumns: '1fr' }}
        ticks={[{ id: 'hot', label: '0' }]}
      />
    );

    expect(screen.getByTestId('lifecycleTimeline-tick-hot')).toHaveTextContent('0');
    expect(screen.queryByTestId('lifecycleTimeline-retention')).toBeNull();
  });

  it('uses the test subjects passed in instead of the default ones', () => {
    renderWithTheme(
      <LifecycleTimelineContainer>
        <LifecycleTimelineTrack
          aria-label="Data phases"
          grid={{ gridTemplateColumns: '1fr' }}
          items={[
            {
              period: {
                id: 'hot',
                label: 'Hot',
                color: '#FF7E62',
                size: '1 GB',
                testSubjects: {
                  bar: 'lifecyclePhase-hot-button',
                  name: 'lifecyclePhase-hot-name',
                  size: 'lifecyclePhase-hot-size',
                },
              },
              startLabel: '0',
              endLabel: '∞',
            },
          ]}
        />
        <LifecycleTimelineTicks
          grid={{ gridTemplateColumns: '1fr' }}
          ticks={[
            {
              id: 'hot',
              label: '0d',
              isInvalid: true,
              'data-test-subj': 'timeline-value-0d-invalid',
            },
          ]}
          endLabel={{ label: '∞', isInfinite: true, 'data-test-subj': 'timeline-infinite' }}
        />
      </LifecycleTimelineContainer>
    );

    expect(screen.getByTestId('lifecyclePhase-hot-button')).toBeInTheDocument();
    expect(screen.getByTestId('lifecyclePhase-hot-name')).toHaveTextContent('Hot');
    expect(screen.getByTestId('lifecyclePhase-hot-size')).toHaveTextContent('1 GB');
    expect(screen.getByTestId('timeline-value-0d-invalid')).toHaveTextContent('0d');
    expect(screen.getByTestId('timeline-infinite')).toHaveTextContent('∞');
  });

  it('marks invalid ticks in their test subject and color', () => {
    renderWithTheme(
      <LifecycleTimelineTicks
        grid={{ gridTemplateColumns: '1fr 1fr' }}
        ticks={[
          { id: 'hot', label: '0' },
          { id: 'frozen', label: '-1d', isInvalid: true },
        ]}
      />
    );

    expect(screen.getByTestId('lifecycleTimeline-tick-hot')).toHaveTextContent('0');
    expect(screen.getByTestId('lifecycleTimeline-tick-frozen-invalid')).toHaveTextContent('-1d');
    expect(screen.getByTestId('lifecycleTimeline-tick-frozen-invalid').className).toContain(
      'euiTextColor-danger'
    );
    expect(screen.getByTestId('lifecycleTimeline-tick-hot').className).not.toContain('danger');
  });
});
