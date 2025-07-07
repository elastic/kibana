/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import React, { useCallback } from 'react';

import { FindAnonymizationFieldsResponse } from '@kbn/elastic-assistant-common';
import { BulkActions } from '../bulk_actions';
import * as i18n from '../translations';
import { ContextEditorRow } from '../types';
import type { OnListUpdated } from '../../../assistant/settings/use_settings_updater/use_anonymization_updater';
import type { HandleRowChecked } from '../selection/types';

export interface Props {
  isSelectAll: boolean;
  anonymizationAllFields: FindAnonymizationFieldsResponse;
  onListUpdated: OnListUpdated;
  onSelectAll: (totalCount: number) => void;
  handleUnselectAll: () => void;
  selected: string[];
  totalFields: number;
  rows?: ContextEditorRow[];
  handleRowChecked: HandleRowChecked;
}

const ToolbarComponent: React.FC<Props> = ({
  isSelectAll,
  anonymizationAllFields,
  onListUpdated,
  onSelectAll,
  handleUnselectAll,
  selected,
  totalFields,
  rows = [],
  handleRowChecked,
}) => {
  const onSelectAllClicked = useCallback(() => {
    onSelectAll(totalFields);
  }, [onSelectAll, totalFields]);
  return (
    <EuiFlexGroup alignItems="center" data-test-subj="toolbar" gutterSize="none">
      <EuiFlexItem grow={false}>
        <EuiText color="subdued" data-test-subj="selectedFields" size="xs">
          {i18n.SELECTED_FIELDS(selected.length)}
        </EuiText>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        {selected.length === totalFields ? (
          <EuiButtonEmpty
            data-test-subj="unselectAllFields"
            iconType="pagesSelect"
            onClick={handleUnselectAll}
            size="xs"
          >
            {i18n.UNSELECT_ALL_FIELDS(selected.length)}
          </EuiButtonEmpty>
        ) : (
          <EuiButtonEmpty
            data-test-subj="selectAllFields"
            iconType="pagesSelect"
            onClick={onSelectAllClicked}
            size="xs"
          >
            {i18n.SELECT_ALL_FIELDS(totalFields)}
          </EuiButtonEmpty>
        )}
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <BulkActions
          isSelectAll={isSelectAll}
          anonymizationAllFields={anonymizationAllFields}
          appliesTo="multipleRows"
          disabled={selected.length === 0}
          onListUpdated={onListUpdated}
          selected={anonymizationAllFields.data.filter((r) => selected.includes(r.field))}
          handleRowChecked={handleRowChecked}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

ToolbarComponent.displayName = 'ToolbarComponent';

export const Toolbar = React.memo(ToolbarComponent);
