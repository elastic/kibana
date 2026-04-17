/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { EventActionOptions, SeverityActionOptions } from '../types';
import PagerDutyParamsFields from './pagerduty_params';

describe('PagerDutyParamsFields renders', () => {
  test('all params fields are rendered', () => {
    const actionParams = {
      eventAction: EventActionOptions.TRIGGER,
      dedupKey: 'test',
      summary: '2323',
      source: 'source',
      severity: SeverityActionOptions.CRITICAL,
      timestamp: new Date().toISOString(),
      component: 'test',
      group: 'group',
      class: 'test class',
      customDetails: '{"foo":"bar"}',
      links: [
        { href: 'foo', text: 'bar' },
        { href: 'foo', text: 'bar' },
      ],
    };

    renderWithI18n(
      <PagerDutyParamsFields
        actionParams={actionParams}
        errors={{ summary: [], timestamp: [], dedupKey: [] }}
        editAction={() => {}}
        index={0}
        messageVariables={[
          {
            name: 'myVar',
            description: 'My variable description',
            useWithTripleBracesInTemplates: true,
          },
        ]}
      />
    );
    expect(screen.getByTestId('severitySelect')).toBeInTheDocument();
    expect(screen.getByTestId('severitySelect')).toHaveValue('critical');
    expect(screen.getByTestId('dedupKeyInput')).toBeInTheDocument();
    expect(screen.getByTestId('dedupKeyInput')).toHaveValue('test');
    expect(screen.getByTestId('eventActionSelect')).toBeInTheDocument();
    expect(screen.getByTestId('timestampInput')).toBeInTheDocument();
    expect(screen.getByTestId('componentInput')).toBeInTheDocument();
    expect(screen.getByTestId('groupInput')).toBeInTheDocument();
    expect(screen.getByTestId('sourceInput')).toBeInTheDocument();
    expect(screen.getByTestId('summaryInput')).toBeInTheDocument();
    expect(screen.getByTestId('dedupKeyAddVariableButton')).toBeInTheDocument();
    expect(screen.getAllByTestId('customDetailsJsonEditor').length).toBeGreaterThan(0);
    expect(screen.getByTestId('linksList')).toBeInTheDocument();
    expect(screen.getByTestId('pagerDutyAddLinkButton')).toBeInTheDocument();
  });

  test('params select fields do not auto set values eventActionSelect', () => {
    const actionParams = {};

    renderWithI18n(
      <PagerDutyParamsFields
        actionParams={actionParams}
        errors={{ summary: [], timestamp: [], dedupKey: [] }}
        editAction={() => {}}
        index={0}
      />
    );
    expect(screen.getByTestId('eventActionSelect')).toBeInTheDocument();
    expect(screen.getByTestId('eventActionSelect')).toHaveValue('');
  });

  test('params select fields do not auto set values severitySelect', () => {
    const actionParams = {
      eventAction: EventActionOptions.TRIGGER,
      dedupKey: 'test',
    };

    renderWithI18n(
      <PagerDutyParamsFields
        actionParams={actionParams}
        errors={{ summary: [], timestamp: [], dedupKey: [] }}
        editAction={() => {}}
        index={0}
      />
    );
    expect(screen.getByTestId('severitySelect')).toBeInTheDocument();
    expect(screen.getByTestId('severitySelect')).toHaveValue('');
  });

  test('only eventActionSelect is available as a payload params for PagerDuty Resolve event', () => {
    const actionParams = {
      eventAction: EventActionOptions.RESOLVE,
      dedupKey: 'test',
    };

    renderWithI18n(
      <PagerDutyParamsFields
        actionParams={actionParams}
        errors={{ summary: [], timestamp: [], dedupKey: [] }}
        editAction={() => {}}
        index={0}
      />
    );
    expect(screen.getByTestId('dedupKeyInput')).toBeInTheDocument();
    expect(screen.getByTestId('dedupKeyInput')).toHaveValue('test');
    expect(screen.getByTestId('eventActionSelect')).toBeInTheDocument();
    expect(screen.getByTestId('eventActionSelect')).toHaveValue('resolve');
    expect(screen.queryByTestId('timestampInput')).not.toBeInTheDocument();
    expect(screen.queryByTestId('componentInput')).not.toBeInTheDocument();
    expect(screen.queryByTestId('groupInput')).not.toBeInTheDocument();
    expect(screen.queryByTestId('sourceInput')).not.toBeInTheDocument();
    expect(screen.queryByTestId('summaryInput')).not.toBeInTheDocument();
  });
});
