/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import { RelatedAlertEpisode } from './related_alert_episode';

describe('RelatedAlertEpisode', () => {
  const rule = {
    metadata: { name: 'CPU spike' },
    grouping: { fields: ['host.name'] },
  } as RuleResponse;

  it('renders rule name, status badges, and grouping', () => {
    render(
      <RelatedAlertEpisode
        episode={{
          'episode.id': 'ep-1',
          'episode.status': ALERT_EPISODE_STATUS.ACTIVE,
        }}
        rule={rule}
        href="/app/observability/alerts-v2/episodes/ep-1"
      />
    );

    expect(screen.getByText('CPU spike')).toBeInTheDocument();
    expect(screen.getByTestId('relatedAlertEpisode-ep-1')).toBeInTheDocument();
    expect(screen.getByTestId('relatedAlertEpisodeGrouping')).toBeInTheDocument();
    expect(screen.getByText('host.name')).toBeInTheDocument();
  });

  it('omits status badges when episode status is missing', () => {
    render(<RelatedAlertEpisode episode={{ 'episode.id': 'ep-2' }} rule={rule} href="/x" />);

    expect(screen.queryByTestId('relatedAlertEpisodeGrouping')).toBeInTheDocument();
  });
});
