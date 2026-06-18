/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The destination node and its three states: unconfigured / configuring /
// configured. A configured destination renders as a SINGLE card (not a
// card-within-a-card) and is fully draggable; clicking is handled at the canvas
// level (onNodeClick).

import React, { memo, useCallback, useState } from 'react';
import { Handle, Position, useNodeConnections, useReactFlow, type NodeProps } from '@xyflow/react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import type { DestinationFlowNode, DestinationNodeData, DestinationStorage } from '../types';
import {
  hiddenHandleClassName,
  inflateClassName,
  useAnchorHandleClassName,
  useRaiseOnHoverClassName,
} from '../node-styles';
import {
  NEW_DESTINATION_TITLE,
  configuredDestinationData,
  unconfiguredDestinationData,
} from '../node-data';

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

// The bordered frame used by the unconfigured (attention) and configuring
// states.
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
  const borderColor =
    tone === 'danger' ? euiTheme.colors.danger : euiTheme.colors.borderBaseSubdued;
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

export function UnconfiguredDestinationContents({
  data,
  onClick,
  interactive = true,
}: {
  data: DestinationNodeData;
  onClick: () => void;
  interactive?: boolean;
}) {
  const { euiTheme } = useEuiTheme();
  const raiseOnHoverClassName = useRaiseOnHoverClassName();
  // Lift the whole card (the bordered shell), not just the inner button, so the
  // "click to configure" node raises as one piece rather than the button
  // detaching from its frame.
  return (
    <BorderedShell className={interactive ? raiseOnHoverClassName : undefined}>
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
              'Name your destination or leave to be renamed when connected to a source. This can’t be changed.',
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

// A configured destination renders as a SINGLE card (matching the source and
// pipeline nodes) rather than a card-within-a-card. Clicking is handled at the
// canvas level via onNodeClick, so the whole card stays draggable.
function ConfiguredDestinationContents({
  data,
  isConnected,
}: {
  data: DestinationNodeData;
  isConnected: boolean;
}) {
  const { euiTheme } = useEuiTheme();
  const raiseOnHoverClassName = useRaiseOnHoverClassName();
  return (
    <EuiPanel
      hasShadow
      paddingSize="s"
      className={`${css`
        min-width: 211px;
        text-align: left;
        cursor: pointer;
        border-radius: ${euiTheme.border.radius.medium};
      `} ${raiseOnHoverClassName}`}
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
  );
}

export const DestinationNode = memo(({ id, data }: NodeProps<DestinationFlowNode>) => {
  const { setNodes, deleteElements } = useReactFlow();
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
        <ConfiguredDestinationContents data={data} isConnected={isConnectedToSource} />
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
