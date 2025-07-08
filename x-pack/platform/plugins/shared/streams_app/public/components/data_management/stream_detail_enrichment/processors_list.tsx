/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDraggable } from '@elastic/eui';
import { ProcessorConfiguration, ProcessorConfigurationProps } from './processors';

export const DraggableProcessorListItem = ({
  idx,
  isDragDisabled,
  ...props
}: Omit<ProcessorConfigurationProps, 'dragHandleProps'> & {
  idx: number;
  isDragDisabled: boolean;
}) => (
  <EuiDraggable
    index={idx}
    spacing="m"
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
);
