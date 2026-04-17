/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import { AlertCommentEvent } from './alert_event';

const props = {
  actionId: 'action-id-1',
  getRuleDetailsHref: jest.fn().mockReturnValue('https://example.com'),
  onRuleDetailsClick: jest.fn(),
  ruleId: 'rule-id-1',
  ruleName: 'Awesome rule',
};

describe('Alert events', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('single alert', () => {
    it('it renders', () => {
      render(<AlertCommentEvent {...props} totalAlerts={1} />);

      expect(screen.getByTestId('alert-rule-link-action-id-1')).toBeInTheDocument();
      expect(screen.getByTestId('alerts-user-action-action-id-1')).toHaveTextContent(
        'added an alert from Awesome rule'
      );
    });

    it('renders the link when onClick is provided but href is not valid', () => {
      render(<AlertCommentEvent {...props} totalAlerts={1} getRuleDetailsHref={undefined} />);

      expect(screen.getByTestId('alert-rule-link-action-id-1')).toBeInTheDocument();
    });

    it('renders the link when href is valid but onClick is not available', () => {
      render(<AlertCommentEvent {...props} totalAlerts={1} onRuleDetailsClick={undefined} />);

      expect(screen.getByTestId('alert-rule-link-action-id-1')).toBeInTheDocument();
    });

    it('does NOT render the link when the href and onclick are invalid but it shows the rule name', () => {
      render(
        <AlertCommentEvent
          totalAlerts={1}
          {...props}
          getRuleDetailsHref={undefined}
          onRuleDetailsClick={undefined}
        />
      );

      expect(screen.queryByTestId('alert-rule-link-action-id-1')).not.toBeInTheDocument();
      expect(screen.getByTestId('alerts-user-action-action-id-1')).toHaveTextContent(
        'added an alert from Awesome rule'
      );
    });

    it('does NOT render the link when the rule id is null', () => {
      render(<AlertCommentEvent {...props} totalAlerts={1} ruleId={null} />);

      expect(screen.queryByTestId('alert-rule-link-action-id-1')).not.toBeInTheDocument();
      expect(screen.getByTestId('alerts-user-action-action-id-1')).toHaveTextContent(
        'added an alert from Awesome rule'
      );
    });

    it('shows Unknown rule if the rule name is invalid', () => {
      render(<AlertCommentEvent {...props} totalAlerts={1} ruleName={null} />);

      expect(screen.getByTestId('alert-rule-link-action-id-1')).toHaveTextContent('Unknown rule');
      expect(screen.getByTestId('alerts-user-action-action-id-1')).toHaveTextContent(
        'added an alert from Unknown rule'
      );
    });

    it('calls onRuleDetailsClick on link click', () => {
      const onRuleDetailsClick = jest.fn();
      render(
        <AlertCommentEvent {...props} totalAlerts={1} onRuleDetailsClick={onRuleDetailsClick} />
      );

      fireEvent.click(screen.getByTestId('alert-rule-link-action-id-1'));
      expect(onRuleDetailsClick).toHaveBeenCalledWith('rule-id-1', expect.any(Object));
    });

    it('shows the loading spinner if the alerts data are loading', () => {
      render(<AlertCommentEvent {...props} totalAlerts={1} loadingAlertData />);

      expect(screen.getByTestId('user-action-link-loading')).toBeInTheDocument();
    });
  });

  describe('multiple alerts', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('renders correctly', () => {
      render(<AlertCommentEvent {...props} totalAlerts={2} />);

      expect(screen.getByTestId('alerts-user-action-action-id-1')).toHaveTextContent(
        'added 2 alerts from Awesome rule'
      );
      expect(screen.getByTestId('alert-rule-link-action-id-1')).toHaveTextContent('Awesome rule');
    });

    it('renders the link when onClick is provided but href is not valid', () => {
      render(<AlertCommentEvent {...props} totalAlerts={2} getRuleDetailsHref={undefined} />);
      expect(screen.getByTestId('alert-rule-link-action-id-1')).toHaveTextContent('Awesome rule');
    });

    it('renders the link when href is valid but onClick is not available', () => {
      render(<AlertCommentEvent {...props} totalAlerts={2} onRuleDetailsClick={undefined} />);
      expect(screen.getByTestId('alert-rule-link-action-id-1')).toHaveTextContent('Awesome rule');
    });

    it('does NOT render the link when the href and onclick are invalid but it shows the rule name', () => {
      render(
        <AlertCommentEvent
          {...props}
          totalAlerts={2}
          getRuleDetailsHref={undefined}
          onRuleDetailsClick={undefined}
        />
      );

      expect(screen.getByTestId('alerts-user-action-action-id-1')).toHaveTextContent(
        'added 2 alerts from Awesome rule'
      );
      expect(screen.queryByTestId('alert-rule-link-action-id-1')).not.toBeInTheDocument();
    });

    it('does NOT render the link when the rule id is null', () => {
      render(<AlertCommentEvent {...props} totalAlerts={2} ruleId={null} />);

      expect(screen.getByTestId('alerts-user-action-action-id-1')).toHaveTextContent(
        'added 2 alerts from Awesome rule'
      );
      expect(screen.queryByTestId('alert-rule-link-action-id-1')).not.toBeInTheDocument();
    });

    it('shows Unknown rule if the rule name is invalid', () => {
      render(<AlertCommentEvent {...props} totalAlerts={2} ruleName={null} />);

      expect(screen.getByTestId('alerts-user-action-action-id-1')).toHaveTextContent(
        'added 2 alerts from Unknown rule'
      );
      expect(screen.getByTestId('alert-rule-link-action-id-1')).toHaveTextContent('Unknown rule');
    });

    it('shows the loading spinner if the alerts data are loading', () => {
      render(<AlertCommentEvent {...props} totalAlerts={2} loadingAlertData />);

      expect(screen.getByTestId('user-action-link-loading')).toBeInTheDocument();
    });
  });
});
