/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { EuiFlexGroup, EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import type { QualityIndicators } from '@kbn/dataset-quality-plugin/common';
import { truncateText } from '../../util/truncate_text';
import { StreamNodePopover } from './stream_popup';
import type { EnrichedStream } from '../stream_list_view/utils';
import { useDatasetQuality } from '../../hooks/use_dataset_quality';

export const STREAM_NODE_TYPE = 'streamNode';

export interface StreamNodeData extends Record<string, unknown> {
  label: string;
  type: 'wired' | 'root' | 'classic';
  hasChildren: boolean;
  stream: EnrichedStream;
}

export const StreamNode = ({
  data: { label, type, hasChildren, stream },
}: {
  data: StreamNodeData;
}) => {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const qualityColors: Record<QualityIndicators, string> = {
    poor: euiTheme.colors.backgroundLightDanger,
    degraded: euiTheme.colors.backgroundLightWarning,
    good: euiTheme.colors.backgroundLightSuccess,
  };

  const { quality } = useDatasetQuality({
    streamName: stream.stream.name,
    canReadFailureStore: true,
  });

  const nodeClass = css`
    background: ${euiTheme.colors.emptyShade};
    border: 3px solid ${qualityColors[quality]};
    border-radius: 6px;
    padding: ${euiTheme.size.m};
    font-size: ${euiTheme.font.scale.xs}rem;
    cursor: pointer;
  `;

  const nodeContent = (
    <div className={nodeClass} onClick={() => setIsPopoverOpen((isPopupOpen) => !isPopupOpen)}>
      <Handle
        type="source"
        position={Position.Bottom}
        id="source"
        className={css`
          visibility: ${!hasChildren ? 'hidden' : ''};
        `}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="target"
        className={css`
          visibility: ${type === 'root' ? 'hidden' : ''};
        `}
      />
      <EuiFlexGroup alignItems="center" gutterSize="xs">
        {type === 'root' && <EuiIcon type="aggregate" size="s" />}
        <EuiText size="xs">{label.length > 20 ? truncateText(label, 17) : label}</EuiText>
        {hasChildren && <EuiIcon type="arrowDown" size="s" />}
      </EuiFlexGroup>
    </div>
  );

  return (
    <StreamNodePopover
      isOpen={isPopoverOpen}
      onClose={() => setIsPopoverOpen(false)}
      stream={stream}
      button={nodeContent}
    />
  );
};
