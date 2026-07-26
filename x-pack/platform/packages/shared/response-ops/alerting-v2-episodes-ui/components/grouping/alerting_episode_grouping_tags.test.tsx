/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DataView } from '@kbn/data-views-plugin/common';
import { AlertingEpisodeGroupingTags } from './alerting_episode_grouping_tags';

describe('AlertingEpisodeGroupingTags', () => {
  it('renders only grouping badges with non-empty values', () => {
    render(
      <AlertingEpisodeGroupingTags
        fields={['host.name', 'service.name', 'missing']}
        data={{ host: { name: 'server-1' }, service: { name: 'checkout' } }}
        data-test-subj="groupingTags"
      />
    );

    expect(screen.getByTestId('groupingTags')).toBeInTheDocument();
    expect(screen.getByLabelText('host.name: server-1')).toBeInTheDocument();
    expect(screen.getByLabelText('service.name: checkout')).toBeInTheDocument();
  });

  it('renders nothing when the grouping fields have a empty values', () => {
    render(
      <AlertingEpisodeGroupingTags
        fields={['host.name', 'service.name']}
        data={{ host: { name: '  ' }, service: { name: '' } }}
        data-test-subj="groupingTags"
      />
    );

    expect(screen.queryByTestId('groupingTags')).not.toBeInTheDocument();
  });

  it('shows full field and value in popover when a badge is clicked', async () => {
    const user = userEvent.setup();

    render(
      <AlertingEpisodeGroupingTags fields={['host.name']} data={{ host: { name: 'server-1' } }} />
    );

    await user.click(screen.getByLabelText('host.name: server-1'));

    expect(await screen.findByText('host.name')).toBeInTheDocument();
  });

  it('flattens object-shaped values without a data view (e.g. IP objects) into readable text', () => {
    render(
      <AlertingEpisodeGroupingTags
        fields={['source.ip']}
        data={{ 'source.ip': { ip: '10.0.0.1' } }}
        data-test-subj="groupingTags"
      />
    );

    expect(screen.getByLabelText('source.ip: 10.0.0.1')).toBeInTheDocument();
  });

  it('formats values with the data view field formatter when a data view is provided', () => {
    const dataView = {
      getFieldByName: (name: string) =>
        name === 'source.ip' ? { name, type: 'ip', esTypes: ['ip'] } : undefined,
      getFormatterForField: () => ({ convertToText: (value: unknown) => `ip(${String(value)})` }),
    } as unknown as DataView;

    render(
      <AlertingEpisodeGroupingTags
        fields={['source.ip']}
        data={{ 'source.ip': '10.0.0.1' }}
        dataView={dataView}
        data-test-subj="groupingTags"
      />
    );

    expect(screen.getByLabelText('source.ip: ip(10.0.0.1)')).toBeInTheDocument();
  });
});
