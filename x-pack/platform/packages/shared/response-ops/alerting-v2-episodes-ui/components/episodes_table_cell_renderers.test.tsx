/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { FindRulesResponse } from '@kbn/alerting-v2-schemas';
import {
  EpisodeStatusCell,
  EpisodeTagsCell,
  EpisodeRuleCell,
  EpisodeSeverityCell,
} from './episodes_table_cell_renderers';

const renderWithI18n = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

type Rule = FindRulesResponse['items'][number];

const makeRow = (fields: Record<string, unknown>) => ({
  id: '0',
  raw: {},
  flattened: fields,
});

const baseCellProps = {
  columnId: 'episode.status',
  dataView: {} as never,
  fieldFormats: {} as never,
  closePopover: jest.fn(),
  setCellProps: jest.fn(),
  rowIndex: 0,
  colIndex: 0,
  columnsMeta: undefined,
  isDetails: false,
  isExpanded: false,
  isExpandable: false,
};

describe('EpisodeStatusCell', () => {
  it('renders the status label plus snooze + ack indicators when the row carries those action fields', () => {
    const row = makeRow({
      'episode.status': 'active',
      'episode.id': 'ep1',
      'rule.id': 'r1',
      group_hash: 'gh1',
      last_ack_action: 'ack',
      last_snooze_action: 'snooze',
      snooze_expiry: '3035-01-01T00:00:00Z',
    });
    renderWithI18n(<EpisodeStatusCell {...baseCellProps} columnId="episode.status" row={row} />);

    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByTestId('alertEpisodeStatusCellSnoozeIndicator')).toBeInTheDocument();
    expect(screen.getByTestId('alertEpisodeStatusCellAckIndicator')).toBeInTheDocument();
  });

  it('renders only the status label when the row has no action fields', () => {
    const row = makeRow({
      'episode.status': 'active',
      'episode.id': 'ep1',
      'rule.id': 'r1',
      group_hash: 'gh1',
    });
    renderWithI18n(<EpisodeStatusCell {...baseCellProps} columnId="episode.status" row={row} />);

    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.queryByTestId('alertEpisodeStatusCellSnoozeIndicator')).not.toBeInTheDocument();
    expect(screen.queryByTestId('alertEpisodeStatusCellAckIndicator')).not.toBeInTheDocument();
  });
});

describe('EpisodeTagsCell', () => {
  it('renders a badge for each tag in the row last_tags field', () => {
    const row = makeRow({ group_hash: 'gh3', last_tags: ['foo', 'bar'] });
    renderWithI18n(<EpisodeTagsCell {...baseCellProps} row={row} />);

    expect(screen.getByText('foo')).toBeInTheDocument();
    expect(screen.getByText('bar')).toBeInTheDocument();
  });
});

describe('EpisodeSeverityCell', () => {
  it('renders the severity badge for the row severity field', () => {
    const row = makeRow({ severity: 'high' });
    renderWithI18n(<EpisodeSeverityCell {...baseCellProps} row={row} />);

    expect(screen.getByTestId('alertingV2EpisodeSeverityBadge-high')).toHaveTextContent('High');
  });
});

describe('EpisodeRuleCell', () => {
  const makeRule = (name: string, grouping?: { fields: string[] }): Rule =>
    ({
      metadata: { name },
      query: { format: 'standalone', breach: { query: `FROM ${name}` } },
      ...(grouping ? { grouping } : {}),
    } as unknown as Rule);

  it('renders a skeleton when rules are loading and cache is empty', () => {
    const row = makeRow({ 'rule.id': 'r1' });
    render(
      <EpisodeRuleCell
        {...baseCellProps}
        columnId="rule.id"
        row={row}
        rulesCache={{}}
        isLoadingRules={true}
        rowHeight={2}
      />
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders the raw ruleId when the rule id is missing from bulk get', () => {
    const row = makeRow({ 'rule.id': 'deleted-rule' });
    render(
      <EpisodeRuleCell
        {...baseCellProps}
        columnId="rule.id"
        row={row}
        rulesCache={{}}
        isLoadingRules={false}
        rowHeight={1}
      />
    );
    expect(screen.getByText('deleted-rule')).toBeInTheDocument();
  });

  it('renders the raw ruleId when the rule is not in cache', () => {
    const row = makeRow({ 'rule.id': 'unknown-rule' });
    render(
      <EpisodeRuleCell
        {...baseCellProps}
        columnId="rule.id"
        row={row}
        rulesCache={{}}
        isLoadingRules={false}
        rowHeight={2}
      />
    );
    expect(screen.getByText('unknown-rule')).toBeInTheDocument();
  });

  it('renders the rule name when rule is in cache', () => {
    const row = makeRow({ 'rule.id': 'r1' });
    render(
      <EpisodeRuleCell
        {...baseCellProps}
        columnId="rule.id"
        row={row}
        rulesCache={{ r1: makeRule('My Rule') }}
        isLoadingRules={false}
        rowHeight={2}
      />
    );
    expect(screen.getByText('My Rule')).toBeInTheDocument();
  });

  it('renders the ES|QL query below the rule row when rowHeight > 1', () => {
    const row = makeRow({ 'rule.id': 'r1' });
    render(
      <EpisodeRuleCell
        {...baseCellProps}
        columnId="rule.id"
        row={row}
        rulesCache={{ r1: makeRule('My Rule', { fields: ['host.name'] }) }}
        isLoadingRules={false}
        rowHeight={2}
      />
    );
    expect(screen.getByText('FROM My Rule')).toBeInTheDocument();
  });

  it('renders grouping value tags after the rule name when rule has grouping.fields and episode_data', () => {
    const row = makeRow({
      'rule.id': 'r1',
      episode_data: JSON.stringify({ host: { name: 'server-1' } }),
    });
    render(
      <EpisodeRuleCell
        {...baseCellProps}
        columnId="rule.id"
        row={row}
        rulesCache={{ r1: makeRule('My Rule', { fields: ['host.name'] }) }}
        isLoadingRules={false}
        rowHeight={2}
      />
    );
    expect(screen.getByTestId('episodeRuleCellGroupingTags')).toBeInTheDocument();
    expect(screen.getByLabelText('host.name: server-1')).toBeInTheDocument();
    expect(screen.getByText('server-1')).toBeInTheDocument();
  });

  it('does not render the query when rowHeight is 1', () => {
    const row = makeRow({ 'rule.id': 'r1' });
    render(
      <EpisodeRuleCell
        {...baseCellProps}
        columnId="rule.id"
        row={row}
        rulesCache={{ r1: makeRule('My Rule') }}
        isLoadingRules={false}
        rowHeight={1}
      />
    );
    expect(screen.getByText('My Rule')).toBeInTheDocument();
    expect(screen.queryByText('FROM My Rule')).not.toBeInTheDocument();
  });

  it('does not render grouping tags when rule has no grouping.fields', () => {
    const row = makeRow({ 'rule.id': 'r1' });
    render(
      <EpisodeRuleCell
        {...baseCellProps}
        columnId="rule.id"
        row={row}
        rulesCache={{ r1: makeRule('My Rule') }}
        isLoadingRules={false}
        rowHeight={2}
      />
    );
    expect(screen.queryByTestId('episodeRuleCellGroupingTags')).not.toBeInTheDocument();
  });

  it('does not render grouping tags when all grouping values are empty', () => {
    const row = makeRow({
      'rule.id': 'r1',
      episode_data: JSON.stringify({}),
    });
    render(
      <EpisodeRuleCell
        {...baseCellProps}
        columnId="rule.id"
        row={row}
        rulesCache={{ r1: makeRule('My Rule', { fields: ['host.name'] }) }}
        isLoadingRules={false}
        rowHeight={2}
      />
    );
    expect(screen.queryByTestId('episodeRuleCellGroupingTags')).not.toBeInTheDocument();
    expect(screen.getByText('FROM My Rule')).toBeInTheDocument();
  });
});
