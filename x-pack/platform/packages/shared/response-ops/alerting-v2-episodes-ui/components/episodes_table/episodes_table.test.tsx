/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { I18nProvider } from '@kbn/i18n-react';
import { UnifiedDataTable, getRowHeight } from '@kbn/unified-data-table';
import { useFetchAlertingEpisodesQuery } from '../../hooks/use_fetch_alerting_episodes_query';
import { AlertHostProvider, type AlertHostContextValue } from '../../context/alert_host_context';
import { EpisodeRuleCell } from '../episodes_table_cell_renderers';
import {
  EpisodesTable,
  type EpisodesTableProps,
  type EpisodesTableServices,
} from './episodes_table';

const episode = (id: string) => ({ 'episode.id': id, 'rule.id': `rule-${id}` });

const setEpisodes = (data: Array<ReturnType<typeof episode>>) => {
  (useFetchAlertingEpisodesQuery as unknown as jest.Mock).mockReturnValue({
    data,
    dataView: { timeFieldName: '@timestamp' },
    isLoading: false,
  });
};

const ruleCellProps = () => {
  const { calls } = (EpisodeRuleCell as unknown as jest.Mock).mock;
  return calls[calls.length - 1][0];
};

const lastGridProps = () => {
  const { calls } = (UnifiedDataTable as unknown as jest.Mock).mock;
  return calls[calls.length - 1][0];
};

jest.mock('@kbn/unified-data-table', () => ({
  DataLoadingState: { loading: 'loading', loaded: 'loaded' },
  ROWS_HEIGHT_OPTIONS: { auto: -1, single: 1, default: 3 },
  UnifiedDataTable: jest.fn((props: { renderCustomToolbar?: () => React.ReactNode }) =>
    props.renderCustomToolbar ? props.renderCustomToolbar() : null
  ),
  getRenderCustomToolbarWithElements: jest.fn(
    ({ leftSide }: { leftSide: React.ReactNode }) =>
      () =>
        leftSide
  ),
  getRowHeight: jest.fn(() => 1),
}));

const ackAction = {
  id: 'ACK',
  order: 10,
  displayName: 'Acknowledge',
  iconType: 'checkCircle',
  isCompatible: () => true,
  execute: jest.fn(),
};
const discoverAction = {
  id: 'DISCOVER',
  order: 20,
  displayName: 'Open in Discover',
  iconType: 'discoverApp',
  enforcesOwnPrivileges: true,
  isCompatible: () => true,
  execute: jest.fn(),
};

jest.mock('../../actions', () => ({
  ...jest.requireActual('../../actions'),
  createEpisodeActions: jest.fn(() => [ackAction, discoverAction]),
}));

jest.mock('../episodes_table_cell_renderers', () => {
  const actual = jest.requireActual('../episodes_table_cell_renderers');
  return { ...actual, EpisodeRuleCell: jest.fn(() => null) };
});

jest.mock('@kbn/cell-actions', () => ({
  CellActionsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../../hooks/use_fetch_alerting_episodes_query', () => ({
  useFetchAlertingEpisodesQuery: jest.fn(),
}));

jest.mock('../../hooks/use_alerting_rules_cache', () => ({
  useAlertingRulesCache: jest.fn(() => ({ rulesCache: {}, loading: false })),
}));

jest.mock('../../hooks/use_alerting_rule_source_data_views', () => ({
  useAlertingRuleSourceDataViews: jest.fn(() => new Map()),
}));

jest.mock('../../hooks/use_invalidate_episode_queries', () => ({
  useInvalidateEpisodeQueries: jest.fn(() => jest.fn()),
}));

const services = {
  uiActions: { getTriggerCompatibleActions: jest.fn() },
  http: {},
  notifications: {},
  application: {},
  dataViews: {},
} as unknown as EpisodesTableServices;

const renderTable = (
  props: Partial<EpisodesTableProps> = {},
  host: AlertHostContextValue = { canWriteAlerts: true }
) =>
  render(
    <I18nProvider>
      <QueryClientProvider client={new QueryClient()}>
        <AlertHostProvider value={host}>
          <EpisodesTable
            services={services}
            filterState={{}}
            timeRange={{ from: 'now-15m', to: 'now' }}
            {...props}
          />
        </AlertHostProvider>
      </QueryClientProvider>
    </I18nProvider>
  );

describe('EpisodesTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getRowHeight as unknown as jest.Mock).mockReturnValue(1);
    setEpisodes([]);
  });

  it('always shows the loaded alert count in the toolbar', () => {
    renderTable();

    expect(screen.getByTestId('alertEpisodesItemCount')).toBeInTheDocument();
  });

  it('renders no extra toolbar controls when the host supplies none', () => {
    renderTable();

    expect(screen.queryByTestId('hostToolbarControl')).not.toBeInTheDocument();
  });

  it('renders the host toolbar controls when supplied', () => {
    renderTable({
      renderAdditionalToolbarControls: () => <button data-test-subj="hostToolbarControl" />,
    });

    expect(screen.getByTestId('hostToolbarControl')).toBeInTheDocument();
  });

  it("seeds an uncontrolled row height from the grid's own stored value", () => {
    renderTable();

    expect(getRowHeight).toHaveBeenCalledWith(
      expect.objectContaining({ consumer: 'alertingV2Alerts' })
    );
    expect(lastGridProps().rowHeightState).toBe(1);
  });

  it('falls back to host-provided rule links when none are passed', () => {
    const getRuleDetailsHref = jest.fn(() => '/rule/1');
    renderTable({}, { getRuleDetailsHref });

    const renderRuleCell = lastGridProps().externalCustomRenderers['rule.id'];
    render(<I18nProvider>{renderRuleCell({ row: { flattened: {} } })}</I18nProvider>);

    expect(ruleCellProps().getRuleDetailsHref).toBe(getRuleDetailsHref);
  });

  it('prefers an explicitly passed rule link over the host default', () => {
    const fromContext = jest.fn();
    const fromProp = jest.fn();
    renderTable({ getRuleDetailsHref: fromProp }, { getRuleDetailsHref: fromContext });

    const renderRuleCell = lastGridProps().externalCustomRenderers['rule.id'];
    render(<I18nProvider>{renderRuleCell({ row: { flattened: {} } })}</I18nProvider>);

    expect(ruleCellProps().getRuleDetailsHref).toBe(fromProp);
  });

  it('uses the supplied row height when controlled', () => {
    renderTable({ rowHeight: 5, onRowHeightChange: jest.fn() });

    expect(lastGridProps().rowHeightState).toBe(5);
  });

  it('renders every loaded alert in one scrolling grid', () => {
    renderTable();

    expect(lastGridProps().paginationMode).toBe('singlePage');
  });

  it('reports a stable configRowHeight so the grid keeps the stored line count', () => {
    renderTable({ rowHeight: 5, onRowHeightChange: jest.fn() });

    expect(lastGridProps().configRowHeight).toBe(3);
  });

  it('claims a total above the cap so the grid shows its limited-results footer', () => {
    setEpisodes([episode('a'), episode('b')]);
    renderTable({ fetchSize: 2 });

    expect(lastGridProps().totalHits).toBe(3);
  });

  it('reports the loaded row count when the list is under the cap', () => {
    setEpisodes([episode('a'), episode('b')]);
    renderTable({ fetchSize: 100 });

    expect(lastGridProps().totalHits).toBe(2);
  });

  it('reports the real row count when the limited-results notice is off', () => {
    setEpisodes([episode('a'), episode('b')]);
    renderTable({ fetchSize: 2, showLimitedResultsNotice: false });

    expect(lastGridProps().totalHits).toBe(2);
  });

  it('builds the standard actions when the host passes none', () => {
    setEpisodes([episode('a')]);
    renderTable();

    expect(lastGridProps().rowAdditionalLeadingControls.map((c: { id: string }) => c.id)).toEqual([
      'ACK',
      'DISCOVER',
    ]);
  });

  it('offers bulk actions by default', () => {
    setEpisodes([episode('a')]);
    renderTable();

    expect(lastGridProps().customBulkActions.length).toBeGreaterThan(0);
  });

  it('drops mutating actions when the host reports read-only', () => {
    setEpisodes([episode('a')]);
    renderTable({}, { canWriteAlerts: false });

    expect(lastGridProps().rowAdditionalLeadingControls.map((c: { id: string }) => c.id)).toEqual([
      'DISCOVER',
    ]);
  });

  it('offers only self-authorizing actions when the host supplies no privilege', () => {
    setEpisodes([episode('a')]);
    renderTable({}, {});

    expect(lastGridProps().rowAdditionalLeadingControls.map((c: { id: string }) => c.id)).toEqual([
      'DISCOVER',
    ]);
  });

  it('says results are capped when the host shows the limited-results notice', () => {
    setEpisodes([episode('a'), episode('b')]);
    renderTable({ fetchSize: 2 });

    expect(screen.getByTestId('alertEpisodesItemCount')).toHaveTextContent('Showing first 2');
  });

  it('never says results are capped when the host opted out of the notice', () => {
    setEpisodes([episode('a'), episode('b')]);
    renderTable({ fetchSize: 2, showLimitedResultsNotice: false });

    expect(screen.getByTestId('alertEpisodesItemCount')).toHaveTextContent('Showing 2');
  });

  it('labels the grid with a generated id rather than a fixed one', () => {
    const { container } = renderTable();

    const labelId = lastGridProps().ariaLabelledBy;
    expect(labelId).not.toBe('alertingEpisodesTableAriaLabel');
    expect(container.querySelector(`span[id="${labelId}"]`)).toBeInTheDocument();
  });

  describe('rule flyout coordination', () => {
    const expandFirstRow = () => act(() => lastGridProps().setExpandedDoc({ id: 'a' }));

    it('asks the host to open the rule flyout when a rule name is clicked', () => {
      const openRuleFlyout = jest.fn();
      renderTable({}, { openRuleFlyout });

      const renderRuleCell = lastGridProps().externalCustomRenderers['rule.id'];
      render(<I18nProvider>{renderRuleCell({ row: { flattened: {} } })}</I18nProvider>);
      act(() => ruleCellProps().onRuleNameClick('rule-1'));

      expect(openRuleFlyout).toHaveBeenCalledWith('rule-1', undefined);
    });

    it('collapses an expanded alert when the rule flyout opens', () => {
      renderTable({}, { openRuleFlyout: jest.fn() });

      expandFirstRow();
      expect(lastGridProps().expandedDoc).toEqual({ id: 'a' });

      const renderRuleCell = lastGridProps().externalCustomRenderers['rule.id'];
      render(<I18nProvider>{renderRuleCell({ row: { flattened: {} } })}</I18nProvider>);
      act(() => ruleCellProps().onRuleNameClick('rule-1'));

      expect(lastGridProps().expandedDoc).toBeUndefined();
    });

    it('closes the host rule flyout when an alert is expanded', () => {
      const closeRuleFlyout = jest.fn();
      renderTable({}, { closeRuleFlyout });

      expandFirstRow();

      expect(closeRuleFlyout).toHaveBeenCalled();
    });

    it('leaves the host flyout alone when a row collapses', () => {
      const closeRuleFlyout = jest.fn();
      renderTable({}, { closeRuleFlyout });

      act(() => lastGridProps().setExpandedDoc(undefined));

      expect(closeRuleFlyout).not.toHaveBeenCalled();
    });
  });
});
