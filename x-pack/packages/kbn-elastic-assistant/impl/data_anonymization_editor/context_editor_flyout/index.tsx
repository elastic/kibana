/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty, EuiHorizontalRule } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { i18n as I18n } from '@kbn/i18n';
import { AnonymizedData } from '@kbn/elastic-assistant-common/impl/data_anonymization/types';
import { SelectedPromptContextEditorModal } from '../context_editor_modal';
import { SelectedPromptContextPreview } from '../context_preview';
import { getStats } from '../get_stats';
import { AllowedStat } from '../stats/allowed_stat';
import { AnonymizedStat } from '../stats/anonymized_stat';
import { SelectedPromptContext } from '../../assistant/prompt_context/types';
import { BatchUpdateListItem } from '../context_editor/types';

interface ContextEditorFlyoutComponentProps {
  selectedPromptContext: SelectedPromptContext;
  currentReplacements?: AnonymizedData['replacements'];
  onListUpdated: (updates: BatchUpdateListItem[]) => void;
  isDataAnonymizable: boolean;
}

const ContextEditorFlyoutComponent: React.FC<ContextEditorFlyoutComponentProps> = ({
  selectedPromptContext,
  currentReplacements,
  onListUpdated,
  isDataAnonymizable,
}) => {
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [showRealValues, setShowRealValues] = useState<boolean>(false);
  const openEditModal = useCallback(() => setEditModalVisible(true), []);
  const closeEditModal = useCallback(() => {
    setEditModalVisible(false);
  }, []);

  const { allowed, anonymized, total } = useMemo(
    () => getStats(selectedPromptContext),
    [selectedPromptContext]
  );

  return (
    <>
      <EuiFlexGroup
        alignItems="center"
        justifyContent="spaceBetween"
        data-test-subj="summary"
        gutterSize="m"
      >
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem grow={false}>
              <AllowedStat allowed={allowed} total={total} inline />
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <AnonymizedStat
                anonymized={anonymized}
                isDataAnonymizable={isDataAnonymizable}
                inline
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                iconType={showRealValues ? 'eyeClosed' : 'eye'}
                onClick={() => setShowRealValues(!showRealValues)}
              >
                {showRealValues
                  ? I18n.translate('kbnElasticAssistant.dataAnonymizationEditor.hideRealValues', {
                      defaultMessage: 'Show anonymized',
                    })
                  : I18n.translate('kbnElasticAssistant.dataAnonymizationEditor.showRealValues', {
                      defaultMessage: 'Show real values',
                    })}
              </EuiButtonEmpty>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiButtonEmpty size="xs" iconType="documentEdit" onClick={openEditModal}>
                {I18n.translate('kbnElasticAssistant.dataAnonymizationEditor.editButton', {
                  defaultMessage: 'Edit',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiHorizontalRule margin="xs" />
      <SelectedPromptContextPreview
        showRealValues={showRealValues}
        selectedPromptContext={selectedPromptContext}
        currentReplacements={currentReplacements}
      />
      {editModalVisible && (
        <SelectedPromptContextEditorModal
          promptContext={selectedPromptContext}
          onClose={closeEditModal}
          onSave={onListUpdated}
        />
      )}
    </>
  );
};

ContextEditorFlyoutComponent.displayName = 'ContextEditorFlyoutComponent';
export const ContextEditorFlyout = React.memo(ContextEditorFlyoutComponent);
