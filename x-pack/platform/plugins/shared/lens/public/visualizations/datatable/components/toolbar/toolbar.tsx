/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';
import { EuiFlexGroup } from '@elastic/eui';
import { ToolbarPopover } from '../../../../shared_components';
import type { VisualizationToolbarProps } from '../../../../types';
import type { DatatableVisualizationState } from '../../visualization';
import { AppearanceSettings } from './appearance_settings';

export function Toolbar(props: VisualizationToolbarProps<DatatableVisualizationState>) {
  const { state, setState } = props;

  return (
    <EuiFlexGroup alignItems="center" gutterSize="none" responsive={false}>
      <ToolbarPopover
        title={i18n.translate('xpack.lens.table.valuesVisualOptions', {
          defaultMessage: 'Visual options',
        })}
        type="visualOptions"
        groupPosition="none"
        buttonDataTestSubj="lnsVisualOptionsButton"
        data-test-subj="lnsVisualOptionsPopover"
      >
        <AppearanceSettings state={state} setState={setState} />
      </ToolbarPopover>
    </EuiFlexGroup>
  );
}
