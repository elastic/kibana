/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import React from 'react';

import type { OnListUpdated } from '../../../assistant/settings/use_settings_updater/use_anonymization_updater';
import { HandleRowChecked } from '../../context_editor/selection/types';
import { SELECTED_FIELDS } from '../../context_editor/translations';
import { BulkActions } from '../../context_editor/bulk_actions';

export interface Props {
  handleRowChecked: HandleRowChecked;
  onListUpdated: OnListUpdated;
  selectedFields: string[];
}

const ToolbarComponent: React.FC<Props> = ({ handleRowChecked, onListUpdated, selectedFields }) => {
  return (
    <EuiFlexGroup alignItems="center" data-test-subj="toolbar" gutterSize="none">
      <EuiFlexItem grow={false}>
        <EuiText color="subdued" data-test-subj="selectedFields" size="xs">
          {SELECTED_FIELDS(selectedFields.length)}
        </EuiText>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <BulkActions
          appliesTo="multipleRows"
          disabled={selectedFields.length === 0}
          onListUpdated={onListUpdated}
          selectedFields={selectedFields}
          handleRowChecked={handleRowChecked}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

ToolbarComponent.displayName = 'ToolbarComponent';

export const Toolbar = React.memo(ToolbarComponent);
