/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiIcon, EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ProcessingNode as ProcessingNodeType } from '../types';
import { PROCESSING_NODE_HEIGHT, PROCESSING_NODE_WIDTH } from '../canvas_constants';
import { ConnectionHandle, NODE_HANDLE_CLASS } from './connection_handle';
import { getNodeCardStyles } from './node_card_styles';

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
            display: flex;
            align-items: center;
            gap: ${euiTheme.size.s};
          `,
        ]}
      >
        <EuiIcon type="processor" aria-hidden={true} />
        <EuiText size="xs">
          <strong>{data.title}</strong>
          <div>{countLabel}</div>
        </EuiText>
      </EuiPanel>
      {data.output === 'fixed' ? (
        <Handle
          type="source"
          position={Position.Right}
          isConnectable={false}
          className={NODE_HANDLE_CLASS}
        />
      ) : (
        <ConnectionHandle
          type="source"
          position={Position.Right}
          isConnectable={true}
          // A route's processing keeps the lines of its rule, which can be moved but not added to.
          isConnectableStart={data.output === 'connect'}
          connectAriaLabel={i18n.translate('xpack.streams.canvas.processingNode.connectAriaLabel', {
            defaultMessage: 'Drag to send processed data to a destination',
          })}
        />
      )}
    </>
  );
}
