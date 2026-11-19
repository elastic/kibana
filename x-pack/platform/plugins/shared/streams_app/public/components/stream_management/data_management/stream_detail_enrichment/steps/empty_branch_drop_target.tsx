/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { css } from '@emotion/react';
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { useEuiTheme } from '@elastic/eui';
import type { StreamlangUIBranch } from '@kbn/streamlang';

interface EmptyBranchDropTargetProps {
  parentId: string;
  branch: StreamlangUIBranch;
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
        const sourceStepId = source.data.stepId;
        if (typeof sourceStepId === 'string' && sourceStepId) {
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
        position: relative;
        height: ${euiTheme.size.s};
      `}
    >
      {isDraggedOver && (
        <div
          css={css`
            position: absolute;
            left: 0;
            right: 0;
            top: 50%;
            transform: translateY(-50%);
            height: ${euiTheme.size.xxs};
            background-color: ${euiTheme.colors.borderStrongAccentSecondary};
            border-radius: 1px;
            pointer-events: none;
          `}
        />
      )}
    </div>
  );
};
