/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render as rtlRender, screen, within } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import userEvent from '@testing-library/user-event';
import type { ExecutionTerminatedEvent, RoundModelUsageStats } from '@kbn/agent-builder-common';
import { createExecutionTerminatedEvent } from '../items/execution_terminated_event.factory';
import { ExecutionMetadataPopover } from './execution_metadata_popover';

const render = (ui: React.ReactElement) => rtlRender(ui, { wrapper: EuiProvider });

jest.mock('../../../../hooks/use_kibana', () => ({
  useKibana: () => ({ services: { http: {}, settings: {} } }),
}));

const mockUseLoadConnectors = jest.fn();
jest.mock('@kbn/inference-connectors', () => ({
  useLoadConnectors: (props: unknown) => mockUseLoadConnectors(props),
}));

const eventWithUsage = (modelUsage: RoundModelUsageStats): ExecutionTerminatedEvent => {
  const event = createExecutionTerminatedEvent();
  return {
    ...event,
    data: { ...event.data, time_to_last_token: 4200, model_usage: modelUsage },
  };
};

const usageWithBreakdown: RoundModelUsageStats = {
  connector_id: 'main-connector',
  llm_calls: 5,
  input_tokens: 43136,
  output_tokens: 343,
  cached_input_tokens: 11670,
  model: 'claude-haiku',
  connectors: [
    {
      connector_id: 'main-connector',
      llm_calls: 3,
      input_tokens: 25325,
      output_tokens: 265,
      cached_input_tokens: 11670,
      model: 'claude-haiku',
    },
    {
      connector_id: 'fast-connector',
      llm_calls: 2,
      input_tokens: 17811,
      output_tokens: 78,
      model: 'gemini-flash',
    },
  ],
};

const usageWithReasoning: RoundModelUsageStats = {
  ...usageWithBreakdown,
  reasoning_tokens: 120,
  connectors: (usageWithBreakdown.connectors ?? []).map((connector) =>
    connector.connector_id === 'main-connector'
      ? { ...connector, reasoning_tokens: 120 }
      : connector
  ),
};

const openPopover = async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  await user.click(screen.getByTestId('executionMetadataPopoverTrigger'));
  return user;
};

describe('ExecutionMetadataPopover', () => {
  beforeEach(() => {
    mockUseLoadConnectors.mockReturnValue({
      data: [
        {
          id: 'main-connector',
          name: 'Anthropic Claude Haiku 4.5',
          metadata: { display: { model_creator: 'Anthropic' } },
        },
        {
          id: 'fast-connector',
          name: 'Google Gemini 3.5 Flash Lite',
          metadata: { display: { model_creator: 'Google' } },
        },
      ],
    });
  });

  describe('Total tab', () => {
    it('shows the execution time and the tokens sent and received', async () => {
      render(
        <ExecutionMetadataPopover
          executionTerminatedEvent={eventWithUsage({
            connector_id: 'c1',
            llm_calls: 1,
            input_tokens: 111,
            output_tokens: 22,
          })}
        />
      );
      await openPopover();

      expect(screen.getByText('Execution time')).toBeInTheDocument();
      expect(screen.getByText('Tokens sent')).toBeInTheDocument();
      expect(screen.getByText('111')).toBeInTheDocument();
      expect(screen.getByText('Tokens received')).toBeInTheDocument();
      expect(screen.getByText('22')).toBeInTheDocument();
    });

    it('shows the tokens in a compact format', async () => {
      render(
        <ExecutionMetadataPopover
          executionTerminatedEvent={eventWithUsage({
            connector_id: 'c1',
            llm_calls: 1,
            input_tokens: 1234567,
            output_tokens: 12345,
          })}
        />
      );
      await openPopover();

      expect(screen.getByText('1.2m')).toBeInTheDocument();
      expect(screen.getByText('12.3k')).toBeInTheDocument();
    });

    it('shows the cache hit tokens under the tokens sent when they are reported', async () => {
      render(
        <ExecutionMetadataPopover
          executionTerminatedEvent={eventWithUsage({
            connector_id: 'c1',
            llm_calls: 1,
            input_tokens: 111,
            output_tokens: 22,
            cached_input_tokens: 52,
          })}
        />
      );
      await openPopover();

      expect(screen.getByText('Cache hit tokens')).toBeInTheDocument();
      expect(screen.getByText('52')).toBeInTheDocument();
    });

    it('hides the cache hit tokens when no model reported them', async () => {
      render(
        <ExecutionMetadataPopover
          executionTerminatedEvent={eventWithUsage({
            connector_id: 'c1',
            llm_calls: 1,
            input_tokens: 111,
            output_tokens: 22,
          })}
        />
      );
      await openPopover();

      expect(screen.queryByText('Cache hit tokens')).not.toBeInTheDocument();
    });

    it('shows the reasoning tokens under the tokens received when they are reported', async () => {
      render(
        <ExecutionMetadataPopover executionTerminatedEvent={eventWithUsage(usageWithReasoning)} />
      );
      await openPopover();

      expect(screen.getByText('Reasoning tokens')).toBeInTheDocument();
      expect(screen.getByText('120')).toBeInTheDocument();
    });

    it('hides the reasoning tokens when no model reported them', async () => {
      render(
        <ExecutionMetadataPopover executionTerminatedEvent={eventWithUsage(usageWithBreakdown)} />
      );
      await openPopover();

      expect(screen.queryByText('Reasoning tokens')).not.toBeInTheDocument();
    });

    it('has no tabs when only one model was used, as the table would repeat the totals', async () => {
      render(
        <ExecutionMetadataPopover
          executionTerminatedEvent={eventWithUsage({
            connector_id: 'main-connector',
            llm_calls: 1,
            input_tokens: 111,
            output_tokens: 22,
            connectors: [
              {
                connector_id: 'main-connector',
                llm_calls: 1,
                input_tokens: 111,
                output_tokens: 22,
              },
            ],
          })}
        />
      );
      await openPopover();

      expect(screen.queryByTestId('executionMetadataTabs')).not.toBeInTheDocument();
      expect(screen.getByText('Execution time')).toBeInTheDocument();
    });

    it('has no tabs when the response has no per-model breakdown', async () => {
      render(
        <ExecutionMetadataPopover
          executionTerminatedEvent={eventWithUsage({
            connector_id: 'c1',
            llm_calls: 1,
            input_tokens: 111,
            output_tokens: 22,
          })}
        />
      );
      await openPopover();

      expect(screen.queryByTestId('executionMetadataTabs')).not.toBeInTheDocument();
    });
  });

  describe('By model tab', () => {
    it('shows the Total tab first when there is a breakdown', async () => {
      render(
        <ExecutionMetadataPopover executionTerminatedEvent={eventWithUsage(usageWithBreakdown)} />
      );
      await openPopover();

      expect(screen.getByTestId('executionMetadataTabs')).toBeInTheDocument();
      expect(screen.queryByTestId('executionMetadataByModelTable')).not.toBeInTheDocument();
      expect(screen.getByText('Execution time')).toBeInTheDocument();
    });

    it('lists the totals and one row per model, with the connector names', async () => {
      render(
        <ExecutionMetadataPopover executionTerminatedEvent={eventWithUsage(usageWithBreakdown)} />
      );
      const user = await openPopover();
      await user.click(screen.getByTestId('executionMetadataByModelTab'));

      const total = screen.getByTestId('executionMetadataModelRow-all');
      expect(within(total).getByText('All models')).toBeInTheDocument();
      expect(within(total).getByText('5')).toBeInTheDocument();
      expect(within(total).getByText(/43\.1k/)).toBeInTheDocument();
      expect(within(total).getByText(/11\.7k/)).toBeInTheDocument();
      expect(within(total).getByText('343')).toBeInTheDocument();

      const main = screen.getByTestId('executionMetadataModelRow-main-connector');
      expect(within(main).getByText('Claude Haiku 4.5')).toBeInTheDocument();
      expect(within(main).getByText('3')).toBeInTheDocument();
      expect(within(main).getByText(/25\.3k/)).toBeInTheDocument();
      expect(within(main).getByText('265')).toBeInTheDocument();

      const fast = screen.getByTestId('executionMetadataModelRow-fast-connector');
      expect(within(fast).getByText('Gemini 3.5 Flash Lite')).toBeInTheDocument();
      expect(within(fast).getByText('2')).toBeInTheDocument();
      expect(within(fast).getByText('78')).toBeInTheDocument();
    });

    it('keeps the full connector name when it has no creator or does not start with it', async () => {
      mockUseLoadConnectors.mockReturnValue({
        data: [
          { id: 'main-connector', name: 'My Anthropic connector' },
          {
            id: 'fast-connector',
            name: 'Fast model',
            metadata: { display: { model_creator: 'Google' } },
          },
        ],
      });
      render(
        <ExecutionMetadataPopover executionTerminatedEvent={eventWithUsage(usageWithBreakdown)} />
      );
      const user = await openPopover();
      await user.click(screen.getByTestId('executionMetadataByModelTab'));

      expect(
        within(screen.getByTestId('executionMetadataModelRow-main-connector')).getByText(
          'My Anthropic connector'
        )
      ).toBeInTheDocument();
      expect(
        within(screen.getByTestId('executionMetadataModelRow-fast-connector')).getByText(
          'Fast model'
        )
      ).toBeInTheDocument();
    });

    it('shows the full connector name in a tooltip when the name was shortened', async () => {
      render(
        <ExecutionMetadataPopover executionTerminatedEvent={eventWithUsage(usageWithBreakdown)} />
      );
      const user = await openPopover();
      await user.click(screen.getByTestId('executionMetadataByModelTab'));

      await user.hover(screen.getByText('Claude Haiku 4.5'));

      expect(await screen.findByText('Anthropic Claude Haiku 4.5')).toBeInTheDocument();
    });

    it('shows the name in a tooltip too when it was not shortened', async () => {
      mockUseLoadConnectors.mockReturnValue({
        data: [{ id: 'main-connector', name: 'My Anthropic connector' }],
      });
      render(
        <ExecutionMetadataPopover executionTerminatedEvent={eventWithUsage(usageWithBreakdown)} />
      );
      const user = await openPopover();
      await user.click(screen.getByTestId('executionMetadataByModelTab'));

      await user.hover(screen.getByText('My Anthropic connector'));

      expect(await screen.findAllByText('My Anthropic connector')).toHaveLength(2);
    });

    it('shows a dash for each value a model does not report', async () => {
      render(
        <ExecutionMetadataPopover executionTerminatedEvent={eventWithUsage(usageWithBreakdown)} />
      );
      const user = await openPopover();
      await user.click(screen.getByTestId('executionMetadataByModelTab'));

      const fast = screen.getByTestId('executionMetadataModelRow-fast-connector');
      expect(within(fast).getByLabelText('Not reported by this model')).toHaveTextContent('—');
      const main = screen.getByTestId('executionMetadataModelRow-main-connector');
      expect(within(main).queryByLabelText('Not reported by this model')).not.toBeInTheDocument();
    });

    it('shows the reasoning tokens of each model, with a dash for a model that does not report them', async () => {
      render(
        <ExecutionMetadataPopover executionTerminatedEvent={eventWithUsage(usageWithReasoning)} />
      );
      const user = await openPopover();
      await user.click(screen.getByTestId('executionMetadataByModelTab'));

      expect(screen.getByText('Tokens received')).toBeInTheDocument();
      expect(screen.getByText('(reasoning)')).toBeInTheDocument();
      expect(
        within(screen.getByTestId('executionMetadataModelRow-all')).getByText(/120/)
      ).toBeInTheDocument();
      expect(
        within(screen.getByTestId('executionMetadataModelRow-main-connector')).getByText(/120/)
      ).toBeInTheDocument();
      expect(
        within(screen.getByTestId('executionMetadataModelRow-fast-connector')).getAllByLabelText(
          'Not reported by this model'
        )
      ).toHaveLength(2);
    });

    it('reserves the second header line for every column when a header has a suffix', async () => {
      render(
        <ExecutionMetadataPopover executionTerminatedEvent={eventWithUsage(usageWithBreakdown)} />
      );
      const user = await openPopover();
      await user.click(screen.getByTestId('executionMetadataByModelTab'));

      const [model, llmCalls, tokensSent, tokensReceived] = within(
        screen.getByTestId('executionMetadataByModelTable')
      ).getAllByRole('columnheader');

      expect(tokensSent).toHaveTextContent('(cached)');
      expect(tokensSent.querySelector('[aria-hidden="true"]')).toBeNull();
      [model, llmCalls, tokensReceived].forEach((header) => {
        expect(header.querySelectorAll('[aria-hidden="true"]')).toHaveLength(1);
      });
    });

    it('does not mention the cached tokens when no model reported them', async () => {
      const { cached_input_tokens: _cached, ...usageWithoutTopLevelCache } = usageWithBreakdown;
      render(
        <ExecutionMetadataPopover
          executionTerminatedEvent={eventWithUsage({
            ...usageWithoutTopLevelCache,
            connectors: (usageWithBreakdown.connectors ?? []).map(
              ({ cached_input_tokens: _connectorCached, ...connector }) => connector
            ),
          })}
        />
      );
      const user = await openPopover();
      await user.click(screen.getByTestId('executionMetadataByModelTab'));

      expect(screen.getByText('Tokens sent')).toBeInTheDocument();
      expect(screen.queryByText('(cached)')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Not reported by this model')).not.toBeInTheDocument();
    });

    it('does not mention the reasoning when no model reported it', async () => {
      render(
        <ExecutionMetadataPopover executionTerminatedEvent={eventWithUsage(usageWithBreakdown)} />
      );
      const user = await openPopover();
      await user.click(screen.getByTestId('executionMetadataByModelTab'));

      expect(screen.getByText('Tokens received')).toBeInTheDocument();
      expect(screen.queryByText('(reasoning)')).not.toBeInTheDocument();
    });

    it('falls back to the model, then to the connector id, when the connector name is unknown', async () => {
      mockUseLoadConnectors.mockReturnValue({ data: [] });
      render(
        <ExecutionMetadataPopover
          executionTerminatedEvent={eventWithUsage({
            ...usageWithBreakdown,
            connectors: [
              {
                connector_id: 'main-connector',
                llm_calls: 3,
                input_tokens: 25325,
                output_tokens: 265,
                model: 'claude-haiku',
              },
              {
                connector_id: 'no-model-connector',
                llm_calls: 1,
                input_tokens: 1,
                output_tokens: 1,
              },
            ],
          })}
        />
      );
      const user = await openPopover();
      await user.click(screen.getByTestId('executionMetadataByModelTab'));

      expect(
        within(screen.getByTestId('executionMetadataModelRow-main-connector')).getByText(
          'claude-haiku'
        )
      ).toBeInTheDocument();
      expect(
        within(screen.getByTestId('executionMetadataModelRow-no-model-connector')).getByText(
          'no-model-connector'
        )
      ).toBeInTheDocument();
    });

    it('tracks the switch to a tab, but not a click on the tab that is already selected', async () => {
      render(
        <ExecutionMetadataPopover executionTerminatedEvent={eventWithUsage(usageWithBreakdown)} />
      );
      const user = await openPopover();

      expect(screen.getByTestId('executionMetadataTotalTab')).not.toHaveAttribute(
        'data-ebt-action'
      );
      expect(screen.getByTestId('executionMetadataByModelTab')).toHaveAttribute(
        'data-ebt-action',
        'view_round_metadata_by_model'
      );

      await user.click(screen.getByTestId('executionMetadataByModelTab'));

      expect(screen.getByTestId('executionMetadataByModelTab')).not.toHaveAttribute(
        'data-ebt-action'
      );
      expect(screen.getByTestId('executionMetadataTotalTab')).toHaveAttribute(
        'data-ebt-action',
        'view_round_metadata_total'
      );
    });

    it('goes back to the Total tab', async () => {
      render(
        <ExecutionMetadataPopover executionTerminatedEvent={eventWithUsage(usageWithBreakdown)} />
      );
      const user = await openPopover();
      await user.click(screen.getByTestId('executionMetadataByModelTab'));
      await user.click(screen.getByTestId('executionMetadataTotalTab'));

      expect(screen.queryByTestId('executionMetadataByModelTable')).not.toBeInTheDocument();
      expect(screen.getByText('Cache hit tokens')).toBeInTheDocument();
    });
  });
});
