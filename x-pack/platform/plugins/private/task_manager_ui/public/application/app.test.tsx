/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { httpServiceMock } from '@kbn/core/public/mocks';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import type { DateRangePickerProps } from '@kbn/date-range-picker';
import {
  createHttpError,
  createOverviewResponse,
  createRemovedTaskListItem,
  createTaskDetailResponse,
  createTaskListResponse,
  createTaskSummary,
  createTaskTypeSummary,
  mockHttpGet,
  renderWithProviders,
} from './test_utils';
import { TaskManagerApp } from './app';

let mockPickerProps: DateRangePickerProps | undefined;

jest.mock('@kbn/date-range-picker', () => ({
  DateRangePicker: (props: DateRangePickerProps) => {
    mockPickerProps = props;
    return <div data-test-subj={props['data-test-subj']} />;
  },
}));

const TIME_RANGE = { start: '2026-10-28T12:00:00.000Z', end: '2026-11-04T12:00:00.000Z' };
const ANY_TIME_RANGE = { start: expect.any(String), end: expect.any(String) };

const pickTimeRange = ({ start, end }: { start: string; end: string }) =>
  act(() =>
    mockPickerProps?.onChange({
      start,
      end,
      startDate: new Date(start),
      endDate: new Date(end),
      value: `${start} to ${end}`,
      isInvalid: false,
    })
  );

const getTaskTypeFilterInput = () =>
  within(screen.getByTestId('taskManagerUiTaskTypeFilter')).getByTestId('comboBoxSearchInput');

describe('TaskManagerApp', () => {
  const http = httpServiceMock.createStartContract();

  beforeEach(() => {
    jest.clearAllMocks();
    mockPickerProps = undefined;
  });

  it('renders the overview stats and task types', async () => {
    mockHttpGet(http, { overview: createOverviewResponse() });

    const { history } = renderWithProviders(<TaskManagerApp />, http);

    expect(history.location.pathname).toBe('/overview');
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(
      'Kibana background tasks'
    );
    expect(await screen.findByTestId('taskManagerUiTaskTypeLink')).toHaveTextContent(
      'report:execute'
    );
    expect(screen.getByTestId('taskManagerUiTaskTypeLink')).toHaveAttribute(
      'href',
      '/report:execute'
    );
    expect(screen.getByTestId('taskManagerUiStatTasks')).toHaveTextContent('10');
    expect(screen.getByTestId('taskManagerUiStatTasksWithFailures')).toHaveTextContent('1');
    expect(screen.getByTestId('taskManagerUiStatFailureRate')).toHaveTextContent('25%');
    expect(http.get).toHaveBeenCalledWith('/internal/task_manager/ui/overview', {
      query: ANY_TIME_RANGE,
      signal: expect.any(AbortSignal),
    });
    expect(mockPickerProps?.value).toBe('now-24h to now');
  });

  it('requests run history for the selected time range', async () => {
    mockHttpGet(http, { overview: createOverviewResponse() });

    const { history } = renderWithProviders(<TaskManagerApp />, http);
    await screen.findByTestId('taskManagerUiTaskTypeLink');
    await pickTimeRange(TIME_RANGE);

    await waitFor(() =>
      expect(http.get).toHaveBeenCalledWith('/internal/task_manager/ui/overview', {
        query: TIME_RANGE,
        signal: expect.any(AbortSignal),
      })
    );
    expect(history.location.pathname).toBe('/overview');
    expect(Object.fromEntries(new URLSearchParams(history.location.search))).toEqual(TIME_RANGE);
  });

  it('opens the task type and time range of a shared URL', async () => {
    mockHttpGet(http, { overview: createOverviewResponse(), tasks: createTaskListResponse() });

    renderWithProviders(<TaskManagerApp />, http, {
      path: `/report:execute?${new URLSearchParams(TIME_RANGE)}`,
    });

    expect(await screen.findByTestId('taskManagerUiTaskLink')).toHaveTextContent('task-1');
    expect(mockPickerProps?.value).toBe(`${TIME_RANGE.start} to ${TIME_RANGE.end}`);
    expect(http.get).toHaveBeenCalledWith('/internal/task_manager/ui/overview', {
      query: TIME_RANGE,
      signal: expect.any(AbortSignal),
    });
    expect(http.get).toHaveBeenCalledWith('/internal/task_manager/ui/tasks', {
      query: expect.objectContaining({ ...TIME_RANGE, task_type: 'report:execute' }),
      signal: expect.any(AbortSignal),
    });
  });

  it('keeps the time range when opening a task type, and goes back to the previous time range', async () => {
    mockHttpGet(http, { overview: createOverviewResponse(), tasks: createTaskListResponse() });
    const timeRangeSearch = `?${new URLSearchParams(TIME_RANGE)}`;

    const { history } = renderWithProviders(<TaskManagerApp />, http);
    await screen.findByTestId('taskManagerUiTaskTypeLink');
    await pickTimeRange(TIME_RANGE);

    expect(screen.getByTestId('taskManagerUiTaskTypeLink')).toHaveAttribute(
      'href',
      `/report:execute${timeRangeSearch}`
    );
    await userEvent.click(screen.getByTestId('taskManagerUiTaskTypeLink'));
    expect(history.location).toMatchObject({
      pathname: '/report:execute',
      search: timeRangeSearch,
    });

    act(() => history.go(-2));

    expect(history.location).toMatchObject({ pathname: '/overview', search: '' });
    expect(mockPickerProps?.value).toBe('now-24h to now');
  });

  it('hints that a task type with runs but no stored tasks removes its tasks after they run', async () => {
    mockHttpGet(http, {
      overview: createOverviewResponse({
        task_types: [
          createTaskTypeSummary(),
          createTaskTypeSummary({ task_type: 'actions:.index', tasks: 0, by_status: {} }),
          createTaskTypeSummary({
            task_type: 'actions:.webhook',
            tasks: 0,
            by_status: {},
            runs: undefined,
          }),
        ],
      }),
    });

    renderWithProviders(<TaskManagerApp />, http);

    expect(await screen.findAllByTestId('taskManagerUiRemovedAfterRunHint')).toHaveLength(1);
    expect(
      within(screen.getByRole('row', { name: /actions:\.index/ })).getByTestId(
        'taskManagerUiRemovedAfterRunHint'
      )
    ).toBeInTheDocument();
  });

  it('groups task types by area and lists the task types of a selected area', async () => {
    mockHttpGet(http, {
      overview: createOverviewResponse({
        task_types: [
          createTaskTypeSummary({ task_type: 'fleet:setup' }),
          createTaskTypeSummary({ task_type: 'Fleet-Usage-Logger', runs: undefined }),
          createTaskTypeSummary({ task_type: 'session_cleanup', runs: undefined }),
        ],
      }),
    });
    const getTextContents = (elements: HTMLElement[]) =>
      elements.map(({ textContent }) => textContent);

    renderWithProviders(<TaskManagerApp />, http);
    await screen.findAllByTestId('taskManagerUiTaskTypeLink');
    await userEvent.click(within(screen.getByTestId('taskManagerUiGroupBy')).getByText('Area'));

    const areas = await screen.findByTestId('taskManagerUiTaskAreasTable');
    expect(getTextContents(within(areas).getAllByTestId('taskManagerUiAreaLink'))).toEqual([
      'fleet',
      'session',
    ]);

    await userEvent.click(within(areas).getByText('fleet'));

    await waitFor(() =>
      expect(getTextContents(screen.getAllByTestId('taskManagerUiTaskTypeLink'))).toEqual([
        'fleet:setup',
        'Fleet-Usage-Logger',
      ])
    );
  });

  it('shows callouts when task execution is paused or task types are excluded', async () => {
    mockHttpGet(http, {
      overview: createOverviewResponse({
        execution_control: { paused: true, paused_task_types: ['report:execute'] },
        excluded_task_types: ['actions:*'],
        event_log_available: false,
      }),
    });

    renderWithProviders(<TaskManagerApp />, http);

    expect(await screen.findByTestId('taskManagerUiPausedCallout')).toBeInTheDocument();
    expect(screen.getByTestId('taskManagerUiPausedTypesCallout')).toHaveTextContent(
      'report:execute'
    );
    expect(screen.getByTestId('taskManagerUiExcludedCallout')).toHaveTextContent('actions:*');
    expect(screen.getByTestId('taskManagerUiNoEventLogCallout')).toBeInTheDocument();
  });

  it('shows the no access prompt when the user lacks the Task Manager privilege', async () => {
    mockHttpGet(http, { overview: createHttpError(403, 'Forbidden') });

    renderWithProviders(<TaskManagerApp />, http);

    expect(await screen.findByTestId('taskManagerUiNoAccessPrompt')).toBeInTheDocument();
    expect(screen.queryByTestId('taskManagerUiTaskTypesTable')).not.toBeInTheDocument();
  });

  it('shows an error callout when the overview fails to load', async () => {
    mockHttpGet(http, { overview: createHttpError(500, 'Internal Server Error') });

    renderWithProviders(<TaskManagerApp />, http);

    expect(await screen.findByText('Unable to load Kibana background tasks')).toBeInTheDocument();
    expect(screen.getByText('Internal Server Error')).toBeInTheDocument();
  });

  it('lists the tasks of a task type and explains a selected task', async () => {
    mockHttpGet(http, {
      overview: createOverviewResponse(),
      tasks: createTaskListResponse(),
      task: createTaskDetailResponse(),
    });

    const { history } = renderWithProviders(<TaskManagerApp />, http);
    await userEvent.click(await screen.findByTestId('taskManagerUiTaskTypeLink'));

    expect(history.location.pathname).toBe('/report:execute');
    expect(await screen.findByTestId('taskManagerUiTaskLink')).toHaveTextContent('task-1');
    expect(http.get).toHaveBeenCalledWith('/internal/task_manager/ui/tasks', {
      query: expect.objectContaining({ task_type: 'report:execute', page: 1, per_page: 20 }),
      signal: expect.any(AbortSignal),
    });
    expect(
      within(screen.getByTestId('taskManagerUiTasksTable')).getAllByTestId('tableHeaderSortButton')
        .length
    ).toBeGreaterThan(0);

    await userEvent.click(screen.getByTestId('taskManagerUiTaskLink'));

    expect(await screen.findByTestId('taskManagerUiExplanation')).toHaveTextContent(
      "This task won't run"
    );
  });

  it('shows the latest failure in the window below a last run that succeeded', async () => {
    const failure = {
      at: '2026-10-31T13:26:34.000Z',
      outcome: 'failure',
      error_message: 'Request timed out',
    };
    mockHttpGet(http, {
      overview: createOverviewResponse(),
      tasks: {
        ...createTaskListResponse(),
        tasks: [
          {
            ...createTaskSummary({ id: 'recovered', status: 'idle' }),
            removed: false,
            last_run: { at: '2026-11-04T10:00:00.000Z', outcome: 'success' },
            last_failure: failure,
          },
          {
            ...createTaskSummary({ id: 'failing', status: 'idle' }),
            removed: false,
            last_run: failure,
            last_failure: failure,
          },
        ],
      },
    });

    renderWithProviders(<TaskManagerApp />, http);
    await screen.findByTestId('taskManagerUiTaskTypeLink');
    await userEvent.click(screen.getByTestId('taskManagerUiTasksTab'));

    const table = await screen.findByTestId('taskManagerUiTasksTable');
    await waitFor(() =>
      expect(within(table).getAllByTestId('taskManagerUiTaskLink')).toHaveLength(2)
    );
    const [, recoveredRow, failingRow] = within(table).getAllByRole('row');
    expect(within(recoveredRow).getByTestId('taskManagerUiTaskLink')).toHaveTextContent(
      'recovered'
    );
    expect(within(failingRow).getByTestId('taskManagerUiTaskLink')).toHaveTextContent('failing');
    expect(within(recoveredRow).getByTestId('taskManagerUiEarlierFailure')).toHaveTextContent(
      /^Failed .+: Request timed out$/
    );
    expect(within(recoveredRow).queryByTestId('taskManagerUiLastRunError')).not.toBeInTheDocument();
    expect(within(failingRow).getByTestId('taskManagerUiLastRunError')).toHaveTextContent(
      'Request timed out'
    );
    expect(within(failingRow).queryByTestId('taskManagerUiEarlierFailure')).not.toBeInTheDocument();
  });

  it('offers only the statuses that tasks have, with counts for the selected task type', async () => {
    mockHttpGet(http, {
      overview: createOverviewResponse({
        totals: { tasks: 11, overdue: 1, by_status: { idle: 8, failed: 2, running: 1 } },
        task_types: [
          createTaskTypeSummary(),
          createTaskTypeSummary({
            task_type: 'actions:.webhook',
            by_status: { running: 1 },
            runs: undefined,
          }),
        ],
      }),
      tasks: createTaskListResponse(),
    });
    const getStatusOptions = () =>
      within(screen.getByTestId('taskManagerUiStatusFilter'))
        .getAllByRole('option')
        .map(({ textContent }) => textContent);

    const { history } = renderWithProviders(<TaskManagerApp />, http);
    await screen.findAllByTestId('taskManagerUiTaskTypeLink');
    await userEvent.click(screen.getByTestId('taskManagerUiTasksTab'));

    expect(history.location.pathname).toBe('/tasks');
    expect(getStatusOptions()).toEqual([
      'All statuses',
      'Idle (8)',
      'Running (1)',
      'Failed (2)',
      'Failed in time range (1)',
    ]);

    await userEvent.click(screen.getByTestId('taskManagerUiOverviewTab'));
    await userEvent.click(screen.getByText('actions:.webhook'));

    expect(history.location.pathname).toBe('/actions:.webhook');
    expect(getStatusOptions()).toEqual(['All statuses', 'Running (1)']);
  });

  it.each(['/', '/overview/report:execute'])('redirects %s to the overview', async (path) => {
    mockHttpGet(http, { overview: createOverviewResponse() });

    const { history } = renderWithProviders(<TaskManagerApp />, http, { path });

    expect(history.location.pathname).toBe('/overview');
    expect(await screen.findByTestId('taskManagerUiTaskTypesTable')).toBeInTheDocument();
  });

  it('lists the tasks of the task type in the path', async () => {
    mockHttpGet(http, { overview: createOverviewResponse(), tasks: createTaskListResponse() });

    renderWithProviders(<TaskManagerApp />, http, { path: '/report:execute' });

    expect(await screen.findByTestId('taskManagerUiTaskLink')).toHaveTextContent('task-1');
    expect(screen.getByTestId('taskManagerUiTasksTab')).toHaveAttribute('aria-selected', 'true');
    expect(getTaskTypeFilterInput()).toHaveValue('report:execute');
    expect(http.get).toHaveBeenCalledWith('/internal/task_manager/ui/tasks', {
      query: expect.objectContaining({ task_type: 'report:execute' }),
      signal: expect.any(AbortSignal),
    });
  });

  it('shows all task types in the path when the task type filter is cleared', async () => {
    mockHttpGet(http, { overview: createOverviewResponse(), tasks: createTaskListResponse() });

    const { history } = renderWithProviders(<TaskManagerApp />, http, {
      path: '/report:execute',
    });
    await screen.findByTestId('taskManagerUiTaskLink');
    await userEvent.click(
      within(screen.getByTestId('taskManagerUiTaskTypeFilter')).getByTestId('comboBoxClearButton')
    );

    expect(history.location.pathname).toBe('/tasks');
  });

  it('follows the browser history between the overview and task lists', async () => {
    mockHttpGet(http, { overview: createOverviewResponse(), tasks: createTaskListResponse() });
    const statusFilter = () => screen.getByTestId('taskManagerUiStatusFilter');

    const { history } = renderWithProviders(<TaskManagerApp />, http);
    await userEvent.click(await screen.findByTestId('taskManagerUiTaskTypeFailuresLink'));
    expect(history.location.pathname).toBe('/report:execute');
    expect(statusFilter()).toHaveDisplayValue('Failed in time range (1)');

    act(() => history.goBack());
    expect(await screen.findByTestId('taskManagerUiTaskTypesTable')).toBeInTheDocument();

    act(() => history.goForward());
    expect(statusFilter()).toHaveDisplayValue('Failed in time range (1)');

    act(() => history.push('/tasks'));
    expect(getTaskTypeFilterInput()).toHaveValue('');
    expect(statusFilter()).toHaveDisplayValue('All statuses');

    act(() => history.goBack());
    expect(getTaskTypeFilterInput()).toHaveValue('report:execute');
    expect(statusFilter()).toHaveDisplayValue('All statuses');
  });

  it('returns to the last task list from the overview', async () => {
    mockHttpGet(http, { overview: createOverviewResponse(), tasks: createTaskListResponse() });

    const { history } = renderWithProviders(<TaskManagerApp />, http);
    await userEvent.click(await screen.findByTestId('taskManagerUiTaskTypeLink'));
    await userEvent.click(screen.getByTestId('taskManagerUiOverviewTab'));
    expect(history.location.pathname).toBe('/overview');

    await userEvent.click(screen.getByTestId('taskManagerUiTasksTab'));

    expect(history.location.pathname).toBe('/report:execute');
  });

  it('lists the tasks of a task type that failed in the time range from its failures link, and opens their history', async () => {
    mockHttpGet(http, {
      overview: createOverviewResponse(),
      tasks: createTaskListResponse([createTaskSummary()], [createRemovedTaskListItem()]),
      task: createTaskDetailResponse({
        task: undefined,
        explanation: { verdict: 'attention', reasons: [{ code: 'removed' }] },
      }),
    });

    renderWithProviders(<TaskManagerApp />, http);
    await userEvent.click(await screen.findByTestId('taskManagerUiTaskTypeFailuresLink'));

    const table = await screen.findByTestId('taskManagerUiTasksTable');
    await waitFor(() =>
      expect(within(table).getAllByTestId('taskManagerUiTaskLink')).toHaveLength(2)
    );
    expect(within(table).getAllByTestId('taskManagerUiRemovedTaskBadge')).toHaveLength(1);
    expect(within(table).getByTestId('taskManagerUiLastRunError')).toHaveTextContent(
      'error indexing documents'
    );
    expect(http.get).toHaveBeenCalledWith('/internal/task_manager/ui/tasks', {
      query: expect.objectContaining({
        ...ANY_TIME_RANGE,
        task_type: 'report:execute',
        status: 'failed_in_window',
      }),
      signal: expect.any(AbortSignal),
    });
    expect(screen.getByTestId('taskManagerUiStatusFilter')).toHaveDisplayValue(
      'Failed in time range (1)'
    );
    expect(within(table).queryAllByTestId('tableHeaderSortButton')).toHaveLength(0);

    await userEvent.click(within(table).getAllByTestId('taskManagerUiTaskLink')[1]);

    expect(await screen.findByTestId('taskManagerUiExplanation')).toHaveTextContent(
      'This task no longer exists.'
    );
    expect(http.get).toHaveBeenCalledWith('/internal/task_manager/ui/tasks/removed-task', {
      query: ANY_TIME_RANGE,
      signal: expect.any(AbortSignal),
    });
  });

  it('filters the task list to tasks that failed in the selected time range, from its first page', async () => {
    mockHttpGet(http, {
      overview: createOverviewResponse(),
      tasks: { ...createTaskListResponse([], [createRemovedTaskListItem()]), total: 41 },
    });

    renderWithProviders(<TaskManagerApp />, http);
    await screen.findByTestId('taskManagerUiTaskTypeLink');
    await userEvent.click(screen.getByTestId('taskManagerUiTasksTab'));
    await userEvent.selectOptions(
      screen.getByTestId('taskManagerUiStatusFilter'),
      'failed_in_window'
    );
    await userEvent.click(await screen.findByTestId('pagination-button-1'));
    await waitFor(() =>
      expect(http.get).toHaveBeenCalledWith('/internal/task_manager/ui/tasks', {
        query: expect.objectContaining({ page: 2 }),
        signal: expect.any(AbortSignal),
      })
    );
    await pickTimeRange(TIME_RANGE);

    await waitFor(() =>
      expect(http.get).toHaveBeenCalledWith('/internal/task_manager/ui/tasks', {
        query: expect.objectContaining({ ...TIME_RANGE, status: 'failed_in_window', page: 1 }),
        signal: expect.any(AbortSignal),
      })
    );
    expect(screen.getByTestId('taskManagerUiStatusFilter')).toHaveDisplayValue(
      'Failed in time range (1)'
    );
  });

  it('opens the run history of a task ID that is no longer stored', async () => {
    mockHttpGet(http, {
      overview: createOverviewResponse(),
      tasks: createTaskListResponse([]),
      task: createTaskDetailResponse({ task: undefined }),
    });

    renderWithProviders(<TaskManagerApp />, http);
    await screen.findByTestId('taskManagerUiTaskTypeLink');
    await userEvent.click(screen.getByTestId('taskManagerUiTasksTab'));
    await userEvent.type(screen.getByTestId('taskManagerUiTaskIdSearch'), 'removed-task{enter}');
    await userEvent.click(await screen.findByTestId('taskManagerUiTaskHistoryLink'));

    expect(await screen.findByTestId('taskManagerUiTaskFlyout')).toBeInTheDocument();
    expect(http.get).toHaveBeenCalledWith('/internal/task_manager/ui/tasks/removed-task', {
      query: ANY_TIME_RANGE,
      signal: expect.any(AbortSignal),
    });
  });
});
