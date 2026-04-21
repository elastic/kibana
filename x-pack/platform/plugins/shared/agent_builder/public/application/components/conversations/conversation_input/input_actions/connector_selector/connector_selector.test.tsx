/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { AIConnector } from '@kbn/elastic-assistant';

jest.mock('@kbn/inference-connectors', () => ({
  useLoadConnectors: jest.fn(),
}));

jest.mock('../../../../../hooks/use_kibana', () => ({
  useKibana: jest.fn(),
}));

jest.mock('../../../../../context/send_message/send_message_context', () => ({
  useSendMessage: jest.fn(),
}));

jest.mock('../../../../../hooks/chat/use_default_connector', () => ({
  useDefaultConnector: jest.fn(),
}));

jest.mock('../../../../../hooks/use_navigation', () => ({
  useNavigation: () => ({ manageConnectorsUrl: '/manage' }),
}));

jest.mock('../../../../../hooks/use_ui_privileges', () => ({
  useUiPrivileges: () => ({ write: true }),
}));

jest.mock('../../../../../../../common/recommended_connectors', () => ({
  isRecommendedConnector: () => false,
}));

jest.mock('../input_actions.styles', () => ({
  getMaxListHeight: () => 200,
  selectorPopoverPanelStyles: undefined,
  useSelectorListStyles: () => undefined,
}));

jest.mock('../input_popover_button', () => ({
  InputPopoverButton: ({
    disabled,
    children,
    onClick,
  }: {
    disabled?: boolean;
    children: React.ReactNode;
    onClick: () => void;
  }) => (
    <button
      type="button"
      data-test-subj="agentBuilderConnectorSelectorButton"
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  ),
}));

jest.mock('../option_text', () => ({
  OptionText: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock('./connector_icon', () => ({
  ConnectorIcon: () => null,
}));

import { useLoadConnectors } from '@kbn/inference-connectors';
import { useKibana } from '../../../../../hooks/use_kibana';
import { useSendMessage } from '../../../../../context/send_message/send_message_context';
import { useDefaultConnector } from '../../../../../hooks/chat/use_default_connector';
import { ConnectorSelector } from './connector_selector';

const mockUseLoadConnectors = useLoadConnectors as jest.MockedFunction<typeof useLoadConnectors>;
const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseSendMessage = useSendMessage as jest.MockedFunction<typeof useSendMessage>;
const mockUseDefaultConnector = useDefaultConnector as jest.MockedFunction<
  typeof useDefaultConnector
>;

const mkConnector = (id: string, isPreconfigured = true): AIConnector =>
  ({
    id,
    name: id,
    isPreconfigured,
    isMissingSecrets: false,
    actionTypeId: '.gen-ai',
    secrets: {},
    isDeprecated: false,
    isSystemAction: false,
    config: {},
    isConnectorTypeDeprecated: false,
  } as AIConnector);

interface RenderOptions {
  connectors?: AIConnector[];
  isLoading?: boolean;
  selectedConnector?: string;
  defaultConnectorId?: string;
  defaultConnectorOnly?: boolean;
  initialConnectorId?: string;
}

const setup = ({
  connectors = [],
  isLoading = false,
  selectedConnector,
  defaultConnectorId,
  defaultConnectorOnly = false,
  initialConnectorId,
}: RenderOptions = {}) => {
  mockUseKibana.mockReturnValue({
    services: {
      http: {} as any,
      settings: {} as any,
    },
  } as any);

  mockUseLoadConnectors.mockReturnValue({
    data: connectors,
    isLoading,
  } as any);

  // Default: pick defaultConnectorId if it's in the list, otherwise fall back to the first connector.
  mockUseDefaultConnector.mockImplementation(({ connectors: cs, defaultConnectorId: did }: any) => {
    if (initialConnectorId !== undefined) return initialConnectorId;
    if (did && cs.some((c: AIConnector) => c.id === did)) return did;
    return cs[0]?.id;
  });

  const selectConnector = jest.fn();

  mockUseSendMessage.mockReturnValue({
    connectorSelection: {
      selectedConnector,
      selectConnector,
      defaultConnectorId,
      defaultConnectorOnly,
    },
  } as any);

  const utils = render(
    <IntlProvider locale="en">
      <ConnectorSelector />
    </IntlProvider>
  );
  return {
    ...utils,
    selectConnector,
    // Helper to re-render with a new send-message context (simulates admin changing a setting).
    updateContext: (next: Partial<RenderOptions>) => {
      mockUseSendMessage.mockReturnValue({
        connectorSelection: {
          selectedConnector: next.selectedConnector ?? selectedConnector,
          selectConnector,
          defaultConnectorId:
            'defaultConnectorId' in next ? next.defaultConnectorId : defaultConnectorId,
          defaultConnectorOnly: next.defaultConnectorOnly ?? defaultConnectorOnly,
        },
      } as any);
      act(() => {
        utils.rerender(
          <IntlProvider locale="en">
            <ConnectorSelector />
          </IntlProvider>
        );
      });
    },
  };
};

describe('ConnectorSelector sync effect', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('picks the initial connector when the user has no preference', () => {
    const connectors = [mkConnector('A'), mkConnector('B')];
    const { selectConnector } = setup({
      connectors,
      selectedConnector: undefined,
      defaultConnectorId: 'A',
    });
    expect(selectConnector).toHaveBeenCalledWith('A');
  });

  it('falls back to the initial connector when the stored pick is no longer in the list', () => {
    const connectors = [mkConnector('A')];
    const { selectConnector } = setup({
      connectors,
      selectedConnector: 'missing-from-list',
      defaultConnectorId: 'A',
    });
    expect(selectConnector).toHaveBeenCalledWith('A');
  });

  it('does not override a valid stored pick on mount even when a default is configured', () => {
    const connectors = [mkConnector('A'), mkConnector('saved')];
    const { selectConnector } = setup({
      connectors,
      selectedConnector: 'saved',
      defaultConnectorId: 'A',
    });
    expect(selectConnector).not.toHaveBeenCalled();
  });

  it('switches to the new default when an admin changes the default during the session', () => {
    const connectors = [mkConnector('A'), mkConnector('B'), mkConnector('saved')];
    const { selectConnector, updateContext } = setup({
      connectors,
      selectedConnector: 'saved',
      defaultConnectorId: 'A',
    });
    expect(selectConnector).not.toHaveBeenCalled();

    updateContext({ defaultConnectorId: 'B' });

    expect(selectConnector).toHaveBeenCalledWith('B');
  });

  it('switches to the default when an admin sets a default for the first time', () => {
    const connectors = [mkConnector('A'), mkConnector('saved')];
    const { selectConnector, updateContext } = setup({
      connectors,
      selectedConnector: 'saved',
      defaultConnectorId: undefined,
    });
    expect(selectConnector).not.toHaveBeenCalled();

    updateContext({ defaultConnectorId: 'A' });

    expect(selectConnector).toHaveBeenCalledWith('A');
  });

  it('keeps the current pick when the admin unsets the default', () => {
    const connectors = [mkConnector('A'), mkConnector('saved')];
    const { selectConnector, updateContext } = setup({
      connectors,
      selectedConnector: 'saved',
      defaultConnectorId: 'A',
    });

    updateContext({ defaultConnectorId: undefined });

    expect(selectConnector).not.toHaveBeenCalled();
  });

  it('does not act while connectors are still loading', () => {
    const { selectConnector } = setup({
      connectors: [],
      isLoading: true,
      selectedConnector: undefined,
      defaultConnectorId: 'A',
    });
    expect(selectConnector).not.toHaveBeenCalled();
  });

  describe('defaultConnectorOnly', () => {
    it('forces the chat to the default when turned on', () => {
      const connectors = [mkConnector('A'), mkConnector('saved')];
      const { selectConnector } = setup({
        connectors,
        selectedConnector: 'saved',
        defaultConnectorId: 'A',
        defaultConnectorOnly: true,
      });
      expect(selectConnector).toHaveBeenCalledWith('A');
    });

    it('disables the popover button when turned on', () => {
      const connectors = [mkConnector('A')];
      setup({
        connectors,
        selectedConnector: 'A',
        defaultConnectorId: 'A',
        defaultConnectorOnly: true,
      });
      const button = screen.getByTestId('agentBuilderConnectorSelectorButton');
      expect(button).toBeDisabled();
    });

    it('leaves the popover button enabled when turned off', () => {
      const connectors = [mkConnector('A')];
      setup({
        connectors,
        selectedConnector: 'A',
        defaultConnectorId: 'A',
        defaultConnectorOnly: false,
      });
      const button = screen.getByTestId('agentBuilderConnectorSelectorButton');
      expect(button).not.toBeDisabled();
    });
  });
});
