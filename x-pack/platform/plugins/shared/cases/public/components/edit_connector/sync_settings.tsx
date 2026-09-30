/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSelect, EuiSwitch } from '@elastic/eui';

import type { CaseUI } from '../../../common/ui/types';
import type { ExternalSyncSettings } from '../../../common/types/domain';
import * as i18n from './translations';

const DEFAULT_EXTERNAL_SYNC: ExternalSyncSettings = {
  autoPush: false,
  conflictStrategy: 'external',
};

const CONFLICT_STRATEGY_OPTIONS = [
  { value: 'external', text: i18n.CONFLICT_KEEP_EXTERNAL },
  { value: 'kibana', text: i18n.CONFLICT_KEEP_KIBANA },
];

interface SyncSettingsProps {
  settings: CaseUI['settings'];
  disabled: boolean;
  onChange: (settings: CaseUI['settings']) => void;
}

const SyncSettingsComponent: React.FC<SyncSettingsProps> = ({ settings, disabled, onChange }) => {
  const externalSync = settings.externalSync ?? DEFAULT_EXTERNAL_SYNC;

  const update = useCallback(
    (patch: Partial<ExternalSyncSettings>) =>
      onChange({ ...settings, externalSync: { ...externalSync, ...patch } }),
    [externalSync, onChange, settings]
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="s" data-test-subj="connector-sync-settings">
      <EuiFlexItem grow={false}>
        <EuiSwitch
          compressed
          label={i18n.AUTO_PUSH_LABEL}
          checked={externalSync.autoPush}
          disabled={disabled}
          onChange={(e) => update({ autoPush: e.target.checked })}
          data-test-subj="connector-auto-push-switch"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFormRow label={i18n.CONFLICT_STRATEGY_LABEL} display="rowCompressed" fullWidth>
          <EuiSelect
            compressed
            fullWidth
            options={CONFLICT_STRATEGY_OPTIONS}
            value={externalSync.conflictStrategy}
            disabled={disabled}
            onChange={(e) => {
              const { value } = e.target;
              if (value === 'external' || value === 'kibana') {
                update({ conflictStrategy: value });
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
