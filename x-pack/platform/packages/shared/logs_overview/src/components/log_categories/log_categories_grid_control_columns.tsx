/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiScreenReaderOnly } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { LogCategory } from '../../types';
import { createLogCategoriesGridExpandButton } from './log_categories_grid_expand_button';

const DEFAULT_CONTROL_COLUMN_WIDTH = 40;

interface ControlColumnsProps {
  expandedRowIndex: number | null;
  onOpenFlyout: (category: LogCategory, rowIndex: number) => void;
  onCloseFlyout: () => void;
}

export const createLogCategoriesGridControlColumns = (props: ControlColumnsProps) => {
  const { expandedRowIndex, onOpenFlyout, onCloseFlyout } = props;

  return [
    {
      id: 'toggleFlyout',
      width: DEFAULT_CONTROL_COLUMN_WIDTH,
      headerCellRender: () => (
        <EuiScreenReaderOnly>
          <span>
            {i18n.translate('xpack.observabilityLogsOverview.controlColumnHeader', {
              defaultMessage: 'Control column',
            })}
          </span>
        </EuiScreenReaderOnly>
      ),
      rowCellRender: createLogCategoriesGridExpandButton({
        expandedRowIndex,
        onOpenFlyout,
        onCloseFlyout,
      }),
    },
  ];
};
