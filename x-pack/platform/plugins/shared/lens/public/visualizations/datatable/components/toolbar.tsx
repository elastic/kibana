/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';
import { EuiFlexGroup } from '@elastic/eui';
import type { VisualizationToolbarProps, DatatableVisualizationState } from '@kbn/lens-common';
import { ToolbarPopover } from '../../../shared_components';

import { DatatableAppearanceSettings } from './appearance_settings';

/**
 * TODO: Remove this file after migration to flyout toolbar
 * See: https://github.com/elastic/kibana/issues/240088
 */

export function DataTableToolbar(props: VisualizationToolbarProps<DatatableVisualizationState>) {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="none" responsive={false}>
      {/* Appearance settings popover */}
      <ToolbarPopover
        title={i18n.translate('xpack.lens.table.valuesVisualOptions', {
          defaultMessage: 'Visual options',
        })}
        type="visualOptions"
        groupPosition="none"
        buttonDataTestSubj="lnsVisualOptionsButton"
        data-test-subj="lnsVisualOptionsPopover"
      >
        <DatatableAppearanceSettings {...props} />
      </ToolbarPopover>
    </EuiFlexGroup>
  );
}
