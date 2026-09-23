/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { EuiThemeComputed } from '@elastic/eui';
import { useEuiTheme } from '@elastic/eui';
import { EpisodeSeverity, getEpisodeSeverityColor } from './severity_utils';
import { AlertEpisodeSeverityHealth } from './episode_severity_health';

/** In the EUI test build an icon renders as a span tagged with its type. */
const getDot = (container: HTMLElement) => container.querySelector('[data-euiicon-type="dot"]');

/** Grabs the resolved theme so a test can compare against the badge fill colors. */
const captureEuiTheme = () => {
  let captured: EuiThemeComputed | undefined;
  const Probe = () => {
    captured = useEuiTheme().euiTheme;
    return null;
  };
  const { unmount } = render(<Probe />);
  unmount();
  return captured!;
};

describe('AlertEpisodeSeverityHealth', () => {
  it.each(Object.values(EpisodeSeverity))('renders a colored dot and label for %s', (severity) => {
    render(<AlertEpisodeSeverityHealth severity={severity} />);

    const health = screen.getByTestId(`alertingV2EpisodeSeverityHealth-${severity}`);
    expect(getDot(health)).toHaveAttribute(
      'color',
      expect.stringMatching(/^#/) as unknown as string
    );
    expect(health).toHaveTextContent(new RegExp(severity, 'i'));
  });

  // Guards against the dot drifting onto the darker `text*` tokens, which do not
  // match the severity badges rendered in the episodes table.
  it.each(Object.values(EpisodeSeverity))(
    'colors the %s dot with the same fill as the severity badge',
    (severity) => {
      const euiTheme = captureEuiTheme();

      render(<AlertEpisodeSeverityHealth severity={severity} />);

      const dot = getDot(screen.getByTestId(`alertingV2EpisodeSeverityHealth-${severity}`));
      expect(dot).toHaveAttribute('color', getEpisodeSeverityColor(euiTheme, severity));
    }
  );

  it('gives each severity its own dot color', () => {
    const colors = Object.values(EpisodeSeverity).map((severity) => {
      const { unmount } = render(<AlertEpisodeSeverityHealth severity={severity} />);
      const dot = getDot(screen.getByTestId(`alertingV2EpisodeSeverityHealth-${severity}`));
      const color = dot?.getAttribute('color');
      unmount();
      return color;
    });

    expect(new Set(colors).size).toBe(colors.length);
  });

  it('normalizes a mixed case severity', () => {
    render(<AlertEpisodeSeverityHealth severity="CRITICAL" />);

    expect(screen.getByTestId('alertingV2EpisodeSeverityHealth-critical')).toBeInTheDocument();
  });

  it('renders the dot with no label when hideLabel is set', () => {
    render(<AlertEpisodeSeverityHealth severity={EpisodeSeverity.High} hideLabel />);

    const health = screen.getByTestId('alertingV2EpisodeSeverityHealth-high');
    expect(getDot(health)).toBeInTheDocument();
    expect(health.textContent).toBe('');
    expect(health).toHaveAttribute('aria-label', 'High');
  });

  it('renders nothing for an unsupported severity', () => {
    const { container } = render(<AlertEpisodeSeverityHealth severity="P2" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when severity is absent', () => {
    const { container } = render(<AlertEpisodeSeverityHealth severity={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('accepts a data-test-subj override', () => {
    render(
      <AlertEpisodeSeverityHealth severity={EpisodeSeverity.Low} data-test-subj="customSeverity" />
    );

    expect(screen.getByTestId('customSeverity')).toBeInTheDocument();
  });
});
