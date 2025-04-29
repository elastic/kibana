/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { screen } from '@testing-library/react';

import { TestProviders, renderWithTestingProviders } from '../../../common/mock';
import { useKibana } from '../../../common/lib/kibana';
import { MultipleAlertsCommentEvent, SingleAlertCommentEvent } from './alert_event';

const props = {
  actionId: 'action-id-1',
  getRuleDetailsHref: jest.fn().mockReturnValue('https://example.com'),
  onRuleDetailsClick: jest.fn(),
  ruleId: 'rule-id-1',
  ruleName: 'Awesome rule',
};

jest.mock('../../../common/lib/kibana');
const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

describe('Alert events', () => {
  let navigateToApp: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    navigateToApp = jest.fn();
    useKibanaMock().services.application.navigateToApp = navigateToApp;
  });

  describe('SingleAlertCommentEvent', () => {
    it('it renders', async () => {
      const wrapper = mount(
        <TestProviders>
          <SingleAlertCommentEvent {...props} />
        </TestProviders>
      );

      expect(
        wrapper.find(`[data-test-subj="alert-rule-link-action-id-1"]`).first().exists()
      ).toBeTruthy();
      expect(wrapper.text()).toBe('added an alert from Awesome rule');
    });

    it('renders the link when onClick is provided but href is not valid', async () => {
      const wrapper = mount(
        <TestProviders>
          <SingleAlertCommentEvent {...props} getRuleDetailsHref={undefined} />
        </TestProviders>
      );

      expect(
        wrapper.find(`[data-test-subj="alert-rule-link-action-id-1"]`).first().exists()
      ).toBeTruthy();
    });

    it('renders the link when href is valid but onClick is not available', async () => {
      const wrapper = mount(
        <TestProviders>
          <SingleAlertCommentEvent {...props} onRuleDetailsClick={undefined} />
        </TestProviders>
      );

      expect(
        wrapper.find(`[data-test-subj="alert-rule-link-action-id-1"]`).first().exists()
      ).toBeTruthy();
    });

    it('does NOT render the link when the href and onclick are invalid but it shows the rule name', async () => {
      const wrapper = mount(
        <TestProviders>
          <SingleAlertCommentEvent
            {...props}
            getRuleDetailsHref={undefined}
            onRuleDetailsClick={undefined}
          />
        </TestProviders>
      );

      expect(
        wrapper.find(`[data-test-subj="alert-rule-link-action-id-1"]`).first().exists()
      ).toBeFalsy();

      expect(wrapper.text()).toBe('added an alert from Awesome rule');
    });

    it('does NOT render the link when the rule id is null', async () => {
      const wrapper = mount(
        <TestProviders>
          <SingleAlertCommentEvent {...props} ruleId={null} />
        </TestProviders>
      );

      expect(
        wrapper.find(`[data-test-subj="alert-rule-link-action-id-1"]`).first().exists()
      ).toBeFalsy();

      expect(wrapper.text()).toBe('added an alert from Awesome rule');
    });

    it('show Unknown rule if the rule name is invalid', async () => {
      const wrapper = mount(
        <TestProviders>
          <SingleAlertCommentEvent {...props} ruleName={null} />
        </TestProviders>
      );

      expect(
        wrapper.find(`[data-test-subj="alert-rule-link-action-id-1"]`).first().exists()
      ).toBeTruthy();
      expect(wrapper.text()).toBe('added an alert from Unknown rule');
    });

    it('navigate to app on link click', async () => {
      const onRuleDetailsClick = jest.fn();

      const wrapper = mount(
        <TestProviders>
          <SingleAlertCommentEvent {...props} onRuleDetailsClick={onRuleDetailsClick} />
        </TestProviders>
      );

      wrapper.find(`[data-test-subj="alert-rule-link-action-id-1"]`).last().simulate('click');
      expect(onRuleDetailsClick).toHaveBeenCalled();
    });

    it('shows the loading spinner if the alerts data are loading', async () => {
      const wrapper = mount(
        <TestProviders>
          <SingleAlertCommentEvent {...props} loadingAlertData={true} />
        </TestProviders>
      );

      expect(
        wrapper.find(`[data-test-subj="alert-loading-spinner-action-id-1"]`).first().exists()
      ).toBeTruthy();
    });
  });

  describe('MultipleAlertsCommentEvent', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('renders correctly', async () => {
      renderWithTestingProviders(<MultipleAlertsCommentEvent {...props} totalAlerts={2} />);

      expect(screen.getByTestId('multiple-alerts-user-action-action-id-1')).toHaveTextContent(
        'added 2 alerts from Awesome rule'
      );
      expect(screen.getByTestId('alert-rule-link-action-id-1')).toHaveTextContent('Awesome rule');
    });

    it('renders the link when onClick is provided but href is not valid', async () => {
      renderWithTestingProviders(
        <MultipleAlertsCommentEvent {...props} totalAlerts={2} getRuleDetailsHref={undefined} />
      );
      expect(screen.getByTestId('alert-rule-link-action-id-1')).toHaveTextContent('Awesome rule');
    });

    it('renders the link when href is valid but onClick is not available', async () => {
      renderWithTestingProviders(
        <MultipleAlertsCommentEvent {...props} totalAlerts={2} onRuleDetailsClick={undefined} />
      );
      expect(screen.getByTestId('alert-rule-link-action-id-1')).toHaveTextContent('Awesome rule');
    });

    it('does NOT render the link when the href and onclick are invalid but it shows the rule name', async () => {
      renderWithTestingProviders(
        <MultipleAlertsCommentEvent
          {...props}
          totalAlerts={2}
          getRuleDetailsHref={undefined}
          onRuleDetailsClick={undefined}
        />
      );

      expect(screen.getByTestId('multiple-alerts-user-action-action-id-1')).toHaveTextContent(
        'added 2 alerts from Awesome rule'
      );
      expect(screen.queryByTestId('alert-rule-link-action-id-1')).toBeFalsy();
    });

    it('does NOT render the link when the rule id is null', async () => {
      renderWithTestingProviders(
        <MultipleAlertsCommentEvent {...props} totalAlerts={2} ruleId={null} />
      );

      expect(screen.getByTestId('multiple-alerts-user-action-action-id-1')).toHaveTextContent(
        'added 2 alerts from Awesome rule'
      );
      expect(screen.queryByTestId('alert-rule-link-action-id-1')).toBeFalsy();
    });

    it('show Unknown rule if the rule name is invalid', async () => {
      renderWithTestingProviders(
        <MultipleAlertsCommentEvent {...props} totalAlerts={2} ruleName={null} />
      );

      expect(screen.getByTestId('multiple-alerts-user-action-action-id-1')).toHaveTextContent(
        'added 2 alerts from Unknown rule'
      );

      expect(screen.getByTestId('alert-rule-link-action-id-1')).toHaveTextContent('Unknown rule');
    });

    it('shows the loading spinner if the alerts data are loading', async () => {
      renderWithTestingProviders(
        <MultipleAlertsCommentEvent {...props} totalAlerts={2} loadingAlertData={true} />
      );

      expect(screen.getByTestId('alert-loading-spinner-action-id-1')).toBeTruthy();
    });
  });
});
