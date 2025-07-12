/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import { render, screen } from '@testing-library/react';
import { EventLogListCellRenderer, DEFAULT_DATE_FORMAT } from './event_log_list_cell_renderer';
import { EventLogListStatus } from './event_log_list_status';
import { RuleDurationFormat } from '../../../rules_list/components/rule_duration_format';

jest.mock('react-router-dom', () => ({
  useHistory: () => ({
    location: {
      pathname: '/logs',
    },
    push: jest.fn(),
  }),
}));

jest.mock('../../../../../common/lib/kibana', () => ({
  useSpacesData: () => ({
    spacesMap: new Map([
      ['space1', { id: 'space1', name: 'Space 1' }],
      ['space2', { id: 'space2', name: 'Space 2' }],
    ]),
    activeSpaceId: 'space1',
  }),
  useKibana: () => ({
    services: {
      http: {
        basePath: {
          get: () => '/basePath',
        },
      },
    },
  }),
}));

jest.mock('../../../rules_list/components/rule_duration_format', () => ({
  RuleDurationFormat: jest.fn(({ duration }) => (
    <span data-test-subj="rule-duration">{duration}</span>
  )),
}));

jest.mock('./event_log_list_status', () => ({
  EventLogListStatus: jest.fn((props) => (
    <span data-test-subj="event-log-status">{props.status}</span>
  )),
}));

describe('EventLogListCellRenderer', () => {
  let originalLocation: Location;

  beforeAll(() => {
    originalLocation = window.location;
    // @ts-ignore
    delete window.location;
    // @ts-ignore
    window.location = {
      ...originalLocation,
      ancestorOrigins: {} as DOMStringList,
      assign: jest.fn(),
      reload: jest.fn(),
      replace: jest.fn(),
      href: 'https://localhost/app/management/insightsAndAlerting/triggersActions/logs',
    };
  });

  afterAll(() => {
    window.location = originalLocation;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // @ts-ignore
    window.location.href =
      'https://localhost/app/management/insightsAndAlerting/triggersActions/logs';
  });

  it('renders primitive values correctly', () => {
    render(<EventLogListCellRenderer columnId="message" value="test" />);
    expect(screen.getByText('test')).toBeInTheDocument();
  });

  it('renders undefined correctly', () => {
    const { container } = render(<EventLogListCellRenderer columnId="message" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders date duration correctly', () => {
    render(<EventLogListCellRenderer columnId="execution_duration" value="100000" />);
    expect(RuleDurationFormat).toHaveBeenCalledWith({ duration: 100000 }, {});
    expect(screen.getByTestId('rule-duration')).toHaveTextContent('100000');
  });

  it('renders alert count correctly', () => {
    render(<EventLogListCellRenderer columnId="num_new_alerts" value="3" version="8.3.0" />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders timestamps correctly', () => {
    const time = '2022-03-20T07:40:44-07:00';
    render(<EventLogListCellRenderer columnId="timestamp" value={time} />);
    expect(screen.getByText(moment(time).format(DEFAULT_DATE_FORMAT))).toBeInTheDocument();
  });

  it('renders alert status correctly', () => {
    render(<EventLogListCellRenderer columnId="status" value="success" />);
    expect(EventLogListStatus).toHaveBeenCalledWith(
      { status: 'success', useExecutionStatus: true },
      {}
    );
    expect(screen.getByTestId('event-log-status')).toHaveTextContent('success');
  });

  it('unaccounted status will still render', () => {
    render(<EventLogListCellRenderer columnId="status" value="newOutcome" />);
    expect(EventLogListStatus).toHaveBeenCalledWith(
      { status: 'newOutcome', useExecutionStatus: true },
      {}
    );
    expect(screen.getByTestId('event-log-status')).toHaveTextContent('newOutcome');
  });

  it('renders maintenance window correctly', () => {
    render(
      <EventLogListCellRenderer
        columnId="maintenance_window_ids"
        value={['test-id-1', 'test-id-2']}
      />
    );
    expect(screen.getByText('test-id-1, test-id-2')).toBeInTheDocument();
  });

  it('links to rules on the active space', () => {
    render(
      <EventLogListCellRenderer
        columnId="rule_name"
        value="Rule"
        ruleId="1"
        spaceIds={['space1']}
      />
    );
    const linkButton = screen.getByRole('button', { name: 'Rule' });
    expect(linkButton).toHaveAttribute('data-href', '/rule/1');
  });

  it('links to rules on a different space', () => {
    render(
      <EventLogListCellRenderer
        columnId="rule_name"
        value="Rule"
        ruleId="1"
        spaceIds={['space2']}
      />
    );
    const linkButton = screen.getByRole('button', { name: 'Rule' });
    expect(linkButton).toHaveAttribute('data-href', '/basePath/s/space2/');
  });
});
