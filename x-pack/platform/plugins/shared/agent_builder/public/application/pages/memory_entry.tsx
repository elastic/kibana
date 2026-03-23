/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiMarkdownFormat,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMemoryEntry, useMemoryMutations } from '../hooks/use_memory';
import { useNavigation } from '../hooks/use_navigation';
import { useBreadcrumb } from '../hooks/use_breadcrumbs';
import { appPaths } from '../utils/app_paths';

export const AgentBuilderMemoryEntryPage: React.FC = () => {
  const { entryId } = useParams<{ entryId: string }>();
  const { euiTheme } = useEuiTheme();
  const { navigateToAgentBuilderUrl } = useNavigation();
  const { data: entry, isLoading } = useMemoryEntry(entryId);
  const { updateEntry, deleteEntry } = useMemoryMutations();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useBreadcrumb([
    {
      text: i18n.translate('xpack.agentBuilder.memory.breadcrumb', {
        defaultMessage: 'Memory',
      }),
      path: appPaths.memory.list,
    },
    {
      text: entry?.title ?? '...',
      path: entryId ? appPaths.memory.entry({ entryId }) : appPaths.memory.list,
    },
  ]);

  const handleEdit = useCallback(() => {
    if (entry) {
      setEditContent(entry.content);
      setIsEditing(true);
    }
  }, [entry]);

  const handleSave = useCallback(() => {
    if (entry && editContent !== entry.content) {
      updateEntry.mutate(
        { id: entry.id, content: editContent, change_summary: 'Manual edit via UI' },
        {
          onSuccess: () => setIsEditing(false),
        }
      );
    } else {
      setIsEditing(false);
    }
  }, [entry, editContent, updateEntry]);

  const handleDelete = useCallback(() => {
    if (entry) {
      deleteEntry.mutate(entry.id, {
        onSuccess: () => navigateToAgentBuilderUrl(appPaths.memory.list),
      });
    }
  }, [entry, deleteEntry, navigateToAgentBuilderUrl]);

  if (isLoading) {
    return (
      <KibanaPageTemplate>
        <KibanaPageTemplate.Section>
          <EuiLoadingSpinner size="l" />
        </KibanaPageTemplate.Section>
      </KibanaPageTemplate>
    );
  }

  if (!entry) {
    return (
      <KibanaPageTemplate>
        <KibanaPageTemplate.Section>
          <EuiText>
            {i18n.translate('xpack.agentBuilder.memory.entryNotFound', {
              defaultMessage: 'Memory entry not found.',
            })}
          </EuiText>
        </KibanaPageTemplate.Section>
      </KibanaPageTemplate>
    );
  }

  return (
    <KibanaPageTemplate data-test-subj="agentBuilderMemoryEntryPage">
      <KibanaPageTemplate.Header
        pageTitle={entry.title}
        description={entry.path}
        css={css`
          background-color: ${euiTheme.colors.backgroundBasePlain};
          border-block-end: none;
        `}
        rightSideItems={[
          <EuiButton
            key="history-button"
            onClick={() => navigateToAgentBuilderUrl(appPaths.memory.history({ entryId }))}
            data-test-subj="agentBuilderMemoryHistoryButton"
          >
            {i18n.translate('xpack.agentBuilder.memory.historyButton', {
              defaultMessage: 'History',
            })}
          </EuiButton>,
          <EuiButton
            key="edit-button"
            onClick={handleEdit}
            disabled={isEditing}
            data-test-subj="agentBuilderMemoryEditButton"
          >
            {i18n.translate('xpack.agentBuilder.memory.editButton', {
              defaultMessage: 'Edit',
            })}
          </EuiButton>,
          <EuiButtonEmpty
            key="delete-button"
            color="danger"
            onClick={() => setShowDeleteModal(true)}
            data-test-subj="agentBuilderMemoryDeleteButton"
          >
            {i18n.translate('xpack.agentBuilder.memory.deleteButton', {
              defaultMessage: 'Delete',
            })}
          </EuiButtonEmpty>,
        ]}
      />
      <KibanaPageTemplate.Section>
        <EuiFlexGroup gutterSize="s" wrap>
          {entry.tags.map((tag) => (
            <EuiFlexItem key={tag} grow={false}>
              <EuiBadge>{tag}</EuiBadge>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiText size="xs" color="subdued">
          {i18n.translate('xpack.agentBuilder.memory.entryMeta', {
            defaultMessage: 'Version {version} · Updated {updatedAt} by {updatedBy}',
            values: {
              version: entry.version,
              updatedAt: new Date(entry.updated_at).toLocaleString(),
              updatedBy: entry.updated_by,
            },
          })}
        </EuiText>
        <EuiSpacer size="m" />

        {isEditing ? (
          <>
            <EuiTextArea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              fullWidth
              rows={20}
              data-test-subj="agentBuilderMemoryEditArea"
            />
            <EuiSpacer size="m" />
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  onClick={handleSave}
                  isLoading={updateEntry.isLoading}
                  data-test-subj="agentBuilderMemorySaveButton"
                >
                  {i18n.translate('xpack.agentBuilder.memory.saveButton', {
                    defaultMessage: 'Save',
                  })}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={() => setIsEditing(false)}>
                  {i18n.translate('xpack.agentBuilder.memory.cancelButton', {
                    defaultMessage: 'Cancel',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        ) : (
          <EuiMarkdownFormat>{entry.content}</EuiMarkdownFormat>
        )}
      </KibanaPageTemplate.Section>

      {showDeleteModal && (
        <EuiConfirmModal
          aria-label={i18n.translate('xpack.agentBuilder.memory.deleteConfirmAriaLabel', {
            defaultMessage: 'Confirm delete memory entry',
          })}
          title={i18n.translate('xpack.agentBuilder.memory.deleteConfirmTitle', {
            defaultMessage: 'Delete memory entry',
          })}
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          cancelButtonText={i18n.translate('xpack.agentBuilder.memory.deleteConfirmCancel', {
            defaultMessage: 'Cancel',
          })}
          confirmButtonText={i18n.translate('xpack.agentBuilder.memory.deleteConfirmButton', {
            defaultMessage: 'Delete',
          })}
          buttonColor="danger"
        >
          {i18n.translate('xpack.agentBuilder.memory.deleteConfirmBody', {
            defaultMessage:
              'Are you sure you want to delete "{title}"? This action cannot be undone.',
            values: { title: entry.title },
          })}
        </EuiConfirmModal>
      )}
    </KibanaPageTemplate>
  );
};
