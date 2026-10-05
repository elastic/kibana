/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSelect, EuiSwitch } from '@elastic/eui';

import type { ExternalSyncSettings } from '../../../common/types/domain';
import * as i18n from './translations';

export const DEFAULT_EXTERNAL_SYNC: ExternalSyncSettings = {
  autoPush: false,
  conflictStrategy: 'external',
};

const CONFLICT_STRATEGY_OPTIONS = [
  { value: 'external', text: i18n.CONFLICT_KEEP_EXTERNAL },
  { value: 'kibana', text: i18n.CONFLICT_KEEP_KIBANA },
];

interface SyncSettingsProps {
  value?: ExternalSyncSettings;
  disabled?: boolean;
  compressed?: boolean;
  onChange: (value: ExternalSyncSettings) => void;
}

const SyncSettingsComponent: React.FC<SyncSettingsProps> = ({
  value = DEFAULT_EXTERNAL_SYNC,
  disabled = false,
  compressed = false,
  onChange,
}) => {
  const update = useCallback(
    (patch: Partial<ExternalSyncSettings>) => onChange({ ...value, ...patch }),
    [onChange, value]
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="s" data-test-subj="connector-sync-settings">
      <EuiFlexItem grow={false}>
        <EuiSwitch
          compressed={compressed}
          label={i18n.AUTO_PUSH_LABEL}
          checked={value.autoPush}
          disabled={disabled}
          onChange={(e) => update({ autoPush: e.target.checked })}
          data-test-subj="connector-auto-push-switch"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFormRow
          label={i18n.CONFLICT_STRATEGY_LABEL}
          display={compressed ? 'rowCompressed' : 'row'}
          fullWidth
        >
          <EuiSelect
            compressed={compressed}
            fullWidth
            options={CONFLICT_STRATEGY_OPTIONS}
            value={value.conflictStrategy}
            disabled={disabled}
            onChange={(e) => {
              const strategy = e.target.value;
              if (strategy === 'external' || strategy === 'kibana') {
                update({ conflictStrategy: strategy });
              }
            }}
            aria-label={i18n.CONFLICT_STRATEGY_LABEL}
            data-test-subj="connector-conflict-strategy-select"
          />
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

SyncSettingsComponent.displayName = 'SyncSettings';

export const SyncSettings = React.memo(SyncSettingsComponent);
