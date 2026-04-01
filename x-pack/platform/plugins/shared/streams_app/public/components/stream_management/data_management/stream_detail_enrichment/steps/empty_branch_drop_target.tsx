/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { css } from '@emotion/react';
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { EuiText, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface EmptyBranchDropTargetProps {
  parentId: string;
  branch: 'if' | 'else';
  onDrop: (sourceStepId: string, targetStepId: string, operation: 'inside' | 'inside-else') => void;
}

export const EmptyBranchDropTarget = ({ parentId, branch, onDrop }: EmptyBranchDropTargetProps) => {
  const { euiTheme } = useEuiTheme();
  const ref = useRef<HTMLDivElement | null>(null);
  const [isDraggedOver, setIsDraggedOver] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    return dropTargetForElements({
      element: el,
      onDragEnter: () => setIsDraggedOver(true),
      onDragLeave: () => setIsDraggedOver(false),
      onDrop: ({ source }) => {
        setIsDraggedOver(false);
        const sourceStepId = source.data.stepId as string;
        if (sourceStepId) {
          onDrop(sourceStepId, parentId, branch === 'else' ? 'inside-else' : 'inside');
        }
      },
      canDrop: ({ source }) => {
        return source.data.stepId !== parentId;
      },
    });
  }, [parentId, branch, onDrop]);

  return (
    <div
      ref={ref}
      css={css`
        border: 1px dashed
          ${isDraggedOver
            ? euiTheme.colors.borderStrongAccentSecondary
            : euiTheme.colors.borderBasePlain};
        border-radius: ${euiTheme.border.radius.medium};
        padding: ${euiTheme.size.s} ${euiTheme.size.m};
        text-align: center;
        transition: border-color 150ms ease-in-out, background-color 150ms ease-in-out;
        ${isDraggedOver ? `background-color: ${euiTheme.colors.backgroundBaseSubdued};` : ''}
      `}
    >
      <EuiText size="xs" color="subdued">
        {i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.emptyBranchDropTarget',
          { defaultMessage: 'Drop a processor here' }
        )}
      </EuiText>
    </div>
  );
};
