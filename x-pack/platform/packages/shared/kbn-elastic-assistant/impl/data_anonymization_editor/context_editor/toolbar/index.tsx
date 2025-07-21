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
import type { OnListUpdated } from '../../../assistant/settings/use_settings_updater/use_anonymization_updater';
import type { HandleRowChecked } from '../selection/types';

export interface Props {
  anonymizationAllFieldsData: FindAnonymizationFieldsResponse['data'];
  handleRowChecked: HandleRowChecked;
  handleUnselectAll: () => void;
  onListUpdated: OnListUpdated;
  onSelectAll: (totalCount: number) => void;
  selectedFields: string[];
  totalFields: number;
}

const ToolbarComponent: React.FC<Props> = ({
  anonymizationAllFieldsData,
  onListUpdated,
  onSelectAll,
  handleUnselectAll,
  selectedFields,
  totalFields,
  handleRowChecked,
}) => {
  const onSelectAllClicked = useCallback(() => {
    onSelectAll(totalFields);
  }, [onSelectAll, totalFields]);
  return (
    <EuiFlexGroup alignItems="center" data-test-subj="toolbar" gutterSize="none">
      <EuiFlexItem grow={false}>
        <EuiText color="subdued" data-test-subj="selectedFields" size="xs">
          {i18n.SELECTED_FIELDS(selectedFields.length)}
        </EuiText>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        {selectedFields.length === totalFields ? (
          <EuiButtonEmpty
            data-test-subj="unselectAllFields"
            iconType="pagesSelect"
            onClick={handleUnselectAll}
            size="xs"
          >
            {i18n.UNSELECT_ALL_FIELDS(selectedFields.length)}
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
