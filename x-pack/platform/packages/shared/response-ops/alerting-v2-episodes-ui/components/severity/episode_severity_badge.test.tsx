/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { AlertEpisodeSeverityBadge } from './episode_severity_badge';
import { EpisodeDataSourceProvider } from '../../context/episode_data_source_context';
import { createTestEpisodeSource } from '../../types/episode_data_source.mock';
import { CLASSIC_SEVERITY_EXTENSIONS } from '../../classic_alerts/create_classic_episode_source';

const renderBadge = (severity: string | undefined | null, withExtensions = false) => {
  const dataSource = withExtensions
    ? createTestEpisodeSource({
        severityExtensions: CLASSIC_SEVERITY_EXTENSIONS,
      })
    : undefined;

  return render(
    <I18nProvider>
      <EpisodeDataSourceProvider dataSource={dataSource}>
        <AlertEpisodeSeverityBadge severity={severity} />
      </EpisodeDataSourceProvider>
    </I18nProvider>
  );
};

describe('AlertEpisodeSeverityBadge', () => {
  it('renders a badge for supported severity values', () => {
    renderBadge('high');
    expect(screen.getByTestId('alertingV2EpisodeSeverityBadge-high')).toHaveTextContent('High');
  });

  it('normalizes mixed-case severity values', () => {
    renderBadge('CRITICAL');
    expect(screen.getByTestId('alertingV2EpisodeSeverityBadge-critical')).toHaveTextContent(
      'Critical'
    );
  });

  it('renders nothing for unsupported severity values', () => {
    const { container } = renderBadge('SEV1');
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when severity is missing', () => {
    const { container } = renderBadge(undefined);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a badge for extension severity values', () => {
    renderBadge('warning', true);
    expect(screen.getByTestId('alertingV2EpisodeSeverityBadge-warning')).toHaveTextContent(
      'Warning'
    );
  });

  it('renders a badge for "minor" extension severity', () => {
    renderBadge('minor', true);
    expect(screen.getByTestId('alertingV2EpisodeSeverityBadge-minor')).toHaveTextContent('Minor');
  });

  it('renders a badge for "major" extension severity', () => {
    renderBadge('major', true);
    expect(screen.getByTestId('alertingV2EpisodeSeverityBadge-major')).toHaveTextContent('Major');
  });
});
