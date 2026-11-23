/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDataGridCellPopoverElementProps } from '@elastic/eui';
import { useEuiTheme } from '@elastic/eui';
import React, { useEffect } from 'react';

export const WorkflowExecuteDataGridCellPopover = (
  props: EuiDataGridCellPopoverElementProps
): React.JSX.Element => {
  const { euiTheme } = useEuiTheme();
  const { DefaultCellPopover, setCellPopoverProps } = props;

  useEffect(() => {
    setCellPopoverProps({
      zIndex: Math.max(Number(euiTheme.levels.toast), Number(euiTheme.levels.modal)) + 1,
    });
  }, [euiTheme.levels.modal, euiTheme.levels.toast, setCellPopoverProps]);

  return <DefaultCellPopover {...props} />;
};

WorkflowExecuteDataGridCellPopover.displayName = 'WorkflowExecuteDataGridCellPopover';
