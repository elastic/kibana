/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty, EuiButton } from '@elastic/eui';
import React from 'react';
import { CustomMetricMode } from './types';
import { SnapshotCustomMetricInput } from '../../../../common/http_api/snapshot_api';

interface Props {
  onEdit: () => void;
  onAdd: () => void;
  onSave: () => void;
  onEditCancel: () => void;
  mode: CustomMetricMode;
  customMetrics: SnapshotCustomMetricInput[];
}

export const ModeSwitcher = ({
  onSave,
  onEditCancel,
  onEdit,
  onAdd,
  mode,
  customMetrics,
}: Props) => {
  if (['editMetric', 'addMetric'].includes(mode)) {
    return null;
  }
  return (
    <div style={{ borderTop: '1px solid #DDD', padding: 12 }}>
      <EuiFlexGroup justifyContent="spaceBetween">
        {mode === 'edit' ? (
          <>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty size="s" flush="left" onClick={onEditCancel}>
                Cancel
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton onClick={onSave} size="s" fill>
                Save
              </EuiButton>
            </EuiFlexItem>
          </>
        ) : (
          <>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                flush="left"
                onClick={onEdit}
                disabled={customMetrics.length === 0}
              >
                Edit metrics
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={onAdd} size="s" flush="right">
                Add metric
              </EuiButtonEmpty>
            </EuiFlexItem>
          </>
        )}
      </EuiFlexGroup>
    </div>
  );
};
