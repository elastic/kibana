/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import { AddToCaseButton } from './add_to_cases_button';
import { TestProvidersWithServices } from '../__test_helpers__/create_mock_kibana_services';

const mockOpen = jest.fn();
const mockCanUseCases = jest.fn();

const mockUseKibana = jest.fn();

jest.mock('../common/lib/kibana', () => ({
  ...jest.requireActual('../common/lib/kibana'),
  useKibana: () => mockUseKibana(),
}));

const setupKibana = (
  permissions: { read: boolean; update: boolean; push: boolean } = {
    read: true,
    update: true,
    push: true,
  }
) => {
  mockCanUseCases.mockReturnValue(permissions);

  mockUseKibana.mockReturnValue({
    services: {
      appName: 'osquery',
      cases: {
        helpers: {
          canUseCases: mockCanUseCases,
          getRuleIdFromEvent: jest.fn(),
        },
        hooks: {
          useCasesAddToExistingCaseModal: jest.fn().mockReturnValue({ open: mockOpen }),
        },
      },
      application: {
        capabilities: {
          osquery: {
            writeLiveQueries: true,
            runSavedQueries: true,
            readPacks: true,
            writePacks: true,
            readSavedQueries: true,
            writeSavedQueries: true,
          },
        },
      },
    },
  });
};

describe('AddToCaseButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupKibana();
  });

  describe('permissions', () => {
    it('should render enabled button when user has full case permissions', () => {
      render(
        <TestProvidersWithServices>
          <AddToCaseButton actionId="test-action-id" />
        </TestProvidersWithServices>
      );

      const button = screen.getByText('Add to Case');
      expect(button).toBeInTheDocument();
      expect(button.closest('button')).not.toBeDisabled();
    });

    it('should render disabled button when user lacks read permission', () => {
      setupKibana({ read: false, update: true, push: true });

      render(
        <TestProvidersWithServices>
          <AddToCaseButton actionId="test-action-id" />
        </TestProvidersWithServices>
      );

      expect(screen.getByText('Add to Case').closest('button')).toBeDisabled();
    });

    it('should render disabled button when user lacks update permission', () => {
      setupKibana({ read: true, update: false, push: true });

      render(
        <TestProvidersWithServices>
          <AddToCaseButton actionId="test-action-id" />
        </TestProvidersWithServices>
      );

      expect(screen.getByText('Add to Case').closest('button')).toBeDisabled();
    });

    it('should render disabled button when user lacks push permission', () => {
      setupKibana({ read: true, update: true, push: false });

      render(
        <TestProvidersWithServices>
          <AddToCaseButton actionId="test-action-id" />
        </TestProvidersWithServices>
      );

      expect(screen.getByText('Add to Case').closest('button')).toBeDisabled();
    });
  });

  describe('interactions', () => {
    it('should open case modal on click when permissions are granted', () => {
      render(
        <TestProvidersWithServices>
          <AddToCaseButton actionId="test-action-id" queryId="test-query" agentIds={['agent-1']} />
        </TestProvidersWithServices>
      );

      fireEvent.click(screen.getByText('Add to Case'));

      expect(mockOpen).toHaveBeenCalledWith({
        getAttachments: expect.any(Function),
      });
    });

    it('should not open case modal on click when permissions are denied', () => {
      setupKibana({ read: false, update: false, push: false });

      render(
        <TestProvidersWithServices>
          <AddToCaseButton actionId="test-action-id" />
        </TestProvidersWithServices>
      );

      fireEvent.click(screen.getByText('Add to Case'));

      expect(mockOpen).not.toHaveBeenCalled();
    });
  });

  describe('render variants', () => {
    it('should render as icon button when isIcon is true', () => {
      render(
        <TestProvidersWithServices>
          <AddToCaseButton actionId="test-action-id" isIcon />
        </TestProvidersWithServices>
      );

      expect(screen.getByLabelText('Add to Case')).toBeInTheDocument();
    });

    it('should render as context menu item when displayAsMenuItem is true', () => {
      render(
        <TestProvidersWithServices>
          <AddToCaseButton actionId="test-action-id" displayAsMenuItem />
        </TestProvidersWithServices>
      );

      expect(screen.getByText('Add to Case')).toBeInTheDocument();
    });

    it('should disable context menu item when no permissions', () => {
      setupKibana({ read: false, update: false, push: false });

      render(
        <TestProvidersWithServices>
          <AddToCaseButton actionId="test-action-id" displayAsMenuItem />
        </TestProvidersWithServices>
      );

      expect(screen.getByText('Add to Case').closest('button')).toBeDisabled();
    });
  });
});
