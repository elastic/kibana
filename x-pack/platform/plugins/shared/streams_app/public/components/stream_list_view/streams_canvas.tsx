/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  createContext,
  memo,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Background,
  BaseEdge,
  ConnectionLineType,
  Controls,
  EdgeLabelRenderer,
  getNodesBounds,
  getSmoothStepPath,
  Handle,
  MarkerType,
  Position,
  reconnectEdge,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodeConnections,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeProps,
  type EdgeTypes,
  type FinalConnectionState,
  type IsValidConnection,
  type Node,
  type NodeProps,
  type NodeTypes,
  type OnConnectStart,
  type ReactFlowInstance,
  type XYPosition,
} from '@xyflow/react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiButtonIcon,
  EuiFieldSearch,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { IconType } from '@elastic/eui';
import { css, keyframes } from '@emotion/css';
import { i18n } from '@kbn/i18n';

import { SelectCursorIcon } from './select_cursor_icon';
import { PipelineNodeIcon } from './pipeline_node_icon';
import { DestinationFlyout } from './destination_flyout';
import { SourceFlyout } from './source_flyout';
import { PipelineFlyout } from './pipeline_flyout';
import { CreateRoutingFlyout } from './create_routing_flyout';
import { StreamsListTableTools } from './streams_list_table_tools';
import { STREAMS_TABLE_SEARCH_ARIA_LABEL } from './translations';

import '@xyflow/react/dist/style.css';

type CanvasNodeType = 'source' | 'destination';

const DRAG_DATA_TYPE = 'application/streams-canvas-node';

// The node-type pairs an edge may connect, as [sourceType, targetType]:
//   - source → pipeline      (a pipeline transforms data in transit)
//   - pipeline → destination
//   - source → destination   (direct, no pipeline)
//   - destination → destination (a destination's routing node feeding another)
//   - destination → pipeline  (a destination's routing node feeding a pipeline
//                              that precedes another destination)
//   - routing → destination  (an inline routing node's branch feeding a destination)
//   - routing → pipeline      (an inline routing node's branch feeding a pipeline
//                              that precedes another destination)
const ALLOWED_CONNECTIONS: ReadonlyArray<readonly [string, string]> = [
  ['source', 'pipeline'],
  ['pipeline', 'destination'],
  ['source', 'destination'],
  ['destination', 'destination'],
  ['destination', 'pipeline'],
  ['routing', 'destination'],
  ['routing', 'pipeline'],
];

// Target node types a connector starting from the given source type may land on.
function allowedTargetTypesFor(sourceType: string | undefined): string[] {
  if (!sourceType) {
    return [];
  }
  return ALLOWED_CONNECTIONS.filter(([from]) => from === sourceType).map(([, to]) => to);
}

// Source node types that may feed into the given target type (the inverse of
// allowedTargetTypesFor; used when the tail/source end of a connector is dragged).
function allowedSourceTypesFor(targetType: string | undefined): string[] {
  if (!targetType) {
    return [];
  }
  return ALLOWED_CONNECTIONS.filter(([, to]) => to === targetType).map(([from]) => from);
}

// The id of the routing endpoint node that a dangling routing edge ends at, if any.
function danglingEndpointIdOf(edge: Pick<Edge, 'data'>): string | undefined {
  return edge.data?.routingEndpointNodeId as string | undefined;
}

const noop = () => {};

// Lets dynamically-created nodes and edges open the shared flyouts without
// threading a callback through every node's/edge's data object.
const DestinationFlyoutContext = createContext<(destinationName: string) => void>(noop);
const SourceFlyoutContext = createContext<(sourceName: string) => void>(noop);
const PipelineFlyoutContext = createContext<(edgeId: string) => void>(noop);
// Opens the routing flyout for a routing condition triggered from a connector's
// "Add step" menu. Applying it splices a routing node into that edge (mirroring
// the pipeline-on-edge flow).
const EdgeRoutingFlyoutContext = createContext<(edgeId: string) => void>(noop);

interface SourceNodeData {
  title: string;
  subtitle: string;
  rate: string;
  [key: string]: unknown;
}

type DestinationMode = 'unconfigured' | 'configuring' | 'configured';
type DestinationStorage = 'local' | 'external';

interface DestinationNodeData {
  title: string;
  mode: DestinationMode;
  meta?: string;
  status?: string;
  storage?: DestinationStorage;
  [key: string]: unknown;
}

interface PipelineNodeData {
  title: string;
  /** Throughput shown in the hover stats card, e.g. "3.8k eps". */
  eps?: string;
  /** Processing latency shown in the hover stats card, e.g. "190ms". */
  latency?: string;
  [key: string]: unknown;
}

interface RoutingNodeData {
  [key: string]: unknown;
}

type SourceFlowNode = Node<SourceNodeData, 'source'>;
type DestinationFlowNode = Node<DestinationNodeData, 'destination'>;
type PipelineFlowNode = Node<PipelineNodeData, 'pipeline'>;
type RoutingFlowNode = Node<RoutingNodeData, 'routing'>;

const hiddenHandleClassName = css`
  visibility: hidden;
`;

// Connection anchors (the small circles at the ends of connectors, matching the
// product reference). The anchor markup lives on ReactFlow handles so it doubles
// as the connect/reconnect hit target.
//
// The handle ELEMENT is kept tiny at rest so it doesn't intercept clicks on the
// node, while the visible dot is drawn with an ::after pseudo-element centered on
// the handle's anchor point. This lets the canvas expand the handle to cover the
// whole node *while a connection is being dragged* (see connectingHighlight
// className) — making the entire node a forgiving drop target — without the dot
// moving or the handle blocking clicks the rest of the time.
//
// States:
//   - rest: a subtle grey dot, so the connection point is discoverable.
//   - magnetized (`connectingto.valid`): a filled primary dot with a ring — the
//     cursor has snapped to this anchor and releasing will connect here.
const ANCHOR_DOT_SIZE = 9;
function useAnchorHandleClassName() {
  const { euiTheme } = useEuiTheme();
  return css`
    width: ${ANCHOR_DOT_SIZE}px;
    height: ${ANCHOR_DOT_SIZE}px;
    min-width: ${ANCHOR_DOT_SIZE}px;
    min-height: ${ANCHOR_DOT_SIZE}px;
    background: transparent;
    border: none;

    &::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: ${ANCHOR_DOT_SIZE}px;
      height: ${ANCHOR_DOT_SIZE}px;
      transform: translate(-50%, -50%);
      background-color: ${euiTheme.colors.backgroundBasePlain};
      border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.mediumShade};
      border-radius: 50%;
      transition: background-color 80ms ease-out, border-color 80ms ease-out,
        box-shadow 80ms ease-out;
    }

    &.connectingto.valid::after {
      background-color: ${euiTheme.colors.primary};
      border-color: ${euiTheme.colors.primary};
      box-shadow: 0 0 0 3px ${euiTheme.colors.backgroundBasePrimary},
        0 0 0 5px ${euiTheme.colors.primary};
    }
  `;
}

const inflate = keyframes`
  from {
    opacity: 0;
    transform: scale(0.6);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;

const inflateClassName = css`
  animation: ${inflate} 180ms ease-out;
  transform-origin: center center;
`;

function SourceNodeContents({ data, onClick }: { data: SourceNodeData; onClick?: () => void }) {
  const { euiTheme } = useEuiTheme();
  const isClickable = Boolean(onClick);
  return (
    <EuiPanel
      element={isClickable ? 'button' : 'div'}
      hasShadow
      paddingSize="m"
      onClick={
        isClickable
          ? (event: React.MouseEvent) => {
              event.stopPropagation();
              onClick?.();
            }
          : undefined
      }
      className={`${isClickable ? 'nodrag' : ''} ${css`
        display: flex;
        flex-direction: column;
        gap: ${euiTheme.size.xs};
        width: 204px;
        text-align: left;
        ${isClickable ? 'cursor: pointer;' : ''}
        border-radius: ${euiTheme.border.radius.medium};
      `}`}
    >
      <div
        className={css`
          display: flex;
          flex-direction: column;
        `}
      >
        <EuiText
          size="xs"
          className={css`
            font-weight: ${euiTheme.font.weight.semiBold};
            color: ${euiTheme.colors.textParagraph};
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          `}
        >
          {data.title}
        </EuiText>
        <EuiText size="xs" color="subdued">
          {data.subtitle}
        </EuiText>
      </div>
      <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {data.rate}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiHealth color="success">
            <EuiText size="xs">
              {i18n.translate('xpack.streams.streamsCanvas.healthy', {
                defaultMessage: 'Healthy',
              })}
            </EuiText>
          </EuiHealth>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}

const SourceNode = memo(({ data }: NodeProps<SourceFlowNode>) => {
  const openFlyout = useContext(SourceFlyoutContext);
  const anchorHandleClassName = useAnchorHandleClassName();
  return (
    <div className={inflateClassName}>
      <Handle type="target" position={Position.Left} className={hiddenHandleClassName} />
      <SourceNodeContents data={data} onClick={() => openFlyout(data.title)} />
      <Handle type="source" position={Position.Right} className={anchorHandleClassName} />
    </div>
  );
});
SourceNode.displayName = 'SourceNode';

function DestinationTitle({ title, icon }: { title: string; icon: string }) {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon type={icon} size="s" />
      </EuiFlexItem>
      <EuiFlexItem
        className={css`
          min-width: 0;
        `}
      >
        <EuiText
          size="xs"
          className={css`
            font-weight: ${euiTheme.font.weight.semiBold};
            color: ${euiTheme.colors.textParagraph};
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          `}
        >
          {title}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function BorderedShell({
  children,
  className,
  tone = 'danger',
  hasShadow = false,
}: {
  children: React.ReactNode;
  className?: string;
  tone?: 'danger' | 'subdued';
  hasShadow?: boolean;
}) {
  const { euiTheme } = useEuiTheme();
  const borderColor = tone === 'danger' ? euiTheme.colors.danger : euiTheme.colors.borderBaseSubdued;
  return (
    <EuiPanel
      hasShadow={hasShadow}
      paddingSize="none"
      className={`${css`
        display: flex;
        align-items: stretch;
        gap: ${euiTheme.size.xxs};
        padding: ${euiTheme.size.xs} ${euiTheme.size.xs} ${euiTheme.size.xs} ${euiTheme.size.s};
        background-color: ${euiTheme.colors.backgroundBaseSubdued};
        border: ${euiTheme.border.width.thin} solid ${borderColor};
        border-radius: ${euiTheme.border.radius.medium};
      `} ${className ?? ''}`}
    >
      {children}
    </EuiPanel>
  );
}

function UnconfiguredDestinationContents({
  data,
  onClick,
}: {
  data: DestinationNodeData;
  onClick: () => void;
}) {
  const { euiTheme } = useEuiTheme();
  return (
    <BorderedShell>
      <EuiPanel
        element="button"
        hasShadow={false}
        hasBorder
        paddingSize="s"
        onClick={(event) => {
          event.stopPropagation();
          onClick();
        }}
        className={`nodrag ${css`
          min-width: 140px;
          cursor: pointer;
          border-radius: ${euiTheme.border.radius.medium};
        `}`}
      >
        <DestinationTitle title={data.title} icon="dashedCircle" />
        <EuiText size="xs" color="subdued" textAlign="center">
          {i18n.translate('xpack.streams.streamsCanvas.clickToConfigure', {
            defaultMessage: 'Click to configure',
          })}
        </EuiText>
      </EuiPanel>
    </BorderedShell>
  );
}

const STORAGE_OPTIONS = [
  {
    id: 'local',
    label: i18n.translate('xpack.streams.streamsCanvas.storageLocal', {
      defaultMessage: 'Local Elasticsearch',
    }),
  },
  {
    id: 'external',
    label: i18n.translate('xpack.streams.streamsCanvas.storageExternal', {
      defaultMessage: 'External storage',
    }),
  },
];

function ConfiguringDestinationContents({
  data,
  onCancel,
  onSave,
  onDelete,
}: {
  data: DestinationNodeData;
  onCancel: () => void;
  onSave: (name: string) => void;
  onDelete: () => void;
}) {
  const { euiTheme } = useEuiTheme();
  const [name, setName] = useState(data.title === NEW_DESTINATION_TITLE ? '' : data.title);
  const [storage, setStorage] = useState<DestinationStorage>(data.storage ?? 'local');
  const storageGroupId = useGeneratedHtmlId({ prefix: 'destinationStorage' });

  // Prevent React Flow from panning/selecting while interacting with the form.
  const stop = (event: React.SyntheticEvent) => event.stopPropagation();

  return (
    <BorderedShell
      className={css`
        width: 366px;
        flex-shrink: 0;
        align-items: flex-start;
      `}
    >
      <EuiPanel
        hasShadow={false}
        hasBorder
        paddingSize="s"
        className={`nodrag nopan ${css`
          flex: 1 1 0;
          min-width: 0;
          border-radius: ${euiTheme.border.radius.medium};
        `}`}
        onClick={stop}
        onMouseDown={stop}
      >
        <DestinationTitle title={data.title} icon="dashedCircle" />
        <EuiSpacer size="m" />
        <EuiButtonGroup
          legend={i18n.translate('xpack.streams.streamsCanvas.storageLegend', {
            defaultMessage: 'Destination storage',
          })}
          options={STORAGE_OPTIONS}
          idSelected={storage}
          onChange={(id) => setStorage(id as DestinationStorage)}
          buttonSize="compressed"
          isFullWidth
          name={storageGroupId}
        />
        <EuiSpacer size="m" />
        <EuiFieldText
          compressed
          fullWidth
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={i18n.translate('xpack.streams.streamsCanvas.namePlaceholder', {
            defaultMessage: 'foo.bar',
          })}
          aria-label={i18n.translate('xpack.streams.streamsCanvas.nameAriaLabel', {
            defaultMessage: 'Destination name',
          })}
        />
        <EuiSpacer size="xs" />
        <EuiText size="xs" color="subdued">
          {i18n.translate('xpack.streams.streamsCanvas.nameHelpText', {
            defaultMessage:
              'Name your destination or leave to be renamed when connected to a source. This can\u2019t be changed.',
          })}
        </EuiText>
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="trash"
              color="danger"
              display="base"
              onClick={onDelete}
              aria-label={i18n.translate('xpack.streams.streamsCanvas.deleteDestination', {
                defaultMessage: 'Delete destination',
              })}
            />
          </EuiFlexItem>
          <EuiFlexItem />
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty size="s" color="text" onClick={onCancel}>
              {i18n.translate('xpack.streams.streamsCanvas.cancel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton size="s" fill onClick={() => onSave(name)}>
              {i18n.translate('xpack.streams.streamsCanvas.save', {
                defaultMessage: 'Save',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </BorderedShell>
  );
}

function ConfiguredDestinationContents({
  data,
  isConnected,
  onClick,
}: {
  data: DestinationNodeData;
  isConnected: boolean;
  onClick?: () => void;
}) {
  const { euiTheme } = useEuiTheme();
  const isClickable = Boolean(onClick);
  return (
    <BorderedShell
      tone="subdued"
      hasShadow
      className={css`
        min-width: 211px;
      `}
    >
      <EuiPanel
        element={isClickable ? 'button' : 'div'}
        hasShadow={false}
        hasBorder
        paddingSize="s"
        onClick={
          isClickable
            ? (event: React.MouseEvent) => {
                event.stopPropagation();
                onClick?.();
              }
            : undefined
        }
        className={`${isClickable ? 'nodrag' : ''} ${css`
          flex: 1 1 0;
          min-width: 0;
          text-align: left;
          ${isClickable ? 'cursor: pointer;' : ''}
          border-radius: ${euiTheme.border.radius.medium};
        `}`}
      >
        <DestinationTitle title={data.title} icon="package" />
        {isConnected ? (
          <EuiFlexGroup
            gutterSize="s"
            alignItems="center"
            responsive={false}
            justifyContent="spaceBetween"
          >
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {data.meta}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color="success">{data.status}</EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.streams.streamsCanvas.dataNotFlowingIn', {
              defaultMessage: 'Data not flowing in',
            })}
          </EuiText>
        )}
      </EuiPanel>
    </BorderedShell>
  );
}

const DestinationNode = memo(({ id, data }: NodeProps<DestinationFlowNode>) => {
  const { setNodes, deleteElements } = useReactFlow();
  const openFlyout = useContext(DestinationFlyoutContext);
  const anchorHandleClassName = useAnchorHandleClassName();

  // A destination is "connected to a source" once an incoming (target) edge exists.
  // Until then it stays editable: clicking it re-opens the configuration card.
  const incomingConnections = useNodeConnections({ handleType: 'target' });
  const isConnectedToSource = incomingConnections.length > 0;

  const updateData = useCallback(
    (patch: Partial<DestinationNodeData>) => {
      setNodes((current) =>
        current.map((node) =>
          node.id === id ? { ...node, data: { ...node.data, ...patch } } : node
        )
      );
    },
    [id, setNodes]
  );

  const startConfiguring = useCallback(() => {
    updateData({ mode: 'configuring' });
  }, [updateData]);

  const cancelConfiguring = useCallback(() => {
    updateData({ ...unconfiguredDestinationData() });
  }, [updateData]);

  const save = useCallback(
    (name: string) => {
      updateData({ ...configuredDestinationData(name) });
    },
    [updateData]
  );

  const remove = useCallback(() => {
    deleteElements({ nodes: [{ id }] });
  }, [deleteElements, id]);

  return (
    <div className={inflateClassName}>
      <Handle type="target" position={Position.Left} className={anchorHandleClassName} />
      {data.mode === 'configured' ? (
        <ConfiguredDestinationContents
          data={data}
          isConnected={isConnectedToSource}
          onClick={isConnectedToSource ? () => openFlyout(data.title) : startConfiguring}
        />
      ) : data.mode === 'configuring' ? (
        <ConfiguringDestinationContents
          data={data}
          onCancel={cancelConfiguring}
          onSave={save}
          onDelete={remove}
        />
      ) : (
        <UnconfiguredDestinationContents data={data} onClick={startConfiguring} />
      )}
      {/*
        Legacy default source handle kept for layout compatibility. The routing
        handle above is the real output anchor, so this one is non-interactive to
        avoid two overlapping connectable points on the right edge.
      */}
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={false}
        className={hiddenHandleClassName}
      />
    </div>
  );
});
DestinationNode.displayName = 'DestinationNode';

function PipelineNodeContents({ data }: { data: PipelineNodeData }) {
  const { euiTheme } = useEuiTheme();

  const stats = [data.eps, data.latency].filter(Boolean).join('・');

  // The "Big" pipeline node from the design: a horizontal card that always shows
  // the pipeline icon alongside its name and throughput/latency stats.
  return (
    <EuiPanel
      hasShadow
      paddingSize="none"
      className={css`
        display: flex;
        gap: ${euiTheme.size.s};
        align-items: center;
        justify-content: center;
        width: 120px;
        min-width: 120px;
        padding: 6px ${euiTheme.size.s};
        border-radius: ${euiTheme.border.radius.small};
      `}
    >
      <EuiIcon type={PipelineNodeIcon} size="s" color={euiTheme.colors.textParagraph} />
      <div
        className={css`
          display: flex;
          flex: 1 0 0;
          min-width: 0;
          flex-direction: column;
          align-items: flex-start;
          white-space: nowrap;
        `}
      >
        <EuiText
          className={css`
            font-size: 10.5px;
            line-height: 16px;
            color: ${euiTheme.colors.textParagraph};
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 100%;
          `}
        >
          {data.title}
        </EuiText>
        {stats ? (
          <EuiText
            className={css`
              font-size: 9px;
              line-height: 12px;
              color: ${euiTheme.colors.textSubdued};
            `}
          >
            {stats}
          </EuiText>
        ) : null}
      </div>
    </EuiPanel>
  );
}

const PipelineNode = memo(({ data }: NodeProps<PipelineFlowNode>) => {
  const anchorHandleClassName = useAnchorHandleClassName();
  return (
    <div className={inflateClassName}>
      <Handle type="target" position={Position.Left} className={anchorHandleClassName} />
      <PipelineNodeContents data={data} />
      <Handle type="source" position={Position.Right} className={anchorHandleClassName} />
    </div>
  );
});
PipelineNode.displayName = 'PipelineNode';

// A routing node placed inline on a connector (created by applying a routing
// condition from the connector's "Add step" menu). It mirrors the small inline
// pipeline node — a white, subtly bordered panel with a shadow — but carries a
// primary "branch" glyph rotated 90° as the routing cue.
function RoutingNodeContents() {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      className={css`
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      `}
    >
      <EuiPanel
        hasShadow
        paddingSize="m"
        className={css`
          display: flex;
          align-items: center;
          justify-content: center;
          border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued};
          border-radius: ${euiTheme.border.radius.small};

          .euiIcon {
            transform: rotate(90deg);
          }
        `}
      >
        <EuiIcon type="branch" size="m" color="primary" />
      </EuiPanel>
    </div>
  );
}

const RoutingNode = memo((_props: NodeProps<RoutingFlowNode>) => {
  const anchorHandleClassName = useAnchorHandleClassName();
  return (
    <div className={inflateClassName}>
      <Handle type="target" position={Position.Left} className={anchorHandleClassName} />
      <RoutingNodeContents />
      <Handle type="source" position={Position.Right} className={anchorHandleClassName} />
    </div>
  );
});
RoutingNode.displayName = 'RoutingNode';

// The dangling end of a freshly created routing connector. The connector's own
// target anchor circle (drawn by the edge) sits at this node's handle and is the
// grab point; this node just carries a hint label and is itself draggable, so the
// user can reposition the loose end and drop it onto a destination.
function RoutingEndpointContents() {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      className={css`
        display: flex;
        align-items: center;
        justify-content: flex-end;
        padding-right: ${euiTheme.size.s};
        cursor: grab;
        &:active {
          cursor: grabbing;
        }
      `}
    >
      <EuiText
        size="xs"
        color="subdued"
        className={css`
          white-space: nowrap;
        `}
      >
        {i18n.translate('xpack.streams.streamsCanvas.dragToConnect', {
          defaultMessage: 'Drag to a destination',
        })}
      </EuiText>
    </div>
  );
}

const RoutingEndpointNode = memo(() => {
  return (
    <div className={inflateClassName}>
      <Handle type="target" position={Position.Right} className={hiddenHandleClassName} />
      <RoutingEndpointContents />
    </div>
  );
});
RoutingEndpointNode.displayName = 'RoutingEndpointNode';

const nodeTypes: NodeTypes = {
  source: SourceNode,
  destination: DestinationNode,
  pipeline: PipelineNode,
  routing: RoutingNode,
  routingEndpoint: RoutingEndpointNode,
};

function EdgeMenuItem({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  const { euiTheme } = useEuiTheme();
  return (
    <button
      type="button"
      onClick={onClick}
      className={css`
        width: 100%;
        text-align: left;
        background: transparent;
        border: none;
        padding: ${euiTheme.size.xs} 0;
        cursor: pointer;
        &:hover p:first-of-type {
          text-decoration: underline;
        }
      `}
    >
      <EuiText
        size="xs"
        className={css`
          font-weight: ${euiTheme.font.weight.medium};
          color: ${euiTheme.colors.textPrimary};
        `}
      >
        {title}
      </EuiText>
      <EuiText size="xs" color="subdued">
        {description}
      </EuiText>
    </button>
  );
}

function PipelineRoutingEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  data,
}: EdgeProps) {
  const { euiTheme } = useEuiTheme();
  const openPipelineFlyout = useContext(PipelineFlyoutContext);
  const openEdgeRoutingFlyout = useContext(EdgeRoutingFlyoutContext);
  const [isHovered, setIsHovered] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // A dangling routing connector (one whose head is not yet wired to a
  // destination) always shows a prominent grab dot at its loose end as a
  // call-to-action to connect it.
  const isDanglingRouting = Boolean(data?.routingEndpointNodeId);

  // Square-elbow (orthogonal) connectors with lightly rounded corners, matching
  // the product reference where routing connectors use right-angle segments.
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  });

  const isActive = isHovered || isPopoverOpen;
  const strokeColor = isActive ? euiTheme.colors.primary : euiTheme.colors.mediumShade;

  // The connectors' grab anchors are the node handles themselves (small circles
  // at each connection point), so we don't draw anchors on a normal edge. The one
  // exception is a dangling routing connector: its loose end rests on an endpoint
  // node with no visible handle, so we draw a filled primary dot there as a
  // call-to-action to connect it to a destination.
  return (
    <g
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={isDanglingRouting ? undefined : markerEnd}
        style={{ ...style, stroke: strokeColor, strokeWidth: 1.5 }}
        interactionWidth={24}
      />
      {isDanglingRouting ? (
        <circle
          cx={targetX}
          cy={targetY}
          r={5}
          stroke={euiTheme.colors.primary}
          strokeWidth={1.5}
          fill={euiTheme.colors.primary}
          style={{ pointerEvents: 'none' }}
        />
      ) : null}
      <EdgeLabelRenderer>
        {isActive ? (
          <div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`nodrag nopan ${css`
              position: absolute;
              transform: translate(-50%, -50%) translate(${labelX}px, ${labelY}px);
              pointer-events: all;
              z-index: 5;
            `}`}
          >
            <EuiPopover
              isOpen={isPopoverOpen}
              closePopover={() => setIsPopoverOpen(false)}
              anchorPosition="upCenter"
              panelPaddingSize="none"
              button={
                <button
                  type="button"
                  aria-label={i18n.translate('xpack.streams.streamsCanvas.addStep', {
                    defaultMessage: 'Add step',
                  })}
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsPopoverOpen((open) => !open);
                  }}
                  className={css`
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 24px;
                    height: 24px;
                    padding: 0;
                    cursor: pointer;
                    border-radius: 50%;
                    color: ${euiTheme.colors.primary};
                    background-color: ${euiTheme.colors.backgroundBasePrimary};
                    border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.primary};
                    box-shadow: 0 1px 2px rgba(43, 57, 79, 0.16), 0 2px 4px rgba(43, 57, 79, 0.05);
                  `}
                >
                  <EuiIcon type="plus" size="s" color="primary" />
                </button>
              }
            >
              <EuiPanel
                hasShadow={false}
                paddingSize="none"
                className={css`
                  padding: ${euiTheme.size.s} ${euiTheme.size.m};
                  min-width: 220px;
                `}
              >
                <EdgeMenuItem
                  title={i18n.translate('xpack.streams.streamsCanvas.pipeline', {
                    defaultMessage: 'Pipeline',
                  })}
                  description={i18n.translate('xpack.streams.streamsCanvas.pipelineDescription', {
                    defaultMessage: 'transform your data in transit',
                  })}
                  onClick={() => {
                    setIsPopoverOpen(false);
                    openPipelineFlyout(id);
                  }}
                />
                <EuiHorizontalRule margin="xs" />
                <EdgeMenuItem
                  title={i18n.translate('xpack.streams.streamsCanvas.routing', {
                    defaultMessage: 'Routing',
                  })}
                  description={i18n.translate('xpack.streams.streamsCanvas.routingDescription', {
                    defaultMessage: 'conditionally route or duplicate your data',
                  })}
                  onClick={() => {
                    setIsPopoverOpen(false);
                    openEdgeRoutingFlyout(id);
                  }}
                />
              </EuiPanel>
            </EuiPopover>
          </div>
        ) : null}
      </EdgeLabelRenderer>
    </g>
  );
}

const edgeTypes: EdgeTypes = {
  pipelineRouting: PipelineRoutingEdge,
};

function sourceData(): SourceNodeData {
  return {
    title: i18n.translate('xpack.streams.streamsCanvas.sourceTitle', {
      defaultMessage: 'AWS CloudWatch',
    }),
    subtitle: i18n.translate('xpack.streams.streamsCanvas.sourceSubtitle', {
      defaultMessage: 'Logs \u00b7 Push via Firehose',
    }),
    rate: '11.9k/s',
  };
}

const DEFAULT_DESTINATION_TITLE = i18n.translate('xpack.streams.streamsCanvas.destinationTitle', {
  defaultMessage: 'Destination name',
});

const NEW_DESTINATION_TITLE = i18n.translate('xpack.streams.streamsCanvas.newDestinationTitle', {
  defaultMessage: 'New destination',
});

function configuredDestinationData(title?: string): DestinationNodeData {
  return {
    title: title?.trim() || DEFAULT_DESTINATION_TITLE,
    mode: 'configured',
    meta: '8.1k eps\u30fb175ms',
    status: i18n.translate('xpack.streams.streamsCanvas.destinationStatus', {
      defaultMessage: 'Good',
    }),
  };
}

function unconfiguredDestinationData(): DestinationNodeData {
  return {
    title: NEW_DESTINATION_TITLE,
    mode: 'unconfigured',
  };
}

function pipelineData(): PipelineNodeData {
  return {
    title: i18n.translate('xpack.streams.streamsCanvas.pipelineNodeName', {
      defaultMessage: 'MyPipelineName',
    }),
    eps: '3.8k eps',
    latency: '190ms',
  };
}

function routingData(): RoutingNodeData {
  return {};
}

function defaultDataFor(type: CanvasNodeType): SourceNodeData | DestinationNodeData {
  return type === 'source' ? sourceData() : configuredDestinationData();
}

let nodeIdCounter = 0;
function createNode(type: CanvasNodeType, position: XYPosition): Node {
  nodeIdCounter += 1;
  // Newly added destinations start unconfigured until the user sets them up.
  const data = type === 'source' ? sourceData() : unconfiguredDestinationData();
  return {
    id: `${type}-${Date.now()}-${nodeIdCounter}`,
    type,
    position,
    data,
  };
}

const initialNodes: Node[] = [
  {
    id: 'source-1',
    type: 'source',
    position: { x: 0, y: 0 },
    data: defaultDataFor('source'),
  },
  {
    id: 'destination-1',
    type: 'destination',
    position: { x: 360, y: 18 },
    data: defaultDataFor('destination'),
  },
];

const initialEdges: Edge[] = [
  {
    id: 'e-source-1-destination-1',
    source: 'source-1',
    target: 'destination-1',
    type: 'pipelineRouting',
  },
];

/**
 * A structural fingerprint of the canvas: which nodes exist (id + type) and how
 * they are wired (edge id + endpoints). Used to detect when the user has made a
 * meaningful change (added/removed/connected nodes) versus transient churn like
 * selection, hover, or node measurement. Intentionally ignores positions and
 * node data so neither moving nor selecting a node flips the "dirty" flag.
 */
function canvasSignature(nodes: Node[], edges: Edge[]): string {
  const nodePart = nodes
    .map((node) => `${node.id}:${node.type ?? ''}`)
    .sort()
    .join('|');
  const edgePart = edges
    .map(
      (edge) =>
        `${edge.id}:${edge.source}>${edge.target}:${edge.sourceHandle ?? ''}>${
          edge.targetHandle ?? ''
        }`
    )
    .sort()
    .join('|');
  return `${nodePart}#${edgePart}`;
}

const INITIAL_CANVAS_SIGNATURE = canvasSignature(initialNodes, initialEdges);

interface PaletteButtonProps {
  type: CanvasNodeType;
  iconType: string;
  label: string;
  isActive: boolean;
  onActivate: (type: CanvasNodeType) => void;
}

function PaletteButton({ type, iconType, label, isActive, onActivate }: PaletteButtonProps) {
  const { euiTheme } = useEuiTheme();

  const onDragStart = useCallback(
    (event: React.DragEvent) => {
      event.dataTransfer.setData(DRAG_DATA_TYPE, type);
      event.dataTransfer.effectAllowed = 'move';
    },
    [type]
  );

  return (
    <EuiPanel
      element="button"
      hasShadow={false}
      hasBorder
      paddingSize="s"
      draggable
      onDragStart={onDragStart}
      onClick={() => onActivate(type)}
      className={css`
        cursor: grab;
        border-radius: ${euiTheme.border.radius.medium};
        ${isActive ? `border-color: ${euiTheme.colors.primary};` : ''}
        &:active {
          cursor: grabbing;
        }
      `}
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type={iconType} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText
            size="xs"
            className={css`
              font-weight: ${euiTheme.font.weight.medium};
              color: ${euiTheme.colors.textParagraph};
            `}
          >
            {label}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}

interface CanvasControlsProps {
  placementType: CanvasNodeType | null;
  onActivatePlacement: (type: CanvasNodeType) => void;
}

function CanvasControls({ placementType, onActivatePlacement }: CanvasControlsProps) {
  const { euiTheme } = useEuiTheme();

  const toolButton = (iconType: IconType, label: string) => (
    <EuiButtonIcon iconType={iconType} color="text" size="s" aria-label={label} />
  );

  const verticalRule = (
    <EuiHorizontalRule
      margin="none"
      className={css`
        block-size: ${euiTheme.size.l};
        inline-size: ${euiTheme.border.width.thin};
      `}
    />
  );

  return (
    <EuiPanel
      hasShadow
      paddingSize="s"
      className={css`
        position: absolute;
        bottom: ${euiTheme.size.l};
        left: 50%;
        transform: translateX(-50%);
        z-index: 5;
        border-radius: ${euiTheme.border.radius.medium};
      `}
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          {toolButton(
            SelectCursorIcon,
            i18n.translate('xpack.streams.streamsCanvas.selectTool', {
              defaultMessage: 'Select',
            })
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {toolButton(
            'grab',
            i18n.translate('xpack.streams.streamsCanvas.panTool', {
              defaultMessage: 'Pan',
            })
          )}
        </EuiFlexItem>

        <EuiFlexItem grow={false}>{verticalRule}</EuiFlexItem>

        <EuiFlexItem grow={false}>
          {toolButton(
            'editorUndo',
            i18n.translate('xpack.streams.streamsCanvas.undo', {
              defaultMessage: 'Undo',
            })
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {toolButton(
            'editorRedo',
            i18n.translate('xpack.streams.streamsCanvas.redo', {
              defaultMessage: 'Redo',
            })
          )}
        </EuiFlexItem>

        <EuiFlexItem grow={false}>{verticalRule}</EuiFlexItem>

        <EuiFlexItem grow={false}>
          <PaletteButton
            type="source"
            iconType="dashedCircle"
            label={i18n.translate('xpack.streams.streamsCanvas.addSource', {
              defaultMessage: 'Source',
            })}
            isActive={placementType === 'source'}
            onActivate={onActivatePlacement}
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <PaletteButton
            type="destination"
            iconType="package"
            label={i18n.translate('xpack.streams.streamsCanvas.addDestination', {
              defaultMessage: 'Destination',
            })}
            isActive={placementType === 'destination'}
            onActivate={onActivatePlacement}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}

function ShadowNode({ type, position }: { type: CanvasNodeType; position: XYPosition }) {
  // Mirror what createNode produces so the preview matches the placed node.
  const data = type === 'source' ? sourceData() : unconfiguredDestinationData();
  return (
    <div
      className={css`
        position: absolute;
        left: ${position.x}px;
        top: ${position.y}px;
        transform: translate(-50%, -50%);
        opacity: 0.6;
        pointer-events: none;
        z-index: 6;
      `}
    >
      {type === 'source' ? (
        <SourceNodeContents data={data as SourceNodeData} />
      ) : (
        <UnconfiguredDestinationContents data={data as DestinationNodeData} onClick={noop} />
      )}
    </div>
  );
}

function StreamsCanvasInner() {
  const { euiTheme } = useEuiTheme();
  const { screenToFlowPosition, getNodes, getEdges, getIntersectingNodes } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);

  // The "Save changes" button stays disabled until the user makes a meaningful
  // edit to the canvas. We derive "dirty" by comparing a structural signature of
  // the current nodes/edges (ids, types, and edge endpoints) against the initial
  // snapshot, so transient selection/move/measurement churn doesn't count.
  const hasChanges = useMemo(
    () => canvasSignature(nodes, edges) !== INITIAL_CANVAS_SIGNATURE,
    [nodes, edges]
  );

  const wrapperRef = useRef<HTMLDivElement>(null);
  // Tracks whether the in-progress edge reconnection landed on a valid handle.
  // If it didn't (dropped on empty canvas), onReconnectEnd disconnects the edge.
  const reconnectSucceededRef = useRef(false);
  const [placementType, setPlacementType] = useState<CanvasNodeType | null>(null);
  const [shadowPosition, setShadowPosition] = useState<XYPosition | null>(null);
  // Presentational search box for the canvas toolbar (mirrors the list tables).
  const [searchQuery, setSearchQuery] = useState('');
  const [flyoutDestination, setFlyoutDestination] = useState<string | null>(null);
  const [flyoutSource, setFlyoutSource] = useState<string | null>(null);
  const [pipelineFlyoutEdgeId, setPipelineFlyoutEdgeId] = useState<string | null>(null);
  // The id of the connector whose "Add step" menu opened the routing flyout.
  // Applying a routing condition splices a routing node into that edge.
  const [routingFlyoutEdgeId, setRoutingFlyoutEdgeId] = useState<string | null>(null);
  // While an end of a connector (or a brand-new connection) is being dragged:
  //   - connectingFromNodeId: the node the drag is anchored to (excluded from the
  //     highlight, since you can't connect a node to itself).
  //   - connectingTargetTypes: the node types the dragged end may legally land on.
  //   - connectingHandleSide: which handle anchor lights up on those nodes — the
  //     input ('target') anchor when dragging a head, the output ('source')
  //     anchor when re-anchoring a tail.
  // All reset when nothing is being dragged.
  const [connectingFromNodeId, setConnectingFromNodeId] = useState<string | null>(null);
  const [connectingTargetTypes, setConnectingTargetTypes] = useState<string[]>([]);
  const [connectingHandleSide, setConnectingHandleSide] = useState<'source' | 'target'>('target');
  // While dragging the routing-endpoint puck: the valid target node it is currently
  // hovering over (so we can fill in that node's anchor as the imminent drop point).
  const [hoveredTargetNodeId, setHoveredTargetNodeId] = useState<string | null>(null);

  const openDestinationFlyout = useCallback((destinationName: string) => {
    setFlyoutDestination(destinationName);
  }, []);

  const openSourceFlyout = useCallback((sourceName: string) => {
    setFlyoutSource(sourceName);
  }, []);

  const openPipelineFlyout = useCallback((edgeId: string) => {
    setPipelineFlyoutEdgeId(edgeId);
  }, []);

  const closePipelineFlyout = useCallback(() => {
    setPipelineFlyoutEdgeId(null);
  }, []);

  // Inserts a pipeline node in the middle of the connector that opened the flyout,
  // re-routing the original edge through the new node (source -> pipeline -> target),
  // then closes the flyout.
  const applyPipeline = useCallback(() => {
    const edgeId = pipelineFlyoutEdgeId;
    if (!edgeId) {
      return;
    }

    const targetEdge = getEdges().find((edge) => edge.id === edgeId);
    const sourceNode = targetEdge && getNodes().find((node) => node.id === targetEdge.source);
    const destinationNode = targetEdge && getNodes().find((node) => node.id === targetEdge.target);

    if (targetEdge && sourceNode && destinationNode) {
      const pipelineNodeId = `pipeline-${Date.now()}`;

      // Center the small pipeline node on the connector: horizontally between the
      // source's right edge and the destination's left edge, vertically on the line
      // joining the two nodes' centers. Fall back to sensible defaults if React Flow
      // has not measured the nodes yet.
      const sourceWidth = sourceNode.measured?.width ?? sourceNode.width ?? 204;
      const sourceHeight = sourceNode.measured?.height ?? sourceNode.height ?? 96;
      const destinationHeight =
        destinationNode.measured?.height ?? destinationNode.height ?? sourceHeight;
      // The "Big" pipeline card is a fixed-width horizontal card; offset by half
      // its footprint so its center lands on the connector midpoint.
      const PIPELINE_NODE_WIDTH = 120;
      const PIPELINE_NODE_HEIGHT = 40;

      const sourceCenterY = sourceNode.position.y + sourceHeight / 2;
      const destinationCenterY = destinationNode.position.y + destinationHeight / 2;
      const sourceRightEdge = sourceNode.position.x + sourceWidth;

      const midpoint: XYPosition = {
        x: (sourceRightEdge + destinationNode.position.x) / 2 - PIPELINE_NODE_WIDTH / 2,
        y: (sourceCenterY + destinationCenterY) / 2 - PIPELINE_NODE_HEIGHT / 2,
      };

      setNodes((current) =>
        current.concat({
          id: pipelineNodeId,
          type: 'pipeline',
          position: midpoint,
          data: pipelineData(),
        })
      );

      setEdges((current) =>
        current
          .filter((edge) => edge.id !== edgeId)
          .concat(
            {
              id: `${targetEdge.source}-${pipelineNodeId}`,
              source: targetEdge.source,
              target: pipelineNodeId,
              type: 'pipelineRouting',
            },
            {
              id: `${pipelineNodeId}-${targetEdge.target}`,
              source: pipelineNodeId,
              target: targetEdge.target,
              type: 'pipelineRouting',
            }
          )
      );
    }

    setPipelineFlyoutEdgeId(null);
  }, [pipelineFlyoutEdgeId, getEdges, getNodes, setNodes, setEdges]);

  const openEdgeRoutingFlyout = useCallback((edgeId: string) => {
    setRoutingFlyoutEdgeId(edgeId);
  }, []);

  const closeEdgeRoutingFlyout = useCallback(() => {
    setRoutingFlyoutEdgeId(null);
  }, []);

  // Routing triggered from a connector's "Add step" menu: splice a routing node
  // into the middle of that connector, re-routing the original edge through the
  // new node (source -> routing -> target). Mirrors applyPipeline so an inline
  // routing node looks and connects just like an inline pipeline node.
  const applyEdgeRouting = useCallback(() => {
    const edgeId = routingFlyoutEdgeId;
    if (!edgeId) {
      return;
    }

    const targetEdge = getEdges().find((edge) => edge.id === edgeId);
    const sourceNode = targetEdge && getNodes().find((node) => node.id === targetEdge.source);
    const destinationNode = targetEdge && getNodes().find((node) => node.id === targetEdge.target);

    if (targetEdge && sourceNode && destinationNode) {
      const routingNodeId = `routing-${Date.now()}`;
      const endpointNodeId = `routing-endpoint-${Date.now()}`;

      // Center the small routing node on the connector: horizontally between the
      // source's right edge and the destination's left edge, vertically on the line
      // joining the two nodes' centers. Fall back to sensible defaults if React Flow
      // has not measured the nodes yet.
      const sourceWidth = sourceNode.measured?.width ?? sourceNode.width ?? 204;
      const sourceHeight = sourceNode.measured?.height ?? sourceNode.height ?? 96;
      const destinationHeight =
        destinationNode.measured?.height ?? destinationNode.height ?? sourceHeight;
      const ROUTING_NODE_SIZE = 32;

      const sourceCenterY = sourceNode.position.y + sourceHeight / 2;
      const destinationCenterY = destinationNode.position.y + destinationHeight / 2;
      const sourceRightEdge = sourceNode.position.x + sourceWidth;

      const midpoint: XYPosition = {
        x: (sourceRightEdge + destinationNode.position.x) / 2 - ROUTING_NODE_SIZE / 2,
        y: (sourceCenterY + destinationCenterY) / 2 - ROUTING_NODE_SIZE / 2,
      };

      // Drop the dangling endpoint below the new routing node so its loose
      // connector reads as a second branch coming off the node, clear of the
      // horizontal source -> routing -> destination line.
      const ENDPOINT_GAP_Y = 96;
      const ENDPOINT_DOT_RADIUS = 6;
      const endpointPosition: XYPosition = {
        x: midpoint.x + ROUTING_NODE_SIZE / 2,
        y: midpoint.y + ROUTING_NODE_SIZE + ENDPOINT_GAP_Y - ENDPOINT_DOT_RADIUS,
      };

      setNodes((current) =>
        current.concat(
          {
            id: routingNodeId,
            type: 'routing',
            position: midpoint,
            data: routingData(),
          },
          {
            id: endpointNodeId,
            type: 'routingEndpoint',
            position: endpointPosition,
            data: {},
            draggable: true,
            selectable: false,
          }
        )
      );

      setEdges((current) =>
        current
          .filter((edge) => edge.id !== edgeId)
          .concat(
            {
              id: `${targetEdge.source}-${routingNodeId}`,
              source: targetEdge.source,
              target: routingNodeId,
              type: 'pipelineRouting',
            },
            {
              id: `${routingNodeId}-${targetEdge.target}`,
              source: routingNodeId,
              target: targetEdge.target,
              type: 'pipelineRouting',
            },
            // A second, dangling branch off the new routing node: it ends at a
            // free-floating endpoint puck the user can drag onto a destination to
            // wire up the route. Mirrors the badge-triggered routing connector.
            {
              id: `routing-${routingNodeId}-${endpointNodeId}`,
              source: routingNodeId,
              target: endpointNodeId,
              type: 'pipelineRouting',
              reconnectable: false,
              data: { routingEndpointNodeId: endpointNodeId },
            }
          )
      );
    }

    setRoutingFlyoutEdgeId(null);
  }, [routingFlyoutEdgeId, getEdges, getNodes, setNodes, setEdges]);

  // The loose end of a routing connector is a draggable "puck" node. Rather than
  // rely on connecting to a tiny handle, we let the user drag this node and detect
  // (by node intersection) which destination/pipeline it is dropped on. This makes
  // "drag to a destination" literal and reliable.

  // Returns the routing edge anchored to the given endpoint node, plus the type of
  // its real source node, or undefined if this isn't a dangling routing endpoint.
  const routingEdgeForEndpoint = useCallback(
    (endpointNodeId: string) => {
      const edge = getEdges().find((e) => danglingEndpointIdOf(e) === endpointNodeId);
      if (!edge) {
        return undefined;
      }
      const sourceType = getNodes().find((n) => n.id === edge.source)?.type;
      return { edge, sourceType };
    },
    [getEdges, getNodes]
  );

  // The valid target node a dragged routing endpoint is currently over (the
  // top-most intersecting node of an allowed type, excluding the connector's own
  // source). Used both to highlight while dragging and to wire up on drop.
  const intersectingTargetForEndpoint = useCallback(
    (endpointNode: Node, sourceType: string | undefined, originId: string) => {
      const allowed = allowedTargetTypesFor(sourceType);
      const intersecting = getIntersectingNodes(endpointNode, true);
      // Prefer the last (top-most) matching node.
      for (let i = intersecting.length - 1; i >= 0; i--) {
        const candidate = intersecting[i];
        if (
          candidate.id !== originId &&
          candidate.type &&
          allowed.includes(candidate.type)
        ) {
          return candidate;
        }
      }
      return undefined;
    },
    [getIntersectingNodes]
  );

  const onNodeDrag = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (node.type !== 'routingEndpoint') {
        return;
      }
      const info = routingEdgeForEndpoint(node.id);
      if (!info) {
        return;
      }
      const target = intersectingTargetForEndpoint(node, info.sourceType, info.edge.source);
      // Highlight the valid drop targets (input anchors) while dragging the puck;
      // when hovering a specific valid target, mark it so its anchor fills in.
      setConnectingFromNodeId(info.edge.source);
      setConnectingTargetTypes(allowedTargetTypesFor(info.sourceType));
      setConnectingHandleSide('target');
      setHoveredTargetNodeId(target?.id ?? null);
    },
    [routingEdgeForEndpoint, intersectingTargetForEndpoint]
  );

  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (node.type !== 'routingEndpoint') {
        return;
      }
      const info = routingEdgeForEndpoint(node.id);
      setConnectingFromNodeId(null);
      setConnectingTargetTypes([]);
      setHoveredTargetNodeId(null);
      if (!info) {
        return;
      }
      const target = intersectingTargetForEndpoint(node, info.sourceType, info.edge.source);
      if (!target) {
        // No valid target under the puck. If it was dropped back onto its own
        // source node, cancel the connector entirely (collapse-to-delete);
        // otherwise leave it where it is so the connector stays available to retry.
        const overOrigin = getIntersectingNodes(node, true).some((n) => n.id === info.edge.source);
        if (overOrigin) {
          setEdges((current) => current.filter((edge) => edge.id !== info.edge.id));
          setNodes((current) => current.filter((n) => n.id !== node.id));
        }
        return;
      }
      // Wire the routing connector to the real target and remove the puck.
      setEdges((current) =>
        current.map((edge) =>
          edge.id === info.edge.id
            ? {
                ...edge,
                target: target.id,
                targetHandle: null,
                // Now wired to a real node: re-enable reconnect and drop the
                // dangling marker so it behaves like any other edge.
                reconnectable: true,
                data: { ...edge.data, routingEndpointNodeId: undefined },
              }
            : edge
        )
      );
      setNodes((current) => current.filter((n) => n.id !== node.id));
    },
    [routingEdgeForEndpoint, intersectingTargetForEndpoint, getIntersectingNodes, setEdges, setNodes]
  );

  // Starting to drag a brand-new connection out of an output anchor: highlight
  // the input anchors of every node it could legally land on (same affordance as
  // reconnecting an existing connector's head).
  const onConnectStart = useCallback<OnConnectStart>(
    (_event, params) => {
      if (!params.nodeId || params.handleType !== 'source') {
        return;
      }
      const sourceType = getNodes().find((node) => node.id === params.nodeId)?.type;
      setConnectingFromNodeId(params.nodeId);
      setConnectingTargetTypes(allowedTargetTypesFor(sourceType));
      setConnectingHandleSide('target');
    },
    [getNodes]
  );

  // Persist a brand-new connection drawn between two anchors. `isValidConnection`
  // has already gated this to an allowed node-type pair.
  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((current) =>
        current.concat({
          ...connection,
          id: `${connection.source}${connection.sourceHandle ? `:${connection.sourceHandle}` : ''}-${
            connection.target
          }`,
          type: 'pipelineRouting',
        })
      );
    },
    [setEdges]
  );

  // Always clear the target highlight when a new-connection drag ends, whether or
  // not it landed on a valid anchor.
  const onConnectEnd = useCallback(() => {
    setConnectingFromNodeId(null);
    setConnectingTargetTypes([]);
  }, []);

  // When a connector is reconnected onto a valid handle, update the edge and (for
  // a routing connector that was still dangling) clean up the now-orphaned
  // free-floating endpoint node and clear the dangling marker so the connector
  // behaves like a normal, fully-wired edge from now on.
  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      reconnectSucceededRef.current = true;

      const endpointNodeId = oldEdge.data?.routingEndpointNodeId as string | undefined;
      const landedOnRealTarget = Boolean(endpointNodeId) && newConnection.target !== endpointNodeId;

      setEdges((current) => {
        const updated = reconnectEdge(oldEdge, newConnection, current);
        if (!landedOnRealTarget) {
          return updated;
        }
        // Drop the dangling marker from the reconnected edge.
        return updated.map((edge) =>
          edge.source === newConnection.source &&
          edge.target === newConnection.target &&
          edge.data?.routingEndpointNodeId === endpointNodeId
            ? { ...edge, data: { ...edge.data, routingEndpointNodeId: undefined } }
            : edge
        );
      });

      if (landedOnRealTarget) {
        setNodes((current) => current.filter((node) => node.id !== endpointNodeId));
      }
    },
    [setEdges, setNodes]
  );

  // When an end of a connector starts being dragged, highlight the anchors it can
  // legally be dropped on. NOTE: React Flow reports `handleType` as the *fixed*
  // end (the one that stays put), so:
  //   - handleType 'source' → the head (target end) is moving while the source
  //     stays. It can land on the input anchors of nodes the source may connect
  //     to (e.g. a routing connector's loose end onto another destination).
  //   - handleType 'target' → the tail (source end) is moving while the target
  //     stays. It re-anchors onto the output anchors of nodes that may feed the
  //     target.
  const onReconnectStart = useCallback(
    (_event: React.MouseEvent | React.TouchEvent, edge: Edge, handleType: 'source' | 'target') => {
      reconnectSucceededRef.current = false;
      const nodes = getNodes();
      if (handleType === 'source') {
        const sourceType = nodes.find((node) => node.id === edge.source)?.type;
        setConnectingFromNodeId(edge.source);
        setConnectingTargetTypes(allowedTargetTypesFor(sourceType));
        setConnectingHandleSide('target');
      } else {
        const targetType = nodes.find((node) => node.id === edge.target)?.type;
        setConnectingFromNodeId(edge.target);
        setConnectingTargetTypes(allowedSourceTypesFor(targetType));
        setConnectingHandleSide('source');
      }
    },
    [getNodes]
  );

  // When a reconnect drag ends without a successful onReconnect, decide whether to
  // delete the edge:
  //   - Collapse-to-delete: if the moving end was dropped on the node at the OTHER
  //     end of the edge (dragging one extreme onto the other), remove the edge.
  //   - Drop-on-empty: an already-connected edge dropped on empty canvas is removed
  //     (disconnect), while a still-dangling routing connector is left as-is so it
  //     simply snaps back and can be retried rather than vanishing.
  const onReconnectEnd = useCallback(
    (
      _event: MouseEvent | TouchEvent,
      edge: Edge,
      handleType: 'source' | 'target',
      connectionState: FinalConnectionState
    ) => {
      setConnectingFromNodeId(null);
      setConnectingTargetTypes([]);

      if (reconnectSucceededRef.current) {
        return;
      }

      const otherEndNodeId = handleType === 'source' ? edge.source : edge.target;
      const droppedOnNodeId = connectionState.toNode?.id ?? null;
      const collapsedOntoOtherEnd = droppedOnNodeId !== null && droppedOnNodeId === otherEndNodeId;
      const isDangling = Boolean(edge.data?.routingEndpointNodeId);

      if (collapsedOntoOtherEnd || !isDangling) {
        setEdges((current) => current.filter((existing) => existing.id !== edge.id));
      }
    },
    [setEdges]
  );

  // Connections are only valid between the node-type pairs in ALLOWED_CONNECTIONS;
  // anything else (and self-connections) is rejected. This also drives the
  // `valid` styling React Flow applies to the anchor the cursor magnetizes to.
  const isValidConnection = useCallback<IsValidConnection>(
    (connection) => {
      if (!connection.source || !connection.target || connection.source === connection.target) {
        return false;
      }
      const nodes = getNodes();
      const sourceType = nodes.find((node) => node.id === connection.source)?.type;
      const targetType = nodes.find((node) => node.id === connection.target)?.type;
      return ALLOWED_CONNECTIONS.some(([from, to]) => from === sourceType && to === targetType);
    },
    [getNodes]
  );

  const defaultEdgeOptions = {
    type: 'pipelineRouting',
    // Every connection can be grabbed and re-routed from either end.
    reconnectable: true,
    style: { stroke: euiTheme.colors.mediumShade, strokeWidth: 1.5 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 12,
      height: 12,
      color: euiTheme.colors.mediumShade,
    },
  };

  const addNodeAtScreenPosition = useCallback(
    (type: CanvasNodeType, screenPosition: { x: number; y: number }) => {
      const position = screenToFlowPosition(screenPosition);
      setNodes((current) => current.concat(createNode(type, position)));
    },
    [screenToFlowPosition, setNodes]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    if (event.dataTransfer.types.includes(DRAG_DATA_TYPE)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
    }
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      const type = event.dataTransfer.getData(DRAG_DATA_TYPE) as CanvasNodeType;
      if (type !== 'source' && type !== 'destination') {
        return;
      }
      event.preventDefault();
      addNodeAtScreenPosition(type, { x: event.clientX, y: event.clientY });
    },
    [addNodeAtScreenPosition]
  );

  const activatePlacement = useCallback((type: CanvasNodeType) => {
    setPlacementType((current) => (current === type ? null : type));
    setShadowPosition(null);
  }, []);

  const onPaneClick = useCallback(() => {
    if (placementType && shadowPosition) {
      addNodeAtScreenPosition(placementType, shadowPosition);
    }
    setPlacementType(null);
    setShadowPosition(null);
  }, [placementType, shadowPosition, addNodeAtScreenPosition]);

  const onMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (!placementType) {
        return;
      }
      const bounds = wrapperRef.current?.getBoundingClientRect();
      if (!bounds) {
        return;
      }
      setShadowPosition({ x: event.clientX - bounds.left, y: event.clientY - bounds.top });
    },
    [placementType]
  );

  const onKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setPlacementType(null);
      setShadowPosition(null);
    }
  }, []);

  // Center the canvas content (at 100% zoom) once React Flow has mounted and
  // measured the nodes, so the elements appear in the middle on load.
  const handleInit = useCallback((instance: ReactFlowInstance<Node, Edge>) => {
    const currentNodes = instance.getNodes();
    if (currentNodes.length === 0) {
      return;
    }
    const bounds = getNodesBounds(currentNodes);
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    instance.setCenter(centerX, centerY, { zoom: 1 });
  }, []);

  // While dragging a connection (new or reconnect), light up the anchors of every
  // node the connection could legally land on — nodes of a valid target type,
  // excluding the one the connection starts from. Two things happen to those
  // anchors for the duration of the drag:
  //   1. the anchor's dot becomes a hollow primary ring (the "drop here" cue), and
  //   2. the handle element is stretched to cover its whole node, so dropping
  //      anywhere on the node connects to that anchor (a forgiving target, since
  //      the dot itself is small and the cards are wide). The dot is pinned to the
  //      node edge via the ::after pseudo-element so it stays visually in place.
  // The specific anchor the cursor snaps to additionally fills in via its own
  // `connectingto.valid` state.
  const connectingTargetSelector = connectingTargetTypes
    .map(
      (type) =>
        `.react-flow__node-${type}:not([data-id='${
          connectingFromNodeId ?? ''
        }']) .react-flow__handle.${connectingHandleSide}`
    )
    .join(', ');
  // Where the dot sits once the handle is stretched over the node: the input
  // anchor hugs the left edge, the output anchor the right edge.
  const connectingDotLeft = connectingHandleSide === 'target' ? '0' : '100%';
  const connectingHighlightClassName = css`
    ${connectingTargetSelector} {
      width: 100%;
      height: 100%;
      min-width: 0;
      min-height: 0;
      top: 0;
      left: 0;
      transform: none;
      border-radius: ${euiTheme.border.radius.medium};
      background: transparent;
    }
    ${connectingTargetSelector}::after {
      left: ${connectingDotLeft};
      background-color: ${euiTheme.colors.backgroundBasePlain};
      border-color: ${euiTheme.colors.primary};
      box-shadow: 0 0 0 3px ${euiTheme.colors.backgroundBasePrimary},
        0 0 0 5px ${euiTheme.colors.primary};
    }
    ${
      hoveredTargetNodeId
        ? `.react-flow__node[data-id='${hoveredTargetNodeId}'] .react-flow__handle.${connectingHandleSide}::after`
        : '.__never__'
    } {
      background-color: ${euiTheme.colors.primary};
      border-color: ${euiTheme.colors.primary};
    }
  `;

  return (
    <DestinationFlyoutContext.Provider value={openDestinationFlyout}>
      <SourceFlyoutContext.Provider value={openSourceFlyout}>
      <PipelineFlyoutContext.Provider value={openPipelineFlyout}>
      <EdgeRoutingFlyoutContext.Provider value={openEdgeRoutingFlyout}>
      <div
        className={css`
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          gap: ${euiTheme.size.m};
        `}
      >
      {/* Toolbar mirrors the search + filters row on the list table tabs, but the
          primary action saves the canvas instead of creating a new entity. */}
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
        responsive={false}
        className={css`
          flex-grow: 0;
          max-height: 32px;
        `}
      >
        <EuiFlexItem>
          <EuiFieldSearch
            compressed
            incremental
            fullWidth
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label={STREAMS_TABLE_SEARCH_ARIA_LABEL}
            data-test-subj="streamsCanvasSearch"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <StreamsListTableTools
            newButtonIconType="save"
            newButtonDisabled={!hasChanges}
            newButtonLabel={i18n.translate('xpack.streams.streamsCanvas.saveChangesButtonLabel', {
              defaultMessage: 'Save changes',
            })}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <div
        ref={wrapperRef}
        role="presentation"
        onDragOver={onDragOver}
        onDrop={onDrop}
        onMouseMove={onMouseMove}
        onKeyDown={onKeyDown}
        className={`${css`
          position: relative;
          flex: 1;
          min-height: 0;
          width: 100%;
          background-color: ${euiTheme.colors.backgroundBaseSubdued};
          border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued};
          border-radius: ${euiTheme.border.radius.small};
          overflow: hidden;
          ${placementType ? 'cursor: copy;' : ''}

          /* React Flow's native edge reconnect anchors sit on top of the handle
             dots at each connector end; show a grab cursor over their hit area so
             the connection ends feel draggable. */
          .react-flow__edgeupdater {
            cursor: grab;
          }
        `} ${connectingTargetTypes.length > 0 ? connectingHighlightClassName : ''}`}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDrag={onNodeDrag}
          onNodeDragStop={onNodeDragStop}
          onConnect={onConnect}
          onConnectStart={onConnectStart}
          onConnectEnd={onConnectEnd}
          onReconnect={onReconnect}
          onReconnectStart={onReconnectStart}
          onReconnectEnd={onReconnectEnd}
          isValidConnection={isValidConnection}
          connectionLineType={ConnectionLineType.SmoothStep}
          connectionRadius={60}
          reconnectRadius={14}
          onPaneClick={onPaneClick}
          onInit={handleInit}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          nodesConnectable
          edgesReconnectable
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls showInteractive={false} showFitView={false} />
        </ReactFlow>
        {placementType && shadowPosition ? (
          <ShadowNode type={placementType} position={shadowPosition} />
        ) : null}
        <CanvasControls placementType={placementType} onActivatePlacement={activatePlacement} />
      </div>
      </div>
      {flyoutDestination !== null ? (
        <DestinationFlyout
          destinationName={flyoutDestination}
          onClose={() => setFlyoutDestination(null)}
        />
      ) : null}
      {flyoutSource !== null ? (
        <SourceFlyout sourceName={flyoutSource} onClose={() => setFlyoutSource(null)} />
      ) : null}
      {pipelineFlyoutEdgeId !== null ? (
        <PipelineFlyout onClose={closePipelineFlyout} onApply={applyPipeline} />
      ) : null}
      {routingFlyoutEdgeId !== null ? (
        <CreateRoutingFlyout onClose={closeEdgeRoutingFlyout} onApply={applyEdgeRouting} />
      ) : null}
      </EdgeRoutingFlyoutContext.Provider>
      </PipelineFlyoutContext.Provider>
      </SourceFlyoutContext.Provider>
    </DestinationFlyoutContext.Provider>
  );
}

export function StreamsCanvas() {
  return (
    <ReactFlowProvider>
      <StreamsCanvasInner />
    </ReactFlowProvider>
  );
}
