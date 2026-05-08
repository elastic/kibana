/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import type { AlertEpisode } from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';
import { RelatedAlertEpisodesList } from './related_alert_episodes_list';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: {
      http: { basePath: { prepend: (p: string) => `/base${p}` } },
    },
  }),
}));

jest.mock('@kbn/alerting-v2-episodes-ui/components/related/related_alert_episode', () => ({
  RelatedAlertEpisode: ({ episode }: { episode: AlertEpisode }) => (
    <div data-test-subj="mockRelatedAlertEpisode">{episode['episode.id']}</div>
  ),
}));

const mockRule = { id: 'rule-1', metadata: { name: 'Test Rule' } } as RuleResponse;

const makeRow = (id: string): AlertEpisode =>
  ({
    'episode.id': id,
    'episode.status': 'active',
    'rule.id': 'rule-1',
    group_hash: 'gh-1',
    '@timestamp': '2024-01-01T00:00:00Z',
    first_timestamp: '2024-01-01T00:00:00Z',
    last_timestamp: '2024-01-01T00:01:00Z',
    duration: 60000,
  } as AlertEpisode);

describe('RelatedAlertEpisodesList', () => {
  it('renders one row per episode', () => {
    render(
      <I18nProvider>
        <RelatedAlertEpisodesList
          rows={[makeRow('ep-1'), makeRow('ep-2')]}
          rule={mockRule}
          getEpisodeAction={() => undefined}
          getGroupAction={() => undefined}
        />
      </I18nProvider>
    );

    expect(screen.getAllByTestId('mockRelatedAlertEpisode')).toHaveLength(2);
    expect(screen.getByTestId('alertingV2RelatedEpisodesList')).toBeInTheDocument();

    expect(screen.getByText('ep-1')).toBeInTheDocument();
    expect(screen.getByText('ep-2')).toBeInTheDocument();
  });

  it('renders nothing inside the list when rows is empty', () => {
    render(
      <I18nProvider>
        <RelatedAlertEpisodesList
          rows={[]}
          rule={mockRule}
          getEpisodeAction={() => undefined}
          getGroupAction={() => undefined}
        />
      </I18nProvider>
    );

    expect(screen.getByTestId('alertingV2RelatedEpisodesList')).toBeEmptyDOMElement();
  });
});
