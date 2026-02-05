/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Node, Parent } from 'unist';
import { render, screen } from '@testing-library/react';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { AttachmentVersionRef } from '@kbn/agent-builder-common/attachments';
import type { ConversationRoundStep } from '@kbn/agent-builder-common';
import { ConversationRoundStepType } from '@kbn/agent-builder-common';
import {
  ToolResultType,
  type TabularDataResult,
} from '@kbn/agent-builder-common/tools/tool_result';
import unified from 'unified';
import remarkParse from 'remark-parse-no-trim';
import {
  createRenderAttachmentRenderer,
  renderAttachmentTagParser,
  visualizationTagParser,
  createVisualizationRenderer,
} from './markdown_plugins';
import { ChatMessageText } from './chat_message_text';
import { useAgentBuilderServices } from '../../../../hooks/use_agent_builder_service';
import { useStepsFromPrevRounds } from '../../../../hooks/use_conversation';
import { VisualizeESQL } from '../../../tools/esql/visualize_esql';
import type { AgentBuilderStartDependencies } from '../../../../../types';
import type { AttachmentsService } from '../../../../../services';

jest.mock('../../../../hooks/use_agent_builder_service', () => ({
  useAgentBuilderServices: jest.fn(),
}));

jest.mock('../../../../hooks/use_conversation', () => ({
  useStepsFromPrevRounds: jest.fn(),
}));

jest.mock('../../../tools/esql/visualize_esql', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const _React = require('react'); // Use require to avoid hoisting issues with jest.mock
  return {
    VisualizeESQL: jest.fn(() =>
      _React.createElement('span', { 'data-test-subj': 'visualize-esql' })
    ),
  };
});

const useAgentBuilderServicesMock = useAgentBuilderServices as jest.MockedFunction<
  typeof useAgentBuilderServices
>;
const useStepsFromPrevRoundsMock = useStepsFromPrevRounds as jest.MockedFunction<
  typeof useStepsFromPrevRounds
>;
const mockVisualizeESQL = VisualizeESQL as jest.MockedFunction<any>;

function createStartDependencies() {
  return {
    lens: {},
    dataViews: {},
    cloud: {},
    share: {},
    uiActions: {},
  } as AgentBuilderStartDependencies;
}

function getAST(markdown: string) {
  const processor = unified().use(remarkParse);
  const tree = processor.parse(markdown);
  return processor.runSync(tree) as Parent;
}

describe('chat_message_text', () => {
  const renderContentMock = jest.fn(() => (
    <span data-test-subj="attachment-rendered">Rendered attachment</span>
  ));
  const attachmentsGetRenderContentMock = jest.fn(() => renderContentMock);
  const attachmentsServiceMock = {
    getRenderContent: attachmentsGetRenderContentMock,
  } as unknown as AttachmentsService;
  const conversationAttachments: VersionedAttachment[] = [
    {
      id: 'attachment-1',
      type: 'visualization',
      versions: [
        {
          version: 1,
          data: { visualization: { foo: 'bar' } },
          created_at: '2024-01-01T00:00:00.000Z',
          content_hash: 'hash-1',
          estimated_tokens: 1,
        },
        {
          version: 2,
          data: { visualization: { foo: 'bar-v2' } },
          created_at: '2024-01-02T00:00:00.000Z',
          content_hash: 'hash-2',
          estimated_tokens: 1,
        },
      ],
      current_version: 2,
      active: true,
    },
  ];
  const attachmentRefs: AttachmentVersionRef[] = [{ attachment_id: 'attachment-1', version: 1 }];
  const toolResult: TabularDataResult = {
    tool_result_id: '6K4K',
    type: ToolResultType.tabularData,
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

  beforeEach(() => {
    renderContentMock.mockClear();
    mockVisualizeESQL.mockClear();
    attachmentsGetRenderContentMock.mockClear();
    useAgentBuilderServicesMock.mockReturnValue({
      agentService: {} as unknown,
      chatService: {},
      conversationsService: {},
      attachmentsService: attachmentsServiceMock,
      toolsService: {},
      docLinksService: {},
      navigationService: {},
      accessChecker: {},
      eventsService: {},
      startDependencies: createStartDependencies(),
    } as ReturnType<typeof useAgentBuilderServices>);
    useStepsFromPrevRoundsMock.mockReturnValue([]);
  });

  describe('renderAttachmentTagParser', () => {
    function recursivelyFindRenderAttachmentNodes(node: Node | Parent, nodes: Node[] = []) {
      if (node.children) {
        const parent = node as Parent;
        parent.children.forEach((child) => recursivelyFindRenderAttachmentNodes(child, nodes));
      }

      if (node.type === 'render_attachment') {
        nodes.push(node);
      }

      return nodes;
    }

    function getRenderAttachmentNodes(markdown: string) {
      const tree = getAST(markdown);
      renderAttachmentTagParser()(tree);
      return recursivelyFindRenderAttachmentNodes(tree);
    }

    it('converts render_attachment HTML nodes into render_attachment elements', () => {
      const attachmentId = 'abcd';
      const markdown = `Here is an attachment:\n<render_attachment id="${attachmentId}" />`;
      const nodes = getRenderAttachmentNodes(markdown);

      expect(nodes).toHaveLength(1);
      expect(nodes[0].attachmentId).toBe(attachmentId);
    });

    it('sets attachmentId to undefined when the attribute is missing', () => {
      const markdown = 'Missing attribute test\n<render_attachment />';
      const nodes = getRenderAttachmentNodes(markdown);

      expect(nodes).toHaveLength(1);
      expect(nodes[0].attachmentId).toBeUndefined();
    });

    it('supports multiple render_attachment tags in a single markdown', () => {
      const markdown = `Multiple attachments\n<render_attachment id="first" />\nMore text
<render_attachment id="second" />`;
      const nodes = getRenderAttachmentNodes(markdown);

      expect(nodes).toHaveLength(2);
      const ids = nodes.map((node) => node.attachmentId);
      expect(ids).toEqual(['first', 'second']);
    });

    it('supports multiple render_attachment tags without any text', () => {
      const markdown = `<render_attachment id="first" />\n<render_attachment id="second" />`;
      const nodes = getRenderAttachmentNodes(markdown);

      expect(nodes).toHaveLength(2);
      const ids = nodes.map((node) => node.attachmentId);
      expect(ids).toEqual(['first', 'second']);
    });

    it('handles mixed-case render_attachment tags', () => {
      const markdown = 'Case insensitive\n<RENDER_ATTACHMENT id="cased" />';
      const nodes = getRenderAttachmentNodes(markdown);

      expect(nodes).toHaveLength(1);
      expect(nodes[0].attachmentId).toBe('cased');
    });

    it('captures version attribute when present', () => {
      const markdown = 'With version\n<render_attachment id="cased" version="2" />';
      const nodes = getRenderAttachmentNodes(markdown);

      expect(nodes).toHaveLength(1);
      expect(nodes[0].attachmentId).toBe('cased');
      expect(nodes[0].attachmentVersion).toBe('2');
    });
  });

  describe('visualizationTagParser', () => {
    function recursivelyFindVisualizationNodes(node: Node | Parent, nodes: Node[] = []) {
      if (node.children) {
        const parent = node as Parent;
        parent.children.forEach((child) => recursivelyFindVisualizationNodes(child, nodes));
      }

      if (node.type === 'visualization') {
        nodes.push(node);
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
  });

  describe('createRenderAttachmentRenderer', () => {
    it('returns a fallback when attachmentId is missing', () => {
      const renderer = createRenderAttachmentRenderer({
        attachmentsService: attachmentsServiceMock,
        conversationAttachments,
        attachmentRefs,
      });

      const element = renderer({ attachmentId: undefined });
      render(element);

      expect(screen.getByText(/Attachment missing id/i)).toBeInTheDocument();
    });

    it('renders attachment content using the attachment renderer', () => {
      const renderer = createRenderAttachmentRenderer({
        attachmentsService: attachmentsServiceMock,
        conversationAttachments,
        attachmentRefs,
      });

      const element = renderer({ attachmentId: 'attachment-1' });
      render(element);

      expect(screen.getByTestId('attachment-rendered')).toBeInTheDocument();
      expect(attachmentsServiceMock.getRenderContent).toHaveBeenCalledWith('visualization');
    });

    it('returns a fallback when attachment cannot be found', () => {
      const renderer = createRenderAttachmentRenderer({
        attachmentsService: attachmentsServiceMock,
        conversationAttachments,
        attachmentRefs,
      });

      const element = renderer({ attachmentId: 'missing' });
      render(element);

      expect(screen.getByText(/Unable to find attachment/i)).toBeInTheDocument();
    });
  });

  describe('createVisualizationRenderer', () => {
    it('renders VisualizeESQL for tabular data tool results', () => {
      const renderer = createVisualizationRenderer({
        startDependencies: createStartDependencies(),
        stepsFromCurrentRound: [toolCallStep],
        stepsFromPrevRounds: [],
      });

      const element = renderer({ toolResultId: '6K4K' });
      render(element);

      expect(mockVisualizeESQL).toHaveBeenCalledTimes(1);
    });
  });

  describe('<ChatMessageText />', () => {
    it('renders render_attachment tags with attachment content', () => {
      const content = 'Here is an attachment:\n<render_attachment id="attachment-1" />';
      render(
        <ChatMessageText
          content={content}
          steps={[]}
          conversationAttachments={conversationAttachments}
          attachmentRefs={attachmentRefs}
        />
      );

      expect(screen.getByTestId('attachment-rendered')).toBeInTheDocument();
    });

    it('uses the attachment ref version when no version attribute is provided', () => {
      const content = 'Here is an attachment:\n<render_attachment id="attachment-1" />';
      render(
        <ChatMessageText
          content={content}
          steps={[]}
          conversationAttachments={conversationAttachments}
          attachmentRefs={attachmentRefs}
        />
      );

      const props = (renderContentMock.mock.calls as unknown as Array<[any]>)[0][0];
      expect(props.version.version).toBe(1);
    });

    it('uses the explicit version attribute when provided', () => {
      const content = 'Here is an attachment:\n<render_attachment id="attachment-1" version="2" />';
      render(
        <ChatMessageText
          content={content}
          steps={[]}
          conversationAttachments={conversationAttachments}
          attachmentRefs={attachmentRefs}
        />
      );

      const props = (renderContentMock.mock.calls as unknown as Array<[any]>)[0][0];
      expect(props.version.version).toBe(2);
    });

    it('renders visualization tags with tabular data tool results', () => {
      const content = 'Here is a visualization:\n<visualization tool-result-id="6K4K" />';
      render(<ChatMessageText content={content} steps={[toolCallStep]} />);

      expect(screen.getByTestId('visualize-esql')).toBeInTheDocument();
    });
  });
});
