/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useSelector } from '@xstate5/react';
import { EuiAvatar, EuiDraggable, EuiTimelineItem } from '@elastic/eui';
import { css } from '@emotion/react';
import { ProcessorConfiguration, ProcessorConfigurationProps } from './processors';

export const DraggableProcessorListItem = ({
  idx,
  isDragDisabled,
  ...props
}: Omit<ProcessorConfigurationProps, 'dragHandleProps'> & {
  idx: number;
  isDragDisabled: boolean;
}) => {
  const isOpen = useSelector(
    props.processorRef,
    (snapshot) => snapshot.matches('draft') || snapshot.matches({ configured: 'editing' })
  );
  return (
    <EuiTimelineItem
      verticalAlign="top"
      icon={<EuiAvatar name="Checked" iconType="check" size="s" color="#c9f3e3" />}
      css={css`
        [class*='euiTimelineItemEvent'] {
          min-width: 0;
        }
      `}
    >
      <EuiDraggable
        index={idx}
        spacing="none"
        draggableId={props.processorRef.id}
        hasInteractiveChildren
        customDragHandle
        isDragDisabled={isDragDisabled}
      >
        {(provided) => (
          <ProcessorConfiguration
            {...props}
            dragHandleProps={isDragDisabled ? null : provided.dragHandleProps}
          />
        )}
      </EuiDraggable>
    </EuiTimelineItem>
  );
};
