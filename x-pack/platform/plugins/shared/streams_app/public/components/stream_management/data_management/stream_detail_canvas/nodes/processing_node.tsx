/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiIcon, EuiPanel, EuiScreenReaderOnly, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { PROCESSING_SLOT_KIND } from '../../../../../services/unit_graph';
import type { ProcessingNode as ProcessingNodeType } from '../types';
import { PROCESSING_NODE_HEIGHT, PROCESSING_NODE_WIDTH } from '../canvas_constants';
import { ConnectionHandle, NODE_HANDLE_CLASS } from './connection_handle';
import { getNodeCardStyles } from './node_card_styles';
import { ProcessingNodeStats } from './processing_node_stats';

/** Compact pill for processing applied between a source, a route and a destination. */
export function ProcessingNode({ data, selected, dragging }: NodeProps<ProcessingNodeType>) {
  const { euiTheme } = useEuiTheme();
  const countLabel = i18n.translate('xpack.streams.canvas.processingNode.processorCount', {
    defaultMessage: '{count, plural, one {# processor} other {# processors}}',
    values: { count: data.processorCount },
  });

  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={false}
        className={NODE_HANDLE_CLASS}
      />
      <EuiPanel
        className="nokey"
        hasShadow={false}
        hasBorder
        paddingSize="s"
        title={data.title}
        data-test-subj="streamsCanvasProcessingNode"
        css={[
          getNodeCardStyles(euiTheme, { width: PROCESSING_NODE_WIDTH, selected, dragging }),
          css`
            min-height: ${PROCESSING_NODE_HEIGHT}px;
            display: grid;
            grid-template-columns: 1fr 3fr;
            align-items: center;
            gap: ${euiTheme.size.m};
          `,
        ]}
      >
        <div
          css={css`
            display: flex;
            align-items: center;
            justify-content: center;
            justify-self: center;
          `}
        >
          <EuiIcon type="processor" size="m" aria-hidden={true} />
        </div>
        <ProcessingNodeStats slot={data.ref} />
        <EuiScreenReaderOnly>
          <span data-test-subj="streamsCanvasProcessingNodeLabel">
            {data.title}, {countLabel}
          </span>
        </EuiScreenReaderOnly>
      </EuiPanel>
      {data.ref.kind === PROCESSING_SLOT_KIND.pipeline ? (
        <ConnectionHandle
          type="source"
          position={Position.Right}
          isConnectable={true}
          connectAriaLabel={i18n.translate('xpack.streams.canvas.processingNode.connectAriaLabel', {
            defaultMessage: 'Drag to send processed data to a destination',
          })}
        />
      ) : (
        <Handle
          type="source"
          position={Position.Right}
          isConnectable={false}
          className={NODE_HANDLE_CLASS}
        />
      )}
    </>
  );
}
