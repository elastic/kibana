/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiLink, EuiText, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useState } from 'react';
import type { AiIndexHttpItem } from '../../../../../common/http_api/ai_indices';
import { useNavigation } from '../../../hooks/use_navigation';
import { CONTEXT_ENGINE_PATHS } from '../../../paths';
import { AiIndexDeleteConfirmModal } from '../../ai_index_list';
import { SettingsPanel } from './settings_panel';
import { SettingsRow } from './settings_row';

interface AdvancedSectionProps {
  aiIndex: AiIndexHttpItem;
  indexManagementHref: string | undefined;
}

export const AdvancedSection = ({ aiIndex, indexManagementHref }: AdvancedSectionProps) => {
  const { navigateToContextEngine } = useNavigation();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const isManaged = aiIndex.managed === true;

  const deleteButton = (
    <EuiButton
      color="danger"
      size="s"
      iconType="trash"
      isDisabled={isManaged}
      onClick={() => setIsDeleteModalOpen(true)}
      data-test-subj="contextAiIndexSettingsDeleteButton"
    >
      <FormattedMessage
        id="xpack.contextEngine.aiIndexDetail.settings.delete.button"
        defaultMessage="Delete AI index"
      />
    </EuiButton>
  );

  return (
    <SettingsPanel
      data-test-subj="contextAiIndexSettingsAdvanced"
      title={
        <FormattedMessage
          id="xpack.contextEngine.aiIndexDetail.settings.advanced.title"
          defaultMessage="Advanced"
        />
      }
    >
      <SettingsRow
        data-test-subj="contextAiIndexSettingsBackingIndex"
        title={
          <FormattedMessage
            id="xpack.contextEngine.aiIndexDetail.settings.backingIndex.title"
            defaultMessage="Backing index"
          />
        }
        description={
          <FormattedMessage
            id="xpack.contextEngine.aiIndexDetail.settings.backingIndex.description"
            defaultMessage="For snapshots, retention or permissions."
          />
        }
      >
        {indexManagementHref !== undefined ? (
          <EuiLink
            external
            href={indexManagementHref}
            data-test-subj="contextAiIndexSettingsBackingIndexName"
          >
            {aiIndex.dest.value}
          </EuiLink>
        ) : (
          <EuiText size="s" data-test-subj="contextAiIndexSettingsBackingIndexName">
            <span>{aiIndex.dest.value}</span>
          </EuiText>
        )}
      </SettingsRow>
      <SettingsRow
        data-test-subj="contextAiIndexSettingsDelete"
        title={
          <FormattedMessage
            id="xpack.contextEngine.aiIndexDetail.settings.delete.title"
            defaultMessage="Delete AI index"
          />
        }
        description={
          <FormattedMessage
            id="xpack.contextEngine.aiIndexDetail.settings.delete.description"
            defaultMessage="Connected agents stop retrieving from it. This cannot be undone."
          />
        }
      >
        <EuiFlexGroup responsive={false} gutterSize="none">
          <EuiFlexItem grow={false}>
            {isManaged ? (
              <EuiToolTip
                content={i18n.translate(
                  'xpack.contextEngine.aiIndexDetail.settings.delete.managedTooltip',
                  { defaultMessage: 'This AI index is managed and cannot be deleted.' }
                )}
              >
                {deleteButton}
              </EuiToolTip>
            ) : (
              deleteButton
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </SettingsRow>
      {isDeleteModalOpen && (
        <AiIndexDeleteConfirmModal
          aiIndex={aiIndex}
          onClose={() => setIsDeleteModalOpen(false)}
          onSuccess={() => navigateToContextEngine(CONTEXT_ENGINE_PATHS.landing)}
        />
      )}
    </SettingsPanel>
  );
};
