/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { GenAiFields } from '@kbn/apm-ui-shared';
import { SpanDetail } from './span_detail';
import type { SpanNode } from './types';

jest.mock('@kbn/apm-ui-shared', () => {
  const actual = jest.requireActual('@kbn/apm-ui-shared');
  return {
    ...actual,
    GenAiTab: ({ genAi }: { genAi: GenAiFields }) => (
      <div data-test-subj="mockGenAiTab">
        GenAiTab:{genAi.operationName ?? genAi.toolName ?? 'unknown'}
        {genAi.toolDefinitions != null && (
          <span data-test-subj="mockRawToolDefinitions">Raw tool definitions</span>
        )}
      </div>
    ),
  };
});

const buildSpanNode = (overrides: Partial<SpanNode> = {}): SpanNode => ({
  span_id: 'span-1',
  trace_id: 'trace-abc',
  name: 'test-span',
  start_time: '2025-06-01T00:00:00Z',
  duration_ms: 42.5,
  kind: 'INTERNAL',
  status: 'OK',
  children: [],
  depth: 0,
  ...overrides,
});

describe('SpanDetail', () => {
  it('renders span name and basic metadata', () => {
    const span = buildSpanNode({ name: 'chat gpt-4', duration_ms: 123.4, kind: 'CLIENT' });
    render(<SpanDetail span={span} onClose={jest.fn()} />);

    expect(screen.getByText('chat gpt-4')).toBeInTheDocument();
    expect(screen.getByText('123.4ms')).toBeInTheDocument();
    expect(screen.getByText('CLIENT')).toBeInTheDocument();
    expect(screen.getByText('OK')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = jest.fn();
    render(<SpanDetail span={buildSpanNode()} onClose={onClose} />);

    fireEvent.click(screen.getByLabelText('Close detail'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('embeds GenAiTab for chat spans with gen_ai attributes', () => {
    const span = buildSpanNode({
      name: 'chat gpt-4.1',
      attributes: {
        'gen_ai.operation.name': 'chat',
        'gen_ai.request.model': 'gpt-4.1',
        'gen_ai.input.messages': JSON.stringify([
          { role: 'user', parts: [{ type: 'text', content: 'hi' }] },
        ]),
        'gen_ai.system_instructions': JSON.stringify([{ type: 'text', content: 'Be helpful' }]),
        'gen_ai.tool.definitions': JSON.stringify([
          { type: 'function', name: 'search', description: 'Search', parameters: {} },
        ]),
      },
    });
    render(<SpanDetail span={span} onClose={jest.fn()} />);

    expect(screen.getByTestId('mockGenAiTab')).toHaveTextContent('GenAiTab:chat');
  });

  it('embeds GenAiTab for execute_tool spans', () => {
    const span = buildSpanNode({
      name: 'execute_tool platform.core.execute_esql',
      attributes: {
        'gen_ai.operation.name': 'execute_tool',
        'gen_ai.tool.name': 'platform.core.execute_esql',
        'gen_ai.tool.call.arguments': '{"query":"FROM logs"}',
        'gen_ai.tool.call.result': '{"rows":[]}',
      },
    });
    render(<SpanDetail span={span} onClose={jest.fn()} />);

    expect(screen.getByTestId('mockGenAiTab')).toHaveTextContent('GenAiTab:execute_tool');
  });

  it('renders copy span ID button', () => {
    render(<SpanDetail span={buildSpanNode()} onClose={jest.fn()} />);
    expect(screen.getByLabelText('Copy span ID')).toBeInTheDocument();
  });

  it('defaults to the GenAI tab and keeps attributes on their own tab', () => {
    render(
      <SpanDetail
        span={buildSpanNode({
          attributes: {
            'gen_ai.operation.name': 'chat',
            'http.method': 'POST',
          },
        })}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByText('GenAI')).toBeInTheDocument();
    expect(screen.getByTestId('mockGenAiTab')).toBeInTheDocument();
    expect(screen.queryByText('http.method')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Attributes'));

    expect(screen.getByText('gen_ai.operation.name')).toBeInTheDocument();
    expect(screen.getByText('http.method')).toBeInTheDocument();
    expect(screen.queryByTestId('mockGenAiTab')).not.toBeInTheDocument();
  });

  it('renders attributes without a tab bar when the span has no gen_ai data', () => {
    render(
      <SpanDetail
        span={buildSpanNode({ attributes: { 'http.method': 'GET' } })}
        onClose={jest.fn()}
      />
    );

    expect(screen.queryByText('GenAI')).not.toBeInTheDocument();
    expect(screen.getByText('http.method')).toBeInTheDocument();
  });

  it('handles span with no attributes gracefully', () => {
    render(<SpanDetail span={buildSpanNode({ attributes: undefined })} onClose={jest.fn()} />);

    expect(screen.getByText('test-span')).toBeInTheDocument();
    expect(screen.queryByTestId('mockGenAiTab')).not.toBeInTheDocument();
    expect(screen.getByText('No attributes available for this span.')).toBeInTheDocument();
  });

  it('renders dash when kind or status is not provided', () => {
    render(
      <SpanDetail
        span={buildSpanNode({ kind: undefined, status: undefined })}
        onClose={jest.fn()}
      />
    );

    expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(2);
  });

  it('keeps every raw attribute in the Attributes tab', () => {
    render(
      <SpanDetail
        span={buildSpanNode({
          attributes: {
            'gen_ai.operation.name': 'chat',
            'gen_ai.prompt.id': 'alert-summarization',
            'http.method': 'POST',
            'resource.service.name': 'kibana',
            'custom.flag': true,
            'custom.payload': { query: 'FROM logs' },
          },
        })}
        onClose={jest.fn()}
      />
    );

    fireEvent.click(screen.getByText('Attributes'));

    expect(screen.getByText('gen_ai.operation.name')).toBeInTheDocument();
    expect(screen.getByText('gen_ai.prompt.id')).toBeInTheDocument();
    expect(screen.getByText('http.method')).toBeInTheDocument();
    expect(screen.getByText('resource.service.name')).toBeInTheDocument();
    expect(screen.getByText('custom.flag')).toBeInTheDocument();
    expect(screen.getByText('custom.payload')).toBeInTheDocument();
    expect(screen.getByText(/"query": "FROM logs"/)).toBeInTheDocument();
  });

  it('keeps invalid tool definitions in both GenAI and Attributes tabs', () => {
    render(
      <SpanDetail
        span={buildSpanNode({
          attributes: {
            'gen_ai.tool.definitions': JSON.stringify({
              search: { description: 'Legacy map' },
            }),
          },
        })}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByTestId('mockRawToolDefinitions')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Attributes'));
    expect(screen.getByText('gen_ai.tool.definitions')).toBeInTheDocument();
  });

  it('keeps legacy tool input and output fields as raw attributes', () => {
    render(
      <SpanDetail
        span={buildSpanNode({
          attributes: {
            'tool.parameters': { query: 'FROM logs' },
            'output.value': { rows: [] },
          },
        })}
        onClose={jest.fn()}
      />
    );

    expect(screen.queryByText('GenAI')).not.toBeInTheDocument();
    expect(screen.getByText('tool.parameters')).toBeInTheDocument();
    expect(screen.getByText('output.value')).toBeInTheDocument();
  });
});
