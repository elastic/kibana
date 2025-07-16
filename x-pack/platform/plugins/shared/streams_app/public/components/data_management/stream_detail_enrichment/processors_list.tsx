/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDraggable, EuiTimelineItem } from '@elastic/eui';
import { css } from '@emotion/react';
import { ProcessorConfiguration, ProcessorConfigurationProps } from './processors';
import { ProcessorStatusIndicator } from './processor_status_indicator';

export const DraggableProcessorListItem = ({
  idx,
  isDragDisabled,
  ...props
}: Omit<ProcessorConfigurationProps, 'dragHandleProps'> & {
  idx: number;
  isDragDisabled: boolean;
}) => {
  return (
    <EuiTimelineItem
      verticalAlign="top"
      icon={<ProcessorStatusIndicator processorRef={props.processorRef} />}
      css={css`
        [class*='euiTimelineItemEvent'] {
          min-width: 0;
        }
        [class*='euiTimelineItemIcon-top'] {
          translate: 0 9px; // (50px - 32px) / 2 => Height of the block minus the avatar size to center the item
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
