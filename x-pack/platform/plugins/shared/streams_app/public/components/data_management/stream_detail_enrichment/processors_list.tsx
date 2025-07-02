/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDraggable } from '@elastic/eui';
import { EditProcessorPanel, type EditProcessorPanelProps } from './processors';

export const DraggableProcessorListItem = ({
  idx,
  disableDrag,
  ...props
}: EditProcessorPanelProps & { idx: number; disableDrag: boolean }) => (
  <EuiDraggable
    index={idx}
    spacing="m"
    draggableId={props.processorRef.id}
    hasInteractiveChildren
    isDragDisabled={disableDrag}
    css={{
      paddingLeft: 0,
      paddingRight: 0,
    }}
  >
    {() => <EditProcessorPanel {...props} />}
  </EuiDraggable>
);
