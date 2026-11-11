/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Parent } from 'unist';
import type { MutableNode } from './markdown_plugins';
import { render, screen } from '@testing-library/react';
import {
  ToolResultType,
  type EsqlResults,
  type VisualizationResult,
} from '@kbn/agent-builder-common/tools/tool_result';
import { cloneDeep } from 'lodash';
import type { ConversationRoundStep } from '@kbn/agent-builder-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { ConversationRoundStepType } from '@kbn/agent-builder-common';
import unified from 'unified';
import remarkParse from 'remark-parse-no-trim';
import { createVisualizationRenderer, visualizationTagParser } from './markdown_plugins';
import { VisualizeESQL, InlineVisualization } from '@kbn/agent-builder-visualizations';
import { ChatMessageText } from './chat_message_text';
import { useAgentBuilderServices } from '../../../../hooks/use_agent_builder_service';
import { useStepsFromSavedTurns } from '../../../../hooks/use_steps_from_saved_turns';
import { useConversationContext } from '../../../../context/conversation/conversation_context';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { HttpStart } from '@kbn/core-http-browser';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { AgentBuilderStartDependencies } from '../../../../../types';
import { setWith } from '@kbn/safer-lodash-set';
import { ChartType } from '@kbn/visualization-utils';
import dedent from 'dedent';

jest.mock('./attachments/inline_attachment_with_actions', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const _React = require('react');
  return {
    InlineAttachmentWithActions: () =>
      _React.createElement('div', { 'data-test-subj': 'inline-attachment-card' }),
  };
});

jest.mock('./attachments/attachment_loading_skeleton', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const _React = require('react');
  return {
    AttachmentLoadingSkeleton: () =>
      _React.createElement('div', { 'data-test-subj': 'attachment-loading-skeleton' }),
  };
});

jest.mock('@kbn/agent-builder-visualizations', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const _React = require('react'); // Use require to avoid hoisting issues with jest.mock
  return {
    VisualizeESQL: jest.fn(() =>
      _React.createElement('span', { 'data-test-subj': 'visualize-esql' })
    ),
    VisualizeLens: jest.fn(() =>
      _React.createElement('span', { 'data-test-subj': 'visualize-lens' })
    ),
    InlineVisualization: jest.fn(() =>
      _React.createElement('span', { 'data-test-subj': 'inline-visualization' })
    ),
  };
});

const application = {} as ApplicationStart;
const http = {} as HttpStart;
const uiSettings = {} as IUiSettingsClient;

jest.mock('../../../../hooks/use_agent_builder_service', () => ({
  useAgentBuilderServices: jest.fn(),
}));

jest.mock('../../../../hooks/use_steps_from_saved_turns', () => ({
  useStepsFromSavedTurns: jest.fn(),
}));

jest.mock('../../../../context/conversation/conversation_context', () => ({
  useConversationContext: jest.fn(),
}));

const mockVisualizeESQL = VisualizeESQL as jest.MockedFunction<any>;
const mockInlineVisualization = InlineVisualization as jest.MockedFunction<any>;
const useAgentBuilderServicesMock = useAgentBuilderServices as jest.MockedFunction<
  typeof useAgentBuilderServices
>;
const useStepsFromSavedTurnsMock = useStepsFromSavedTurns as jest.MockedFunction<
  typeof useStepsFromSavedTurns
>;
const useConversationContextMock = useConversationContext as jest.MockedFunction<
  typeof useConversationContext
>;

const toolResult: EsqlResults = {
  tool_result_id: '6K4K',
  type: ToolResultType.esqlResults,
  data: {
    query:
      'FROM metrics-apm.transaction.1m-default\n| WHERE @timestamp >= NOW() - 1 hour\n| STATS avg_duration = AVG(transaction.duration.summary) BY minute_bucket = BUCKET(@timestamp, 1 minute)\n| SORT minute_bucket\n| LIMIT 100',
    columns: [
      { name: 'avg_duration', type: 'double' },
      { name: 'minute_bucket', type: 'date' },
    ],
    values: [],
  },
};

const toolCallStep: ConversationRoundStep = {
  type: ConversationRoundStepType.toolCall,
  tool_call_id: 'tool-call-1',
  tool_id: 'platform.core.search',
  params: {},
  results: [toolResult],
};

const vegaVisualizationResult: VisualizationResult = {
  tool_result_id: 'VEGA1',
  type: ToolResultType.visualization,
  data: {
    esql: 'FROM kibana_sample_data_logs',
    renderer: 'vega',
    visualization: { spec: '{"mark":"bar"}' },
    time_range: { from: 'now-7d', to: 'now' },
  },
};

const vegaVisualizationStep: ConversationRoundStep = {
  type: ConversationRoundStepType.toolCall,
  tool_call_id: 'tool-call-viz',
  tool_id: 'platform.core.create_visualization',
  params: {},
  results: [vegaVisualizationResult],
};

function createStartDependencies() {
  return {
    lens: {},
    dataViews: {},
    cloud: {},
    share: {},
    uiActions: {},
    embeddable: {},
    // Read when assembling the custom content renderer's services.
    data: { search: { search: jest.fn() } },
    unifiedSearch: {
      ui: {
        SearchBar: () => null,
      },
    },
  } as unknown as AgentBuilderStartDependencies;
}

function getAST(markdown: string) {
  const processor = unified().use(remarkParse);
  const tree = processor.parse(markdown);
  return processor.runSync(tree) as unknown as Parent;
}

describe('chat_message_text', () => {
  beforeEach(() => {
    mockVisualizeESQL.mockClear();
    useAgentBuilderServicesMock.mockReturnValue({
      agentService: {},
      chatService: {},
      conversationsService: {},
      toolsService: {},
      startDependencies: createStartDependencies(),
    } as ReturnType<typeof useAgentBuilderServices>);
    useStepsFromSavedTurnsMock.mockReturnValue([]);
    useConversationContextMock.mockReturnValue({
      isEmbeddedContext: false,
      browserApiTools: undefined,
      conversationActions: {
        invalidateConversation: jest.fn(),
        onExecutionStarted: jest.fn(),
        onExecutionTerminated: jest.fn(),
        refetchConversation: jest.fn(),
        deleteConversation: jest.fn(),
        renameConversation: jest.fn(),
      },
    });
  });

  describe('visualizationTagParser', () => {
    function recursivelyFindVisualizationNodes(
      node: MutableNode | Parent,
      nodes: MutableNode[] = []
    ) {
      if ('children' in node) {
        const parent = node as Parent;
        parent.children.forEach((child) =>
          recursivelyFindVisualizationNodes(child as MutableNode | Parent, nodes)
        );
      }

      if (node.type === 'visualization') {
        nodes.push(node as MutableNode);
      }

      return nodes;
    }

    function getVisualizationNodes(markdown: string) {
      const tree = getAST(markdown);
      visualizationTagParser()(tree);
      return recursivelyFindVisualizationNodes(tree);
    }

    it('converts visualization HTML nodes into visualization elements', () => {
      const toolResultId = 'abcd';
      const markdown = `Here is a visualization:\n<visualization tool-result-id="${toolResultId}" />`;
      const visualizationNodes = getVisualizationNodes(markdown);

      expect(visualizationNodes).toHaveLength(1);
      expect(visualizationNodes[0].toolResultId).toBe(toolResultId);
    });

    it('sets toolResultId to undefined when the attribute is missing', () => {
      const markdown = 'Missing attribute test\n<visualization />';
      const visualizationNodes = getVisualizationNodes(markdown);

      expect(visualizationNodes).toHaveLength(1);
      expect(visualizationNodes[0].toolResultId).toBeUndefined();
    });

    it('supports multiple visualization tags in a single markdown', () => {
      const markdown = `Multiple visualizations\n<visualization tool-result-id="first" />\nMore text
<visualization tool-result-id="second" />`;
      const visualizationNodes = getVisualizationNodes(markdown);

      expect(visualizationNodes).toHaveLength(2);
      const ids = visualizationNodes.map((node) => node.toolResultId);
      expect(ids).toEqual(['first', 'second']);
    });

    it('supports multiple visualization tags without any text', () => {
      const markdown = `<visualization tool-result-id="first" />\n<visualization tool-result-id="second" />`;
      const visualizationNodes = getVisualizationNodes(markdown);

      expect(visualizationNodes).toHaveLength(2);
      const ids = visualizationNodes.map((node) => node.toolResultId);
      expect(ids).toEqual(['first', 'second']);
    });

    it('handles mixed-case visualization tags', () => {
      const markdown = 'Case insensitive\n<VISUALIZATION tool-result-id="cased" />';
      const visualizationNodes = getVisualizationNodes(markdown);

      expect(visualizationNodes).toHaveLength(1);
      expect(visualizationNodes[0].toolResultId).toBe('cased');
    });

    it('captures chart type attribute when present', () => {
      const markdown = `Line\n<visualization tool-result-id="2hJz" chart-type="Line" />`;
      const [visualizationNode] = getVisualizationNodes(markdown);

      expect(visualizationNode).toBeDefined();
      expect(visualizationNode.toolResultId).toBe('2hJz');
      expect(visualizationNode.chartType).toBe('Line');
    });

    it('captures chart type attribute for multiple visualizations sharing the same tool result', () => {
      const markdown = `Line\n<visualization tool-result-id="2hJz" chart-type="Line" />\n\nBar\n<visualization tool-result-id="2hJz" chart-type="Bar" />`;
      const visualizationNodes = getVisualizationNodes(markdown);

      expect(visualizationNodes).toHaveLength(2);
      expect(visualizationNodes.map((node) => node.chartType)).toEqual(['Line', 'Bar']);
    });
  });

  describe('createVisualizationRenderer', () => {
    beforeEach(() => mockInlineVisualization.mockClear());

    it('renders a Vega visualization-type tool result via InlineVisualization', () => {
      const startDependencies = createStartDependencies();
      const renderer = createVisualizationRenderer({
        application,
        http,
        uiSettings,
        startDependencies,
        stepsFromCurrentTurn: [vegaVisualizationStep],
        stepsFromPreviousTurns: [],
      });

      render(renderer({ toolResultId: 'VEGA1' }));

      expect(mockVisualizeESQL).not.toHaveBeenCalled();
      expect(mockInlineVisualization).toHaveBeenCalledTimes(1);
      const props = mockInlineVisualization.mock.calls[0][0];
      expect(props).toMatchObject({
        renderer: 'vega',
        visualization: vegaVisualizationResult.data.visualization,
        timeRange: vegaVisualizationResult.data.time_range,
        services: expect.objectContaining({ embeddable: startDependencies.embeddable }),
      });
    });

    it('returns a renderer that instantiates VisualizeESQL when the tool result exists', () => {
      const startDependencies = createStartDependencies();
      const renderer = createVisualizationRenderer({
        application,
        http,
        uiSettings,
        startDependencies,
        stepsFromCurrentTurn: [toolCallStep],
        stepsFromPreviousTurns: [],
      });

      const element = renderer({ toolResultId: '6K4K' });
      render(element);

      expect(mockVisualizeESQL).toHaveBeenCalledTimes(1);
      const props = mockVisualizeESQL.mock.calls[0][0];
      expect(props).toMatchObject({
        esqlColumns: toolResult.data.columns,
        esqlQuery: toolResult.data.query,
        services: expect.objectContaining({
          lens: startDependencies.lens,
          dataViews: startDependencies.dataViews,
          uiActions: startDependencies.uiActions,
        }),
      });
    });

    it('returns a fallback when toolResultId is missing', () => {
      const renderer = createVisualizationRenderer({
        application,
        http,
        uiSettings,
        startDependencies: createStartDependencies(),
        stepsFromCurrentTurn: [toolCallStep],
        stepsFromPreviousTurns: [],
      });

      const element = renderer({ toolResultId: undefined });
      render(element);

      expect(screen.getByText(/Visualization missing tool-result-id/i)).toBeInTheDocument();
      expect(mockVisualizeESQL).not.toHaveBeenCalled();
    });

    it('returns a fallback when tool result cannot be found', () => {
      const renderer = createVisualizationRenderer({
        application,
        http,
        uiSettings,
        startDependencies: createStartDependencies(),
        stepsFromCurrentTurn: [toolCallStep],
        stepsFromPreviousTurns: [],
      });

      const element = renderer({ toolResultId: 'unknown-id' });
      render(element);

      const fallbackMessages = screen.getAllByText((_, elm) =>
        Boolean(
          elm?.textContent?.includes('Unable to find visualization for tool-result-id=unknown-id.')
        )
      );
      expect(fallbackMessages.length).toBeGreaterThan(0);
      expect(mockVisualizeESQL).not.toHaveBeenCalled();
    });

    it('returns a fallback when tool result lacks an ES|QL query', () => {
      const stepWithoutQuery = cloneDeep(toolCallStep) as ConversationRoundStep;
      setWith(stepWithoutQuery, 'results[0].data.query', undefined); // Remove the query

      const renderer = createVisualizationRenderer({
        application,
        http,
        uiSettings,
        startDependencies: createStartDependencies(),
        stepsFromCurrentTurn: [stepWithoutQuery],
        stepsFromPreviousTurns: [],
      });

      const element = renderer({ toolResultId: '6K4K' });
      render(element);

      expect(mockVisualizeESQL).not.toHaveBeenCalled();
      const fallbacks = screen.getAllByText((_, elm) =>
        Boolean(elm?.textContent?.includes('Unable to find esql query for tool-result-id=6K4K.'))
      );
      expect(fallbacks.length).toBeGreaterThan(0);
    });

    it('looks through previous rounds when current steps have no matching tool result', () => {
      const renderer = createVisualizationRenderer({
        application,
        http,
        uiSettings,
        startDependencies: createStartDependencies(),
        stepsFromCurrentTurn: [],
        stepsFromPreviousTurns: [toolCallStep],
      });

      const element = renderer({ toolResultId: '6K4K' });
      render(element);

      expect(mockVisualizeESQL).toHaveBeenCalledTimes(1);
    });

    it('passes the chartType as preferredChartType to VisualizeESQL', () => {
      const renderer = createVisualizationRenderer({
        application,
        http,
        uiSettings,
        startDependencies: createStartDependencies(),
        stepsFromCurrentTurn: [toolCallStep],
        stepsFromPreviousTurns: [],
      });

      const element = renderer({ toolResultId: '6K4K', chartType: ChartType.Line });
      render(element);

      expect(mockVisualizeESQL).toHaveBeenCalledTimes(1);
      const props = mockVisualizeESQL.mock.calls[0][0];
      expect(props).toMatchObject({
        esqlColumns: toolResult.data.columns,
        esqlQuery: toolResult.data.query,
        preferredChartType: 'Line',
      });
    });

    it('works without a chartType attribute', () => {
      const renderer = createVisualizationRenderer({
        application,
        http,
        uiSettings,
        startDependencies: createStartDependencies(),
        stepsFromCurrentTurn: [toolCallStep],
        stepsFromPreviousTurns: [],
      });

      const element = renderer({ toolResultId: '6K4K' });
      render(element);

      expect(mockVisualizeESQL).toHaveBeenCalledTimes(1);
      const props = mockVisualizeESQL.mock.calls[0][0];
      expect(props.preferredChartType).toBeUndefined();
    });
  });

  describe('<ChatMessageText />', () => {
    it('renders VisualizeESQL for visualization tags with matching tool results', () => {
      useStepsFromSavedTurnsMock.mockReturnValue([toolCallStep]);

      const content = 'Here is a visualization:\n<visualization tool-result-id="6K4K" />';
      render(<ChatMessageText content={content} steps={[toolCallStep]} />);

      expect(screen.getByTestId('visualize-esql')).toBeInTheDocument();
      const props = mockVisualizeESQL.mock.calls[0][0];
      expect(props).toEqual(
        expect.objectContaining({
          esqlColumns: toolResult.data.columns,
          esqlQuery: toolResult.data.query,
        })
      );
    });

    it('uses tool results from previous rounds when current steps are empty', () => {
      useStepsFromSavedTurnsMock.mockReturnValue([toolCallStep]);

      const content = 'Here is a visualization:\n<visualization tool-result-id="6K4K" />';
      render(<ChatMessageText content={content} steps={[]} />);

      expect(mockVisualizeESQL).toHaveBeenCalledTimes(1);
      const props = mockVisualizeESQL.mock.calls[0][0];
      expect(props).toEqual(
        expect.objectContaining({
          esqlColumns: toolResult.data.columns,
          esqlQuery: toolResult.data.query,
        })
      );
    });

    it('passes the chartType to VisualizeESQL', () => {
      useStepsFromSavedTurnsMock.mockReturnValue([]);

      const content =
        'Here is a visualization:\n<visualization tool-result-id="6K4K" chart-type="Area" />';
      render(<ChatMessageText content={content} steps={[toolCallStep]} />);

      expect(mockVisualizeESQL).toHaveBeenCalledTimes(1);
      const props = mockVisualizeESQL.mock.calls[0][0];
      expect(props).toEqual(
        expect.objectContaining({
          esqlColumns: toolResult.data.columns,
          esqlQuery: toolResult.data.query,
          preferredChartType: 'Area',
        })
      );
    });

    it('renders multiple visualizations with different chart types in a single message', () => {
      useStepsFromSavedTurnsMock.mockReturnValue([]);

      const content = `Line Chart
<visualization tool-result-id="6K4K" chart-type="Line" />

Bar Chart
<visualization tool-result-id="6K4K" chart-type="Bar" />

Area Chart
<visualization tool-result-id="6K4K" chart-type="Area" />`;

      render(<ChatMessageText content={content} steps={[toolCallStep]} />);

      expect(mockVisualizeESQL).toHaveBeenCalledTimes(3);

      // Check that each visualization received the correct chart type
      const callArgs = mockVisualizeESQL.mock.calls.map((call: any) => ({
        preferredChartType: call[0].preferredChartType,
      }));

      expect(callArgs).toContainEqual(expect.objectContaining({ preferredChartType: 'Line' }));
      expect(callArgs).toContainEqual(expect.objectContaining({ preferredChartType: 'Bar' }));
      expect(callArgs).toContainEqual(expect.objectContaining({ preferredChartType: 'Area' }));
    });

    describe('Tabular data', () => {
      const content = dedent`
        | Column 1 | Column 2 |
        | -------- | -------: |
        | Lorem    | ipsum    |
      `;

      it('uses scrollable EuiTable to render Markdown tables', () => {
        render(<ChatMessageText content={content} steps={[]} />);

        const table = screen.getByRole('table');
        expect(table).toBeInTheDocument();

        // This class is part of the stable API
        expect(table).toHaveClass('euiTable');

        // Confirms that the table is indeed scrollable without relying on EUI internals
        expect(table.parentElement).toHaveStyleRule('overflow-inline', 'auto');
      });

      it('applies min and max width to all cells', () => {
        render(<ChatMessageText content={content} steps={[]} />);

        const check = (cells: HTMLElement[]) => {
          for (const cell of cells) {
            expect(cell).toHaveStyle({
              'min-width': '10em',
              'max-width': '30em',
            });
          }
        };

        check(screen.getAllByRole('cell')); // Body cells (<td>)
        check(screen.getAllByRole('columnheader')); // Header cells (<th>)
      });

      it('passes parsed column settings to cells', () => {
        render(<ChatMessageText content={content} steps={[]} />);

        // Column 2 has a right alignment configured, which needs to be passed
        // to all cells within that column. This ensures the {...rest} props
        // are correctly passed down in the customized `th` and `td` render functions.
        expect(screen.getByText('Column 2').closest('th')).toHaveStyle('text-align: right');
        expect(screen.getByText('ipsum').closest('td')).toHaveStyle('text-align: right');
      });
    });

    describe('inline attachments', () => {
      const attachment = {
        id: 'a1',
        type: 'dashboard',
        versions: [
          {
            version: 1,
            created_at: '2024-01-01T10:00:00.000Z',
            data: {},
            content_hash: 'hash',
          },
        ],
        current_version: 1,
        active: true,
      } as VersionedAttachment;

      const renderReply = (content: string, isStreaming = false) =>
        render(
          <ChatMessageText
            content={content}
            steps={[toolCallStep]}
            conversationAttachments={[attachment]}
            conversationId="conversation-1"
            isStreaming={isStreaming}
          />
        );

      it('renders an attachment card outside the reply text styles', () => {
        renderReply('Here is the table.\n\n<render_attachment id="a1" />\n\nAnything else?');

        const card = screen.getByTestId('inline-attachment-card');
        expect(card.closest('.euiText')).toBeNull();
        expect(screen.getByText('Here is the table.').closest('.euiText')).not.toBeNull();
        expect(screen.getByText('Anything else?').closest('.euiText')).not.toBeNull();
        expect(screen.getAllByText(/Here is the table\./)).toHaveLength(1);
        expect(screen.getAllByText(/Anything else\?/)).toHaveLength(1);
      });

      it('leaves a tag inside a code block as text', () => {
        renderReply('```\n<render_attachment id="a1" />\n```');

        expect(screen.queryByTestId('inline-attachment-card')).not.toBeInTheDocument();
        expect(screen.getByText('<render_attachment id="a1" />')).toBeInTheDocument();
      });

      it('keeps a numbered list whole and renders the card after it', () => {
        renderReply('1. First\n2. See <render_attachment id="a1" /> here\n3. Third');

        const card = screen.getByTestId('inline-attachment-card');
        const list = screen.getByRole('list');
        const prose = list.closest('.euiText');
        expect(list).toHaveTextContent('First');
        expect(list).toHaveTextContent('See here');
        expect(list).toHaveTextContent('Third');
        expect(list.contains(card)).toBe(false);
        expect(card.previousElementSibling).toBe(prose?.parentElement);
        expect(card.previousElementSibling).toContainElement(list);
      });

      it('keeps the first markdown block mounted when the first attachment tag arrives', () => {
        const prose = 'Here is a visualization:\n<visualization tool-result-id="6K4K" />';
        const { rerender } = render(
          <ChatMessageText
            content={prose}
            steps={[toolCallStep]}
            conversationAttachments={[attachment]}
            conversationId="conversation-1"
          />
        );

        const markdownBlock = screen
          .getByTestId('visualize-esql')
          .closest('.euiText')?.parentElement;

        rerender(
          <ChatMessageText
            content={`${prose}\n\n<render_attachment id="a1" />`}
            steps={[toolCallStep]}
            conversationAttachments={[attachment]}
            conversationId="conversation-1"
          />
        );

        const card = screen.getByTestId('inline-attachment-card');
        const currentMarkdownBlock = screen
          .getByTestId('visualize-esql')
          .closest('.euiText')?.parentElement;
        expect(currentMarkdownBlock).toBe(markdownBlock);
        expect(card.previousElementSibling).toBe(markdownBlock);
      });

      it('keeps a visualization inside the reply text when an attachment is also present', () => {
        renderReply(
          'Here is a visualization:\n<visualization tool-result-id="6K4K" />\n\n<render_attachment id="a1" />'
        );

        const visualization = screen.getByTestId('visualize-esql');
        const card = screen.getByTestId('inline-attachment-card');
        expect(visualization.closest('.euiText')).not.toBeNull();
        expect(card.closest('.euiText')).toBeNull();
      });

      it('renders a loading skeleton outside the reply text while streaming', () => {
        renderReply('Before <render_attachment id="a1" /> after', true);

        const skeleton = screen.getByTestId('attachment-loading-skeleton');
        expect(skeleton.closest('.euiText')).toBeNull();
        expect(screen.queryByTestId('inline-attachment-card')).not.toBeInTheDocument();
        expect(screen.getAllByText(/Before/)).toHaveLength(1);
        expect(screen.getAllByText(/after/)).toHaveLength(1);
      });

      it('leaves an unfinished tag in the reply text', () => {
        renderReply('Before <render_attachment id="a1"');

        expect(screen.queryByTestId('attachment-loading-skeleton')).not.toBeInTheDocument();
        expect(screen.queryByTestId('inline-attachment-card')).not.toBeInTheDocument();
        expect(screen.getByText(/Before <render_attachment id="a1"/)).toBeInTheDocument();
      });

      it('renders no card or empty slot for a tag without an id', () => {
        renderReply('Hello <render_attachment version="1" />');

        expect(screen.queryByTestId('inline-attachment-card')).not.toBeInTheDocument();
        expect(screen.queryByTestId('attachment-loading-skeleton')).not.toBeInTheDocument();
        const prose = screen.getByText('Hello').closest('.euiText');
        const messageContainer = prose?.parentElement?.parentElement;
        expect(messageContainer?.childElementCount).toBe(1);
      });

      it('renders no card or empty slot when the attachment cannot be resolved', () => {
        render(
          <ChatMessageText
            content={'Hello <render_attachment id="a1" />'}
            steps={[]}
            conversationAttachments={[attachment]}
          />
        );

        expect(screen.queryByTestId('inline-attachment-card')).not.toBeInTheDocument();
        expect(screen.queryByTestId('attachment-loading-skeleton')).not.toBeInTheDocument();
        const prose = screen.getByText('Hello').closest('.euiText');
        const messageContainer = prose?.parentElement?.parentElement;
        expect(messageContainer?.childElementCount).toBe(1);
      });
    });
  });
});
