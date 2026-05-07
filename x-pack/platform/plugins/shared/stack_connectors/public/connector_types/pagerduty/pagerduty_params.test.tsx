/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { screen, within } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import type { PagerDutyActionParams } from '../types';
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

    const wrapper = mountWithIntl(
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
    expect(wrapper.find('[data-test-subj="severitySelect"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="severitySelect"]').first().prop('value')).toStrictEqual(
      'critical'
    );
    expect(wrapper.find('[data-test-subj="dedupKeyInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="dedupKeyInput"]').first().prop('value')).toStrictEqual(
      'test'
    );
    expect(wrapper.find('[data-test-subj="eventActionSelect"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="dedupKeyInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="timestampInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="componentInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="groupInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="sourceInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="summaryInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="dedupKeyAddVariableButton"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="customDetailsJsonEditor"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="linksList"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="pagerDutyAddLinkButton"]').length > 0).toBeTruthy();
  });

  test('params select fields do not auto set values eventActionSelect', () => {
    const actionParams = {};

    const wrapper = mountWithIntl(
      <PagerDutyParamsFields
        actionParams={actionParams}
        errors={{ summary: [], timestamp: [], dedupKey: [] }}
        editAction={() => {}}
        index={0}
      />
    );
    expect(wrapper.find('[data-test-subj="eventActionSelect"]').length > 0).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="eventActionSelect"]').first().prop('value')
    ).toStrictEqual(undefined);
  });

  test('params select fields do not auto set values severitySelect', () => {
    const actionParams = {
      eventAction: EventActionOptions.TRIGGER,
      dedupKey: 'test',
    };

    const wrapper = mountWithIntl(
      <PagerDutyParamsFields
        actionParams={actionParams}
        errors={{ summary: [], timestamp: [], dedupKey: [] }}
        editAction={() => {}}
        index={0}
      />
    );
    expect(wrapper.find('[data-test-subj="severitySelect"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="severitySelect"]').first().prop('value')).toStrictEqual(
      undefined
    );
  });

  test('only eventActionSelect is available as a payload params for PagerDuty Resolve event', () => {
    const actionParams = {
      eventAction: EventActionOptions.RESOLVE,
      dedupKey: 'test',
    };

    const wrapper = mountWithIntl(
      <PagerDutyParamsFields
        actionParams={actionParams}
        errors={{ summary: [], timestamp: [], dedupKey: [] }}
        editAction={() => {}}
        index={0}
      />
    );
    expect(wrapper.find('[data-test-subj="dedupKeyInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="dedupKeyInput"]').first().prop('value')).toStrictEqual(
      'test'
    );
    expect(wrapper.find('[data-test-subj="eventActionSelect"]').length > 0).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="eventActionSelect"]').first().prop('value')
    ).toStrictEqual('resolve');
    expect(wrapper.find('[data-test-subj="dedupKeyInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="timestampInput"]').length > 0).toBeFalsy();
    expect(wrapper.find('[data-test-subj="componentInput"]').length > 0).toBeFalsy();
    expect(wrapper.find('[data-test-subj="groupInput"]').length > 0).toBeFalsy();
    expect(wrapper.find('[data-test-subj="sourceInput"]').length > 0).toBeFalsy();
    expect(wrapper.find('[data-test-subj="summaryInput"]').length > 0).toBeFalsy();
  });

  describe('selected action group "recovered"', () => {
    const renderWithRecoveredGroup = (
      params: Partial<PagerDutyActionParams> = {
        eventAction: EventActionOptions.RESOLVE,
        dedupKey: 'test-dedup',
      }
    ) =>
      renderWithI18n(
        <PagerDutyParamsFields
          actionParams={params}
          errors={{ summary: [], timestamp: [], dedupKey: [] }}
          editAction={() => {}}
          index={0}
          selectedActionGroupId="recovered"
        />
      );

    test('event action dropdown is disabled and only shows Resolve', () => {
      renderWithRecoveredGroup();

      const select = screen.getByTestId('eventActionSelect');
      expect(select).toBeDisabled();
      expect(select).toHaveValue('resolve');

      const options = within(select).getAllByRole('option');
      expect(options).toHaveLength(1);
      expect(options[0]).toHaveValue('resolve');
    });

    test('dedupKey field is still rendered', () => {
      renderWithRecoveredGroup();

      const dedupKeyInput = screen.getByTestId('dedupKeyInput');
      expect(dedupKeyInput).toBeInTheDocument();
      expect(dedupKeyInput).toHaveValue('test-dedup');
    });

    test('trigger-only fields are not rendered', () => {
      renderWithRecoveredGroup();

      expect(screen.queryByTestId('summaryInput')).not.toBeInTheDocument();
      expect(screen.queryByTestId('severitySelect')).not.toBeInTheDocument();
      expect(screen.queryByTestId('timestampInput')).not.toBeInTheDocument();
      expect(screen.queryByTestId('componentInput')).not.toBeInTheDocument();
      expect(screen.queryByTestId('groupInput')).not.toBeInTheDocument();
      expect(screen.queryByTestId('sourceInput')).not.toBeInTheDocument();
      expect(screen.queryByTestId('customDetailsJsonEditor')).not.toBeInTheDocument();
      expect(screen.queryByTestId('linksList')).not.toBeInTheDocument();
    });
  });

  test('event action dropdown shows all options when selectedActionGroupId is not "recovered"', () => {
    renderWithI18n(
      <PagerDutyParamsFields
        actionParams={{ eventAction: EventActionOptions.TRIGGER, dedupKey: 'test' }}
        errors={{ summary: [], timestamp: [], dedupKey: [] }}
        editAction={() => {}}
        index={0}
        selectedActionGroupId="default"
      />
    );

    const select = screen.getByTestId('eventActionSelect');
    expect(select).not.toBeDisabled();

    const options = within(select).getAllByRole('option');
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveValue('trigger');
    expect(options[1]).toHaveValue('resolve');
    expect(options[2]).toHaveValue('acknowledge');
  });
});
