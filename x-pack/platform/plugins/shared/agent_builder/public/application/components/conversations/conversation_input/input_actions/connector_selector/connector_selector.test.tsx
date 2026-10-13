/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type PropsWithChildren } from 'react';
import { render, screen, act } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { AIConnector } from '@kbn/elastic-assistant';

jest.mock('@kbn/inference-connectors', () => ({
  useLoadConnectors: jest.fn(),
}));

jest.mock('../../../../../hooks/use_kibana', () => ({
  useKibana: jest.fn(),
}));

jest.mock('../../../../../hooks/chat/use_connector_selection', () => ({
  useConnectorSelection: jest.fn(),
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

jest.mock('../../../../../hooks/use_conversation', () => ({
  useAgentId: () => 'agent-1',
}));

jest.mock('../../../../../hooks/agents/use_agent_model', () => ({
  useAgentModel: jest.fn(),
}));

jest.mock('../input_actions.styles', () => ({
  getMaxListHeight: () => 200,
  selectorPopoverPanelStyles: undefined,
  useSelectorListStyles: () => undefined,
}));

jest.mock('../input_popover_button', () => ({
  InputPopoverButton: ({
    disabled,
    hasAriaDisabled,
    children,
    onClick,
    'aria-label': ariaLabel,
    onFocus,
    onBlur,
    'aria-describedby': ariaDescribedBy,
  }: PropsWithChildren<InputPopoverButtonProps>) => (
    <button
      type="button"
      data-test-subj="agentBuilderConnectorSelectorButton"
      disabled={disabled && !hasAriaDisabled}
      aria-disabled={disabled && hasAriaDisabled ? true : undefined}
      onClick={onClick}
      aria-label={ariaLabel}
      onFocus={onFocus}
      onBlur={onBlur}
      aria-describedby={ariaDescribedBy}
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
import { useConnectorSelection } from '../../../../../hooks/chat/use_connector_selection';
import { useDefaultConnector } from '../../../../../hooks/chat/use_default_connector';
import {
  useAgentModel,
  type UseAgentModelResult,
} from '../../../../../hooks/agents/use_agent_model';
import type { InputPopoverButtonProps } from '../input_popover_button';
import { ConnectorSelector } from './connector_selector';

const mockUseLoadConnectors = useLoadConnectors as jest.MockedFunction<typeof useLoadConnectors>;
const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseConnectorSelection = useConnectorSelection as jest.MockedFunction<
  typeof useConnectorSelection
>;
const mockUseDefaultConnector = useDefaultConnector as jest.MockedFunction<
  typeof useDefaultConnector
>;
const mockUseAgentModel = jest.mocked(useAgentModel);

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
  agentModel?: UseAgentModelResult;
}

const setup = ({
  connectors = [],
  isLoading = false,
  selectedConnector,
  defaultConnectorId,
  defaultConnectorOnly = false,
  initialConnectorId,
  agentModel = { isLoading: false, isLocked: false },
}: RenderOptions = {}) => {
  mockUseAgentModel.mockReturnValue(agentModel);

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

  mockUseConnectorSelection.mockReturnValue({
    selectedConnector,
    selectConnector,
    defaultConnectorId,
    defaultConnectorOnly,
  });

  const utils = render(
    <IntlProvider locale="en">
      <ConnectorSelector />
    </IntlProvider>
  );
  return {
    ...utils,
    selectConnector,
    // Helper to re-render with a new connector selection (simulates admin changing a setting).
    updateContext: (next: Partial<RenderOptions>) => {
      mockUseConnectorSelection.mockReturnValue({
        selectedConnector: next.selectedConnector ?? selectedConnector,
        selectConnector,
        defaultConnectorId:
          'defaultConnectorId' in next ? next.defaultConnectorId : defaultConnectorId,
        defaultConnectorOnly: next.defaultConnectorOnly ?? defaultConnectorOnly,
      });
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

  it('does not override the user selection when the default resolves for the first time', () => {
    const connectors = [mkConnector('A'), mkConnector('saved')];
    const { selectConnector, updateContext } = setup({
      connectors,
      selectedConnector: 'saved',
      defaultConnectorId: undefined,
    });
    expect(selectConnector).not.toHaveBeenCalled();

    updateContext({ defaultConnectorId: 'A' });

    expect(selectConnector).not.toHaveBeenCalled();
  });

  it('reverts to the new default when the admin changes it after settings have resolved', () => {
    const connectors = [mkConnector('A'), mkConnector('B'), mkConnector('saved')];
    const { selectConnector, updateContext } = setup({
      connectors,
      selectedConnector: 'saved',
      defaultConnectorId: undefined,
    });

    updateContext({ defaultConnectorId: 'A' });
    expect(selectConnector).not.toHaveBeenCalled();

    updateContext({ defaultConnectorId: 'B' });
    expect(selectConnector).toHaveBeenCalledWith('B');
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

  it('announces the current connector name in the button aria-label', () => {
    const connectors = [mkConnector('Elastic Managed LLM')];
    setup({
      connectors,
      selectedConnector: 'Elastic Managed LLM',
    });
    const button = screen.getByTestId('agentBuilderConnectorSelectorButton');
    expect(button).toHaveAttribute('aria-label', 'Select connector, Elastic Managed LLM');
  });

  it('uses a fallback label when no connector is selected', () => {
    setup({ connectors: [], selectedConnector: undefined });
    const button = screen.getByTestId('agentBuilderConnectorSelectorButton');
    expect(button).toHaveAttribute('aria-label', 'Select connector, LLM');
  });

  describe('while the agent is loading', () => {
    it('shows a disabled button without touching the stored connector selection', () => {
      const { selectConnector } = setup({
        connectors: [mkConnector('A')],
        selectedConnector: undefined,
        defaultConnectorId: 'A',
        agentModel: { isLoading: true, isLocked: false },
      });
      const button = screen.getByTestId('agentBuilderConnectorSelectorButton');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-label', 'Select connector, LLM');
      expect(selectConnector).not.toHaveBeenCalled();
      expect(mockUseLoadConnectors).not.toHaveBeenCalled();
    });
  });

  describe('when the agent sets its own model', () => {
    const lockedAgentModel: UseAgentModelResult = {
      isLoading: false,
      isLocked: true,
      connectorName: 'Agent Model',
    };

    it('disables the button and shows the model resolved for the agent', () => {
      setup({
        connectors: [mkConnector('A')],
        selectedConnector: 'A',
        agentModel: lockedAgentModel,
      });
      const button = screen.getByTestId('agentBuilderConnectorSelectorButton');
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).toHaveAttribute('aria-label', 'Select connector, Agent Model');
      expect(mockUseAgentModel).toHaveBeenCalledWith('agent-1');
    });

    it('explains why the model cannot be changed when the button receives keyboard focus', async () => {
      setup({ agentModel: lockedAgentModel });
      const button = screen.getByTestId('agentBuilderConnectorSelectorButton');

      act(() => button.focus());

      const tooltip = await screen.findByRole('tooltip');
      expect(tooltip).toHaveTextContent(
        'This agent uses a preconfigured model, so it cannot be changed here.'
      );
      expect(button).toHaveAttribute('aria-describedby', tooltip.id);
    });

    it('does not change the stored connector selection', () => {
      const { selectConnector } = setup({
        connectors: [mkConnector('A')],
        selectedConnector: undefined,
        defaultConnectorId: 'A',
        agentModel: lockedAgentModel,
      });
      expect(selectConnector).not.toHaveBeenCalled();
      expect(mockUseLoadConnectors).not.toHaveBeenCalled();
    });

    it('uses the fallback label while the model is still resolving', () => {
      setup({ agentModel: { isLoading: false, isLocked: true } });
      const button = screen.getByTestId('agentBuilderConnectorSelectorButton');
      expect(button).toHaveAttribute('aria-label', 'Select connector, LLM');
    });
  });
});
