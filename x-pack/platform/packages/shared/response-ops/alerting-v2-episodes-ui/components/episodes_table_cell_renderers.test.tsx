/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { expressionsPluginMock } from '@kbn/expressions-plugin/public/mocks';
import type { FindRulesResponse } from '@kbn/alerting-v2-schemas';
import {
  EpisodeStatusCell,
  EpisodeActionsCell,
  EpisodeTagsCell,
  EpisodeRuleCell,
} from './episodes_table_cell_renderers';
import { AlertEpisodeStatusBadges } from './status/status_badges';
import { AlertEpisodeActions } from './actions/actions';
import { AlertEpisodeTags } from './actions/tags';

jest.mock('./status/status_badges', () => ({
  AlertEpisodeStatusBadges: jest.fn(() => <div data-test-subj="statusBadges" />),
}));
jest.mock('./actions/actions', () => ({
  AlertEpisodeActions: jest.fn(() => <div data-test-subj="episodeActions" />),
}));
jest.mock('./actions/tags', () => ({
  AlertEpisodeTags: jest.fn(() => <div data-test-subj="episodeTags" />),
}));

const mockStatusBadges = jest.mocked(AlertEpisodeStatusBadges);
const mockActions = jest.mocked(AlertEpisodeActions);
const mockTags = jest.mocked(AlertEpisodeTags);

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

beforeEach(() => jest.clearAllMocks());

describe('EpisodeStatusCell', () => {
  const row = makeRow({ 'episode.status': 'active', 'episode.id': 'ep1', group_hash: 'gh1' });
  const episodeActionsMap = new Map([['ep1', { type: 'ack' } as never]]);
  const groupActionsMap = new Map([['gh1', { tags: ['x'] } as never]]);

  it('renders AlertEpisodeStatusBadges', () => {
    render(
      <EpisodeStatusCell
        {...baseCellProps}
        columnId="episode.status"
        row={row}
        episodeActionsMap={episodeActionsMap}
        groupActionsMap={groupActionsMap}
      />
    );
    expect(screen.getByTestId('statusBadges')).toBeInTheDocument();
  });

  it('passes status, episodeAction and groupAction as props', () => {
    render(
      <EpisodeStatusCell
        {...baseCellProps}
        columnId="episode.status"
        row={row}
        episodeActionsMap={episodeActionsMap}
        groupActionsMap={groupActionsMap}
      />
    );
    const props = mockStatusBadges.mock.calls[0][0];
    expect(props.status).toBe('active');
    expect(props.episodeAction).toEqual({ type: 'ack' });
    expect(props.groupAction).toEqual({ tags: ['x'] });
  });

  it('passes undefined episodeAction and groupAction when maps are undefined', () => {
    render(
      <EpisodeStatusCell
        {...baseCellProps}
        columnId="episode.status"
        row={row}
        episodeActionsMap={undefined}
        groupActionsMap={undefined}
      />
    );
    const props = mockStatusBadges.mock.calls[0][0];
    expect(props.episodeAction).toBeUndefined();
    expect(props.groupAction).toBeUndefined();
  });
});

describe('EpisodeActionsCell', () => {
  const row = makeRow({ 'episode.id': 'ep2', group_hash: 'gh2' });
  const mockHttp = httpServiceMock.createStartContract();
  const mockExpressions = expressionsPluginMock.createStartContract();

  it('renders AlertEpisodeActions', () => {
    render(
      <EpisodeActionsCell
        {...baseCellProps}
        row={row}
        episodeActionsMap={new Map()}
        groupActionsMap={new Map()}
        discoverHref="/discover/123"
        viewDetailsHref="/episodes/ep2"
        http={mockHttp}
        expressions={mockExpressions}
      />
    );
    expect(screen.getByTestId('episodeActions')).toBeInTheDocument();
  });

  it('passes episodeId, groupHash, hrefs, http and expressions to AlertEpisodeActions', () => {
    render(
      <EpisodeActionsCell
        {...baseCellProps}
        row={row}
        episodeActionsMap={new Map()}
        groupActionsMap={new Map()}
        discoverHref="/discover/123"
        viewDetailsHref="/episodes/ep2"
        http={mockHttp}
        expressions={mockExpressions}
      />
    );
    const props = mockActions.mock.calls[0][0];
    expect(props.episodeId).toBe('ep2');
    expect(props.groupHash).toBe('gh2');
    expect(props.openInDiscoverHref).toBe('/discover/123');
    expect(props.viewDetailsHref).toBe('/episodes/ep2');
  });
});

describe('EpisodeTagsCell', () => {
  it('passes tags from the matched groupAction', () => {
    const row = makeRow({ group_hash: 'gh3' });
    const groupActionsMap = new Map([['gh3', { tags: ['foo', 'bar'] } as never]]);
    render(<EpisodeTagsCell {...baseCellProps} row={row} groupActionsMap={groupActionsMap} />);
    const props = mockTags.mock.calls[0][0];
    expect(props.tags).toEqual(['foo', 'bar']);
  });

  it('passes empty tags when groupActionsMap is undefined', () => {
    const row = makeRow({ group_hash: 'gh3' });
    render(<EpisodeTagsCell {...baseCellProps} row={row} groupActionsMap={undefined} />);
    const props = mockTags.mock.calls[0][0];
    expect(props.tags).toEqual([]);
  });
});

describe('EpisodeRuleCell', () => {
  const makeRule = (name: string): Rule =>
    ({
      metadata: { name },
      evaluation: { query: { base: `FROM ${name}` } },
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

  it('renders the ES|QL query below the name when rowHeight > 1', () => {
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
    expect(screen.getByText('FROM My Rule')).toBeInTheDocument();
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
});
