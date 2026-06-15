/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import { AlertEpisodeDetailsHeader } from './details_header';

const mockRule = {
  id: 'rule-1',
  metadata: { name: 'Rule 1', description: 'Some description' },
} as unknown as RuleResponse;

const defaultProps = {
  isLoadingEpisode: false,
  isRuleLoading: false,
  isRuleNotFound: false,
  ruleId: 'rule-1',
  rule: mockRule,
  tags: [] as string[],
  status: undefined,
  episodeAction: undefined,
  groupAction: undefined,
};

describe('AlertEpisodeDetailsHeader', () => {
  it('renders title, description, status badges, and tags', () => {
    render(
      <I18nProvider>
        <AlertEpisodeDetailsHeader
          {...defaultProps}
          tags={['t1']}
          status={ALERT_EPISODE_STATUS.ACTIVE}
        />
      </I18nProvider>
    );
    expect(screen.getByRole('heading', { name: 'Rule 1' })).toBeInTheDocument();
    expect(screen.getByText('Some description')).toBeInTheDocument();
    expect(screen.getByTestId('alertingV2EpisodeDetailsHeaderTags')).toBeInTheDocument();
    expect(screen.getByText('t1')).toBeInTheDocument();
  });

  it('renders the loading title while episode or rule data is loading', () => {
    render(
      <I18nProvider>
        <AlertEpisodeDetailsHeader
          {...defaultProps}
          isLoadingEpisode={true}
          rule={undefined}
          ruleId={undefined}
        />
      </I18nProvider>
    );
    expect(screen.getByTestId('alertingV2EpisodeDetailsHeaderTitle')).toHaveTextContent('Loading…');
  });

  it('renders the loading title while the rule is loading', () => {
    render(
      <I18nProvider>
        <AlertEpisodeDetailsHeader {...defaultProps} isRuleLoading={true} rule={undefined} />
      </I18nProvider>
    );
    expect(screen.getByTestId('alertingV2EpisodeDetailsHeaderTitle')).toHaveTextContent('Loading…');
  });

  it('renders the deleted rule title and rule id when the rule was not found', () => {
    render(
      <I18nProvider>
        <AlertEpisodeDetailsHeader
          {...defaultProps}
          isRuleNotFound={true}
          ruleId="deleted-rule-id"
          rule={undefined}
          status={ALERT_EPISODE_STATUS.ACTIVE}
        />
      </I18nProvider>
    );
    expect(screen.getByTestId('alertingV2EpisodeDetailsHeaderTitle')).toHaveTextContent(
      'Deleted rule'
    );
    expect(screen.getByTestId('alertingV2EpisodeDetailsHeaderDeletedRuleId')).toHaveTextContent(
      'deleted-rule-id'
    );
  });

  it('renders the episode fallback title when the rule has no name', () => {
    render(
      <I18nProvider>
        <AlertEpisodeDetailsHeader {...defaultProps} ruleId={undefined} rule={undefined} />
      </I18nProvider>
    );
    expect(screen.getByTestId('alertingV2EpisodeDetailsHeaderTitle')).toHaveTextContent('Episode');
  });
});
