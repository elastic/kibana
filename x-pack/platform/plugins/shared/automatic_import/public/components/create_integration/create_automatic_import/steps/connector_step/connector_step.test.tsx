/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, act, type RenderResult } from '@testing-library/react';
import type { ActionTypeModel } from '@kbn/triggers-actions-ui-plugin/public';
import { TestProvider } from '../../../../../mocks/test_provider';
import { ConnectorStep } from './connector_step';
import { ActionsProvider } from '../../state';
import { mockActions, mockState } from '../../mocks/state';
import { useAuthorization } from '../../../../../common/hooks/use_authorization';
import { mockServices } from '../../../../../services/mocks/services';
import type { AIConnector } from '../../types';

jest.mock('../../../../../common/hooks/use_authorization');
const mockUseAuthorization = useAuthorization as jest.Mock;

const connector = mockState.connector!;
const defaultUseMockConnectors: { data: AIConnector[]; isLoading: boolean; refetch: Function } = {
  data: [],
  isLoading: false,
  refetch: jest.fn(),
};
const mockUseLoadConnectors = jest.fn(() => defaultUseMockConnectors);
jest.mock('@kbn/elastic-assistant', () => ({
  useLoadConnectors: () => mockUseLoadConnectors(),
}));

const actionType = { id: '.bedrock', name: 'Bedrock', iconClass: 'logoBedrock' };
mockServices.triggersActionsUi.actionTypeRegistry.register(
  actionType as unknown as ActionTypeModel
);

const inferenceActionType = { id: '.inference', name: 'Inference', iconClass: 'logoInference' };
mockServices.triggersActionsUi.actionTypeRegistry.register(
  inferenceActionType as unknown as ActionTypeModel
);

jest.mock('@kbn/elastic-assistant/impl/connectorland/use_load_action_types', () => ({
  useLoadActionTypes: jest.fn(() => ({ data: [actionType] })),
}));
jest.mock('@kbn/triggers-actions-ui-plugin/public/common/constants', () => ({
  ConnectorAddModal: () => <div data-test-subj="connectorAddModal" />,
}));

const wrapper: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
  <TestProvider>
    <ActionsProvider value={mockActions}>{children}</ActionsProvider>
  </TestProvider>
);

describe('ConnectorStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when no connector selected', () => {
    describe('when no connector exists', () => {
      let result: RenderResult;
      beforeEach(() => {
        mockUseLoadConnectors.mockReturnValue({ ...defaultUseMockConnectors, data: [] });
        result = render(<ConnectorStep connector={undefined} />, { wrapper });
      });

      it('should render connector setup page', () => {
        expect(result.queryByTestId('connectorSetupPage')).toBeInTheDocument();
        expect(result.queryByTestId('connectorSetupCompressed')).not.toBeInTheDocument();
      });

      it('should not render connector selector page', () => {
        expect(result.queryByTestId('connectorSelector')).not.toBeInTheDocument();
      });

      it('should not render connector setup popover', () => {
        expect(result.queryByTestId('createConnectorPopover')).not.toBeInTheDocument();
      });

      describe('when connector type selected clicked', () => {
        beforeEach(() => {
          act(() => {
            result.getByTestId(`actionType-${actionType.id}`).click();
          });
        });
        it('should render connector creation modal', () => {
          expect(result.queryByTestId('connectorAddModal')).toBeInTheDocument();
        });
      });
    });

    describe('when connectors exist', () => {
      let result: RenderResult;
      beforeEach(() => {
        mockUseLoadConnectors.mockReturnValue({ ...defaultUseMockConnectors, data: [connector] });
        result = render(<ConnectorStep connector={undefined} />, { wrapper });
      });

      it('should render connector selector page', () => {
        expect(result.queryByTestId('connectorSelector')).toBeInTheDocument();
      });

      it('should not render connector setup page', () => {
        expect(result.queryByTestId('connectorSetup')).not.toBeInTheDocument();
      });

      it('should render connector setup popover', () => {
        expect(result.queryByTestId('createConnectorPopover')).toBeInTheDocument();
      });

      describe('when connector clicked', () => {
        beforeEach(() => {
          act(() => {
            result.getByTestId(`connectorSelector-${connector.id}`).click();
          });
        });
        it('should dispatch setConnector', () => {
          expect(mockActions.setConnector).toHaveBeenCalledWith(connector);
        });
      });

      describe('when add connector popover is clicked', () => {
        beforeEach(() => {
          act(() => {
            result.getByTestId('createConnectorPopoverButton').click();
          });
        });

        it('should render connector setup compressed', () => {
          expect(result.queryByTestId('connectorSetupCompressed')).toBeInTheDocument();
          expect(result.queryByTestId('connectorSetupPage')).not.toBeInTheDocument();
        });
      });
    });
  });

  describe('when connector selected', () => {
    let result: RenderResult;
    beforeEach(() => {
      mockUseLoadConnectors.mockReturnValue({ ...defaultUseMockConnectors, data: [connector] });
      result = render(<ConnectorStep connector={connector} />, { wrapper });
    });

    it('should render connector selector page', () => {
      expect(result.queryByTestId('connectorSelector')).toBeInTheDocument();
    });

    it('should render connector selected', () => {
      expect(
        result.queryByTestId(`connectorSelectorRadio-${connector.id}-selected`)
      ).toBeInTheDocument();
    });
  });

  describe('when create connector privileges missing', () => {
    let result: RenderResult;
    beforeEach(() => {
      mockUseAuthorization.mockReturnValue({ canCreateConnectors: false });
    });

    describe('when no connector exists', () => {
      beforeEach(() => {
        mockUseLoadConnectors.mockReturnValue({ ...defaultUseMockConnectors, data: [] });
        result = render(<ConnectorStep connector={undefined} />, { wrapper });
      });

      it('should not render connector setup page', () => {
        expect(result.queryByTestId('connectorSetup')).not.toBeInTheDocument();
      });

      it('should render the missing privilege callout', () => {
        expect(result.queryByTestId('missingPrivilegesCallOut')).toBeInTheDocument();
      });
    });

    describe('when connectors exist', () => {
      beforeEach(() => {
        mockUseLoadConnectors.mockReturnValue({ ...defaultUseMockConnectors, data: [connector] });
        result = render(<ConnectorStep connector={undefined} />, { wrapper });
      });

      it('should render connector selector page', () => {
        expect(result.queryByTestId('connectorSelector')).toBeInTheDocument();
      });

      it('should render the disabled create connector link', () => {
        expect(result.queryByTestId('createConnectorPopoverButtonDisabled')).toBeInTheDocument();
      });
    });
  });
});
