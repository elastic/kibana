/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { RuleFormServices } from '@kbn/alerting-v2-rule-form';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { applicationServiceMock } from '@kbn/core/public/mocks';
import { lensPluginMock } from '@kbn/lens-plugin/public/mocks';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import { AGENT_BUILDER_APP_ID } from '@kbn/deeplinks-agent-builder';
import {
  AGENT_BUILDER_NEW_CONVERSATION_PATH,
  CREATE_WITH_AGENT_INITIAL_PROMPT,
} from './constants';

const createMockServices = (): RuleFormServices => ({
  http: httpServiceMock.createStartContract(),
  data: dataPluginMock.createStartContract(),
  dataViews: dataViewPluginMocks.createStartContract(),
  notifications: notificationServiceMock.createStartContract(),
  application: applicationServiceMock.createStartContract(),
  lens: lensPluginMock.createStartContract(),
  workflowForm: { Component: () => null, defaultValue: () => ({}) },
  uiActions: uiActionsPluginMock.createStartContract(),
});

let capturedSelectorProps: Record<string, unknown> = {};
jest.mock('./components/rule_create_options/rule_create_options_flyout', () => ({
  RuleCreateOptionsFlyout: (props: Record<string, unknown>) => {
    capturedSelectorProps = props;
    return (
      <div data-test-subj="mockRuleCreateOptionsFlyout">
        <button data-test-subj="esqlBtn" onClick={props.onCreateEsqlRule as () => void} />
        <button data-test-subj="agentBtn" onClick={props.onCreateWithAgent as () => void} />
        <button
          data-test-subj="thresholdBtn"
          onClick={props.onCreateThresholdAlert as () => void}
        />
      </div>
    );
  },
}));

let capturedEsqlProps: Record<string, unknown> = {};
let capturedComposeProps: Record<string, unknown> = {};
jest.mock('@kbn/alerting-v2-rule-form', () => ({
  DynamicRuleFormFlyout: (props: Record<string, unknown>) => {
    capturedEsqlProps = props;
    return <div data-test-subj="mockDynamicRuleFormFlyout" />;
  },
  ComposeDiscoverFlyout: (props: Record<string, unknown>) => {
    capturedComposeProps = props;
    return <div data-test-subj="mockComposeDiscoverFlyout" />;
  },
}));

let resolveServices: (services: RuleFormServices) => void;
jest.mock('./kibana_services', () => ({
  untilPluginStartServicesReady: () =>
    new Promise<RuleFormServices>((resolve) => {
      resolveServices = resolve;
    }),
}));

jest.mock('./services/rules_api', () => ({
  RulesApi: jest.fn().mockImplementation(() => ({
    createRule: jest.fn(),
  })),
}));

import { CreateAlertFlyout } from './create_alert_flyout';
import { RulesApi } from './services/rules_api';

const renderFlyout = (props: Partial<React.ComponentProps<typeof CreateAlertFlyout>> = {}) =>
  render(
    <I18nProvider>
      <CreateAlertFlyout onClose={props.onClose ?? jest.fn()} {...props} />
    </I18nProvider>
  );

describe('CreateAlertFlyout', () => {
  let mockServices: RuleFormServices;

  beforeEach(() => {
    jest.clearAllMocks();
    capturedSelectorProps = {};
    capturedEsqlProps = {};
    capturedComposeProps = {};
    mockServices = createMockServices();
  });

  describe('loading state', () => {
    it('shows a loading spinner inside a flyout while modules load', () => {
      renderFlyout();

      expect(screen.getByTestId('createAlertFlyoutLoading')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.queryByTestId('mockRuleCreateOptionsFlyout')).not.toBeInTheDocument();
    });

    it('renders the selector flyout once services resolve', async () => {
      renderFlyout();
      resolveServices(mockServices);

      await waitFor(() => {
        expect(screen.getByTestId('mockRuleCreateOptionsFlyout')).toBeInTheDocument();
      });
    });
  });

  describe('selector → esql transition', () => {
    it('renders DynamicRuleFormFlyout when the ES|QL option is clicked', async () => {
      const onClose = jest.fn();
      renderFlyout({ onClose, initialQuery: 'FROM logs-*' });
      resolveServices(mockServices);

      await waitFor(() => {
        expect(screen.getByTestId('mockRuleCreateOptionsFlyout')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('esqlBtn'));

      await waitFor(() => {
        expect(screen.getByTestId('mockDynamicRuleFormFlyout')).toBeInTheDocument();
      });
      expect(capturedEsqlProps.query).toBe('FROM logs-*');
      expect(capturedEsqlProps.onClose).toBe(onClose);
    });

    it('passes empty string as query when initialQuery is undefined', async () => {
      renderFlyout();
      resolveServices(mockServices);

      await waitFor(() => {
        expect(screen.getByTestId('mockRuleCreateOptionsFlyout')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('esqlBtn'));

      await waitFor(() => {
        expect(screen.getByTestId('mockDynamicRuleFormFlyout')).toBeInTheDocument();
      });
      expect(capturedEsqlProps.query).toBe('');
    });
  });

  describe('selector → threshold transition', () => {
    it('renders ComposeDiscoverFlyout when the threshold option is clicked', async () => {
      const onClose = jest.fn();
      renderFlyout({ onClose });
      resolveServices(mockServices);

      await waitFor(() => {
        expect(screen.getByTestId('mockRuleCreateOptionsFlyout')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('thresholdBtn'));

      await waitFor(() => {
        expect(screen.getByTestId('mockComposeDiscoverFlyout')).toBeInTheDocument();
      });
      expect(capturedComposeProps.mode).toBe('create');
      expect(capturedComposeProps.builderType).toBe('threshold');
      expect(capturedComposeProps.onClose).toBe(onClose);
    });
  });

  describe('selector → agent builder navigation', () => {
    it('navigates to agent builder and closes when the AI option is clicked', async () => {
      const onClose = jest.fn();
      renderFlyout({ onClose });
      resolveServices(mockServices);

      await waitFor(() => {
        expect(screen.getByTestId('mockRuleCreateOptionsFlyout')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('agentBtn'));

      expect(mockServices.application.navigateToApp).toHaveBeenCalledWith(
        AGENT_BUILDER_APP_ID,
        {
          path: AGENT_BUILDER_NEW_CONVERSATION_PATH,
          state: { initialMessage: CREATE_WITH_AGENT_INITIAL_PROMPT },
        }
      );
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('selector → legacy transition', () => {
    it('renders the legacy rule type when its option is clicked', async () => {
      const legacyRender = jest.fn((_onClose: () => void) => (
        <div data-test-subj="mockLegacyFlyout" />
      ));

      renderFlyout({
        legacyRuleTypes: [
          { id: 'search-threshold', label: 'Search threshold rule', render: legacyRender },
        ],
      });
      resolveServices(mockServices);

      await waitFor(() => {
        expect(screen.getByTestId('mockRuleCreateOptionsFlyout')).toBeInTheDocument();
      });

      const legacyItems = capturedSelectorProps.legacyRuleTypes as Array<{
        onClick: () => void;
      }>;
      expect(legacyItems).toHaveLength(1);

      act(() => {
        legacyItems[0].onClick();
      });

      await waitFor(() => {
        expect(screen.getByTestId('mockLegacyFlyout')).toBeInTheDocument();
      });
      expect(legacyRender).toHaveBeenCalled();
    });
  });

  describe('handleCreateRule', () => {
    it('shows a success toast and closes on successful rule creation', async () => {
      const onClose = jest.fn();
      const mockCreateRule = jest.fn().mockResolvedValue({
        metadata: { name: 'My test rule' },
      });
      (RulesApi as jest.Mock).mockImplementation(() => ({
        createRule: mockCreateRule,
      }));

      renderFlyout({ onClose });
      resolveServices(mockServices);

      await waitFor(() => {
        expect(screen.getByTestId('mockRuleCreateOptionsFlyout')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('thresholdBtn'));

      await waitFor(() => {
        expect(screen.getByTestId('mockComposeDiscoverFlyout')).toBeInTheDocument();
      });

      const onCreateRule = capturedComposeProps.onCreateRule as (payload: unknown) => Promise<void>;
      await act(async () => {
        await onCreateRule({ name: 'My test rule' });
      });

      expect(mockCreateRule).toHaveBeenCalledWith({ name: 'My test rule' });
      expect(mockServices.notifications.toasts.addSuccess).toHaveBeenCalledWith(
        expect.stringContaining('My test rule')
      );
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('shows an error toast on failed rule creation', async () => {
      const onClose = jest.fn();
      const mockCreateRule = jest.fn().mockRejectedValue(new Error('network error'));
      (RulesApi as jest.Mock).mockImplementation(() => ({
        createRule: mockCreateRule,
      }));

      renderFlyout({ onClose });
      resolveServices(mockServices);

      await waitFor(() => {
        expect(screen.getByTestId('mockRuleCreateOptionsFlyout')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('thresholdBtn'));

      await waitFor(() => {
        expect(screen.getByTestId('mockComposeDiscoverFlyout')).toBeInTheDocument();
      });

      const onCreateRule = capturedComposeProps.onCreateRule as (payload: unknown) => Promise<void>;
      await act(async () => {
        await onCreateRule({ name: 'Bad rule' });
      });

      expect(mockServices.notifications.toasts.addDanger).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create rule')
      );
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
