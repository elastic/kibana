/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { IconType } from '@elastic/eui';
import {
  EuiAccordion,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiMarkdownFormat,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { Edge, Node, NodeProps } from '@xyflow/react';
import { Controls, Handle, MarkerType, Position, ReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { InvestigationComponentDiagram } from '../../../common/component_diagram/component_diagram';
import {
  parseMermaidFlowchart,
  type FlowchartNodeShape,
} from '../../../common/component_diagram/parse_mermaid_flowchart';
import type {
  InvestigationAttachmentContentProps,
  InvestigationAttachmentVariant,
} from '../../investigation_attachments';
import { layoutComponentDiagram, type ComponentNodeLayout } from './layout_component_diagram';

const SOURCE_LABEL = i18n.translate('xpack.agenticInvestigations.componentDiagram.source', {
  defaultMessage: 'Mermaid source',
});

const UNREADABLE = i18n.translate('xpack.agenticInvestigations.componentDiagram.unreadable', {
  defaultMessage: 'This diagram cannot be drawn. Its Mermaid source is shown instead.',
});

const PROBLEM_LABEL = i18n.translate('xpack.agenticInvestigations.componentDiagram.problem', {
  defaultMessage: 'Problem',
});

const SHAPE_ICONS: Partial<Record<FlowchartNodeShape, IconType>> = {
  database: 'database',
  diamond: 'branch',
  stadium: 'globe',
  subroutine: 'package',
  hexagon: 'gear',
};

const ROUNDED_SHAPES: ReadonlySet<FlowchartNodeShape> = new Set(['rounded', 'stadium', 'circle']);

interface ComponentNodeData extends Record<string, unknown> {
  layout: ComponentNodeLayout;
  horizontal: boolean;
}

type ComponentFlowNode = Node<ComponentNodeData, 'component'>;

const ComponentNode = ({ data: { layout, horizontal } }: NodeProps<ComponentFlowNode>) => {
  const { euiTheme } = useEuiTheme();
  const { node, isProblem, width, height } = layout;
  const icon = isProblem ? 'warning' : SHAPE_ICONS[node.shape];
  const handleStyle = { opacity: 0, pointerEvents: 'none' as const };
  return (
    <div
      data-test-subj={`investigationComponentDiagramNode-${node.id}`}
      data-problem={isProblem}
      title={isProblem ? `${node.label} (${PROBLEM_LABEL})` : node.label}
      css={css`
        box-sizing: border-box;
        width: ${width}px;
        height: ${height}px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding: ${euiTheme.size.xs} ${euiTheme.size.s};
        border: ${isProblem ? euiTheme.border.width.thick : euiTheme.border.width.thin} solid
          ${isProblem ? euiTheme.colors.borderStrongDanger : euiTheme.colors.borderBasePlain};
        border-radius: ${ROUNDED_SHAPES.has(node.shape) ? height / 2 : 6}px;
        background: ${isProblem
          ? euiTheme.colors.backgroundLightDanger
          : euiTheme.colors.backgroundBasePlain};
        text-align: center;
      `}
    >
      <Handle
        type="target"
        position={horizontal ? Position.Left : Position.Top}
        style={handleStyle}
      />
      <EuiFlexGroup gutterSize="xs" alignItems="center" justifyContent="center" responsive={false}>
        {icon && (
          <EuiFlexItem grow={false}>
            <EuiIcon
              type={icon}
              size="s"
              color={isProblem ? 'danger' : 'subdued'}
              aria-hidden={true}
            />
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false} css={{ minWidth: 0 }}>
          <EuiText size="xs" color={isProblem ? 'danger' : 'default'}>
            <strong css={{ whiteSpace: 'pre-line', wordBreak: 'break-word' }}>{node.label}</strong>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      {node.group && (
        <EuiText size="xs" color="subdued">
          <span>{node.group}</span>
        </EuiText>
      )}
      <Handle
        type="source"
        position={horizontal ? Position.Right : Position.Bottom}
        style={handleStyle}
      />
    </div>
  );
};

const nodeTypes = { component: ComponentNode };

/** The diagram drawn from its Mermaid source: problem nodes and their edges in danger colors. */
export const ComponentDiagramGraph: React.FC<{
  mermaid: string;
  problemNodeIds: readonly string[];
  height: number;
}> = ({ mermaid, problemNodeIds, height }) => {
  const { euiTheme } = useEuiTheme();
  const layout = useMemo(() => {
    const chart = parseMermaidFlowchart(mermaid);
    return chart && chart.nodes.length > 0
      ? layoutComponentDiagram(chart, problemNodeIds)
      : undefined;
  }, [mermaid, problemNodeIds]);

  const { nodes, edges } = useMemo((): { nodes: ComponentFlowNode[]; edges: Edge[] } => {
    if (!layout) {
      return { nodes: [], edges: [] };
    }
    return {
      nodes: layout.nodes.map((nodeLayout) => ({
        id: nodeLayout.node.id,
        type: 'component',
        position: { x: nodeLayout.x, y: nodeLayout.y },
        width: nodeLayout.width,
        height: nodeLayout.height,
        data: { layout: nodeLayout, horizontal: layout.horizontal },
        draggable: false,
        connectable: false,
        selectable: false,
      })),
      edges: layout.edges.map(({ id, edge, touchesProblem }) => {
        const color = touchesProblem ? euiTheme.colors.danger : euiTheme.colors.borderBaseProminent;
        const marker = { type: MarkerType.ArrowClosed, color, width: 16, height: 16 };
        return {
          id,
          source: edge.source,
          target: edge.target,
          label: edge.label,
          animated: edge.dotted && touchesProblem,
          style: {
            stroke: color,
            strokeWidth: edge.thick ? 3 : 1.5,
            ...(edge.dotted && { strokeDasharray: '6 4' }),
          },
          labelStyle: { fontSize: 11, fill: euiTheme.colors.textParagraph },
          labelBgStyle: { fill: euiTheme.colors.backgroundBasePlain },
          labelBgPadding: [4, 2] as [number, number],
          ...(edge.arrow !== 'none' && { markerEnd: marker }),
          ...(edge.arrow === 'both' && { markerStart: marker }),
        };
      }),
    };
  }, [layout, euiTheme]);

  if (!layout) {
    return (
      <>
        <EuiText size="s" color="subdued" data-test-subj="investigationComponentDiagramUnreadable">
          <p>{UNREADABLE}</p>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiCodeBlock fontSize="s" paddingSize="s" isCopyable>
          {mermaid}
        </EuiCodeBlock>
      </>
    );
  }

  return (
    <div
      data-test-subj="investigationComponentDiagramGraph"
      css={css`
        height: ${height}px;
        border: ${euiTheme.border.thin};
        border-radius: ${euiTheme.border.radius.medium};
        background: ${euiTheme.colors.backgroundBaseSubdued};
      `}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.1 }}
        minZoom={0.2}
        maxZoom={2}
        nodesDraggable={false}
        nodesConnectable={false}
        nodesFocusable={false}
        edgesFocusable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
};

/**
 * The components an investigation was about and how they interact, drawn from the agent's
 * Mermaid flowchart, with the problem nodes highlighted and the problem described under it.
 */
export const ComponentDiagramContent: React.FC<{
  diagram: Pick<InvestigationComponentDiagram, 'title' | 'mermaid' | 'description'> & {
    problemNodeIds?: readonly string[];
  };
  variant: InvestigationAttachmentVariant;
}> = ({ diagram: { mermaid, problemNodeIds = [], description }, variant }) => {
  const accordionId = useGeneratedHtmlId({ prefix: 'investigationComponentDiagramSource' });
  const isDetails = variant === 'details';
  return (
    <div data-test-subj="investigationComponentDiagram">
      <ComponentDiagramGraph
        mermaid={mermaid}
        problemNodeIds={problemNodeIds}
        height={isDetails ? 460 : 280}
      />
      {description?.trim() && (
        <>
          <EuiSpacer size="m" />
          <EuiPanel color="danger" hasShadow={false} paddingSize="s">
            <EuiMarkdownFormat textSize="s">{description}</EuiMarkdownFormat>
          </EuiPanel>
        </>
      )}
      {isDetails && (
        <>
          <EuiSpacer size="m" />
          <EuiAccordion
            id={accordionId}
            buttonContent={
              <EuiText size="xs">
                <span>{SOURCE_LABEL}</span>
              </EuiText>
            }
            paddingSize="s"
            data-test-subj="investigationComponentDiagramSource"
          >
            <EuiCodeBlock fontSize="s" paddingSize="s" isCopyable>
              {mermaid}
            </EuiCodeBlock>
          </EuiAccordion>
        </>
      )}
    </div>
  );
};

export const ComponentDiagramView: React.FC<
  InvestigationAttachmentContentProps<InvestigationComponentDiagram>
> = ({ document, variant }) => <ComponentDiagramContent diagram={document} variant={variant} />;
