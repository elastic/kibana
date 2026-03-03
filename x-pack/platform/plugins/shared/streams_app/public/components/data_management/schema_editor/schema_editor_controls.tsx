/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem, EuiFlexGroup, EuiSearchBar, EuiButton, EuiFilterGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FieldStatusFilterGroup } from './filters/status_filter_group';
import { FieldTypeFilterGroup } from './filters/type_filter_group';
import type { TControls } from './hooks/use_controls';
import type { SchemaEditorProps } from './types';
import { AddFieldButton } from './flyout/add_field_flyout';

interface ControlsProps {
  controls: TControls;
  onChange: (nextControls: Partial<TControls>) => void;
  onAddField: SchemaEditorProps['onAddField'];
  onRefreshData: SchemaEditorProps['onRefreshData'];
}

export function Controls({ controls, onAddField, onChange, onRefreshData }: ControlsProps) {
  return (
    <EuiFlexItem grow={false} data-test-subj="streamsAppSchemaEditorControls">
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <EuiSearchBar
            query={controls.query}
            onChange={(nextQuery) => onChange({ query: nextQuery.query ?? undefined })}
            box={{
              incremental: true,
            }}
          />
        </EuiFlexItem>
        <EuiFilterGroup fullWidth={true}>
          <FieldTypeFilterGroup onChange={onChange} />
          <FieldStatusFilterGroup onChange={onChange} />
        </EuiFilterGroup>
        {onRefreshData && (
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="streamsAppContentRefreshButton"
              iconType="refresh"
              onClick={onRefreshData}
            >
              {i18n.translate('xpack.streams.schemaEditor.refreshDataButtonLabel', {
                defaultMessage: 'Refresh',
              })}
            </EuiButton>
          </EuiFlexItem>
        )}
        {onAddField && (
          <EuiFlexItem grow={false}>
            <AddFieldButton onAddField={onAddField} />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiFlexItem>
  );
}
