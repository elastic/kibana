/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import type { GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import { useSaveAiIndexMemory } from '../../hooks/use_save_ai_index_memory';

interface MemoryPanelProps {
  isLoading: boolean;
  aiIndex: GetAiIndexResponse | undefined;
  onSaved: () => void;
}

export const MemoryPanel = ({ isLoading, aiIndex, onSaved }: MemoryPanelProps) => {
  const { saveMemoryEnabled, isSaving } = useSaveAiIndexMemory();

  const handleChange = async () => {
    if (!aiIndex) {
      return;
    }
    const saved = await saveMemoryEnabled(aiIndex, !aiIndex.memory_enabled);
    if (saved) {
      onSaved();
    }
  };

  return (
    <EuiPanel hasBorder paddingSize="l">
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h2>
              <FormattedMessage
                id="xpack.contextEngine.aiIndexDetail.memory.title"
                defaultMessage="Memory"
              />
            </h2>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiText size="s" color="subdued">
            <p>
              <FormattedMessage
                id="xpack.contextEngine.aiIndexDetail.memory.description"
                defaultMessage="Allow agents to save and recall memories in this AI index."
              />
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {isLoading ? (
            <EuiSkeletonText
              lines={1}
              data-test-subj="contextAiIndexMemoryLoading"
              css={{ width: 100 }}
            />
          ) : (
            <EuiSwitch
              label={
                <FormattedMessage
                  id="xpack.contextEngine.aiIndexDetail.memory.toggleLabel"
                  defaultMessage="Enable memory"
                />
              }
              checked={aiIndex?.memory_enabled ?? false}
              onChange={handleChange}
              disabled={aiIndex === undefined || aiIndex.managed || isSaving}
              data-test-subj="contextAiIndexMemoryToggle"
              compressed
            />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
