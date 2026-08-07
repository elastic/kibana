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
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiMarkdownFormat,
  EuiSkeletonText,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTextArea,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { MemoryEntry } from '@kbn/agent-memory-common';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo, useState } from 'react';
import { useMemoryEntry, useMemoryEntryMutations, useMemoryHistory } from '../../hooks/use_memory';

type FlyoutTab = 'content' | 'history';

interface MemoryEntryFlyoutProps {
  entryId: string;
  canManage: boolean;
  onClose: () => void;
}

const parseList = (value: string): string[] =>
  value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

export const MemoryEntryFlyout = ({ entryId, canManage, onClose }: MemoryEntryFlyoutProps) => {
  const { data: entry, isLoading } = useMemoryEntry({ id: entryId });

  if (isLoading || !entry) {
    return (
      <EuiFlyout
        onClose={onClose}
        size="m"
        aria-label={i18n.translate('xpack.contextEngine.memory.entryFlyoutLoadingAriaLabel', {
          defaultMessage: 'Loading memory page',
        })}
        data-test-subj="contextMemoryEntryFlyout"
      >
        <EuiFlyoutBody>
          <EuiSkeletonText lines={6} />
        </EuiFlyoutBody>
      </EuiFlyout>
    );
  }

  return <LoadedMemoryEntryFlyout entry={entry} canManage={canManage} onClose={onClose} />;
};

const LoadedMemoryEntryFlyout = ({
  entry,
  canManage,
  onClose,
}: {
  entry: MemoryEntry;
  canManage: boolean;
  onClose: () => void;
}) => {
  const titleId = useGeneratedHtmlId({ prefix: 'contextMemoryEntryFlyout' });
  const [tab, setTab] = useState<FlyoutTab>('content');
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [title, setTitle] = useState(entry.title);
  const [content, setContent] = useState(entry.content);
  const [categories, setCategories] = useState(entry.categories.join(', '));
  const [tags, setTags] = useState(entry.tags.join(', '));

  const { update, remove } = useMemoryEntryMutations();
  const { data: historyData, isLoading: isHistoryLoading } = useMemoryHistory({
    id: entry.id,
    enabled: tab === 'history',
  });

  const isDirty = useMemo(
    () =>
      title !== entry.title ||
      content !== entry.content ||
      categories !== entry.categories.join(', ') ||
      tags !== entry.tags.join(', '),
    [title, content, categories, tags, entry]
  );

  const handleSave = useCallback(async () => {
    // Send only what changed, so an untouched field never overwrites a concurrent
    // edit by an agent.
    await update.mutateAsync({
      id: entry.id,
      body: {
        ...(title !== entry.title ? { title } : {}),
        ...(content !== entry.content ? { content } : {}),
        ...(categories !== entry.categories.join(', ')
          ? { categories: parseList(categories) }
          : {}),
        ...(tags !== entry.tags.join(', ') ? { tags: parseList(tags) } : {}),
      },
    });
    setIsEditing(false);
  }, [update, entry, title, content, categories, tags]);

  const handleDelete = useCallback(async () => {
    await remove.mutateAsync({ id: entry.id });
    setIsConfirmingDelete(false);
    onClose();
  }, [remove, entry.id, onClose]);

  return (
    <>
      <EuiFlyout
        onClose={onClose}
        aria-labelledby={titleId}
        data-test-subj="contextMemoryEntryFlyout"
        size="m"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="s">
            <h2 id={titleId}>{entry.title}</h2>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.contextEngine.memory.entryMeta', {
              defaultMessage: '{name} · version {version} · updated by {user}',
              values: { name: entry.name, version: entry.version, user: entry.updated_by },
            })}
          </EuiText>
          <EuiSpacer size="s" />
          <EuiTabs bottomBorder={false}>
            <EuiTab isSelected={tab === 'content'} onClick={() => setTab('content')}>
              {i18n.translate('xpack.contextEngine.memory.contentTab', {
                defaultMessage: 'Content',
              })}
            </EuiTab>
            <EuiTab isSelected={tab === 'history'} onClick={() => setTab('history')}>
              {i18n.translate('xpack.contextEngine.memory.historyTab', {
                defaultMessage: 'History',
              })}
            </EuiTab>
          </EuiTabs>
        </EuiFlyoutHeader>

        <EuiFlyoutBody>
          {tab === 'content' &&
            (isEditing ? (
              <EuiForm component="form">
                <EuiFormRow
                  label={i18n.translate('xpack.contextEngine.memory.titleLabel', {
                    defaultMessage: 'Title',
                  })}
                  fullWidth
                >
                  <EuiFieldText
                    fullWidth
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    data-test-subj="contextMemoryEditTitle"
                  />
                </EuiFormRow>
                <EuiFormRow
                  label={i18n.translate('xpack.contextEngine.memory.contentLabel', {
                    defaultMessage: 'Content',
                  })}
                  helpText={i18n.translate('xpack.contextEngine.memory.contentHelp', {
                    defaultMessage: 'Markdown.',
                  })}
                  fullWidth
                >
                  <EuiTextArea
                    fullWidth
                    rows={18}
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    data-test-subj="contextMemoryEditContent"
                  />
                </EuiFormRow>
                <EuiFormRow
                  label={i18n.translate('xpack.contextEngine.memory.categoriesLabel', {
                    defaultMessage: 'Categories',
                  })}
                  helpText={i18n.translate('xpack.contextEngine.memory.categoriesHelp', {
                    defaultMessage: 'Comma-separated. Nest with a slash, e.g. services/checkout.',
                  })}
                  fullWidth
                >
                  <EuiFieldText
                    fullWidth
                    value={categories}
                    onChange={(event) => setCategories(event.target.value)}
                    data-test-subj="contextMemoryEditCategories"
                  />
                </EuiFormRow>
                <EuiFormRow
                  label={i18n.translate('xpack.contextEngine.memory.tagsLabel', {
                    defaultMessage: 'Tags',
                  })}
                  fullWidth
                >
                  <EuiFieldText
                    fullWidth
                    value={tags}
                    onChange={(event) => setTags(event.target.value)}
                    data-test-subj="contextMemoryEditTags"
                  />
                </EuiFormRow>
              </EuiForm>
            ) : (
              <>
                {entry.categories.length > 0 && (
                  <>
                    <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
                      {entry.categories.map((category) => (
                        <EuiFlexItem grow={false} key={category}>
                          <EuiBadge color="hollow">{category}</EuiBadge>
                        </EuiFlexItem>
                      ))}
                    </EuiFlexGroup>
                    <EuiSpacer size="m" />
                  </>
                )}
                <EuiMarkdownFormat textSize="s">{entry.content}</EuiMarkdownFormat>
              </>
            ))}

          {tab === 'history' && (
            <>
              {isHistoryLoading && (
                <EuiText size="s" color="subdued">
                  {i18n.translate('xpack.contextEngine.memory.historyLoading', {
                    defaultMessage: 'Loading history…',
                  })}
                </EuiText>
              )}
              {historyData?.history.map((record) => (
                <React.Fragment key={`${record.entry_id}-${record.version}`}>
                  <EuiText size="s">
                    <strong>
                      {i18n.translate('xpack.contextEngine.memory.historyVersion', {
                        defaultMessage: 'v{version} — {changeType}',
                        values: { version: record.version, changeType: record.change_type },
                      })}
                    </strong>
                  </EuiText>
                  <EuiText size="xs" color="subdued">
                    {record.change_summary}
                  </EuiText>
                  <EuiText size="xs" color="subdued">
                    {i18n.translate('xpack.contextEngine.memory.historyByline', {
                      defaultMessage: '{user} · {date}',
                      values: { user: record.created_by, date: record.created_at },
                    })}
                  </EuiText>
                  <EuiSpacer size="m" />
                </React.Fragment>
              ))}
            </>
          )}
        </EuiFlyoutBody>

        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={onClose} flush="left">
                {i18n.translate('xpack.contextEngine.memory.closeLabel', {
                  defaultMessage: 'Close',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
            {canManage && tab === 'content' && (
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="s" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      color="danger"
                      onClick={() => setIsConfirmingDelete(true)}
                      data-test-subj="contextMemoryDeleteEntryButton"
                    >
                      {i18n.translate('xpack.contextEngine.memory.deleteLabel', {
                        defaultMessage: 'Delete',
                      })}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    {isEditing ? (
                      <EuiButton
                        fill
                        isDisabled={!isDirty}
                        isLoading={update.isLoading}
                        onClick={handleSave}
                        data-test-subj="contextMemorySaveEntryButton"
                      >
                        {i18n.translate('xpack.contextEngine.memory.saveLabel', {
                          defaultMessage: 'Save',
                        })}
                      </EuiButton>
                    ) : (
                      <EuiButton
                        onClick={() => setIsEditing(true)}
                        data-test-subj="contextMemoryEditEntryButton"
                      >
                        {i18n.translate('xpack.contextEngine.memory.editLabel', {
                          defaultMessage: 'Edit',
                        })}
                      </EuiButton>
                    )}
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>

      {isConfirmingDelete && (
        <EuiConfirmModal
          aria-label={i18n.translate('xpack.contextEngine.memory.deleteConfirmAriaLabel', {
            defaultMessage: 'Confirm deleting this memory page',
          })}
          title={i18n.translate('xpack.contextEngine.memory.deleteConfirmTitle', {
            defaultMessage: 'Delete "{title}"?',
            values: { title: entry.title },
          })}
          onCancel={() => setIsConfirmingDelete(false)}
          onConfirm={handleDelete}
          confirmButtonText={i18n.translate('xpack.contextEngine.memory.deleteConfirmButton', {
            defaultMessage: 'Delete page',
          })}
          cancelButtonText={i18n.translate('xpack.contextEngine.memory.cancelLabel', {
            defaultMessage: 'Cancel',
          })}
          buttonColor="danger"
          isLoading={remove.isLoading}
        >
          <EuiText size="s">
            {i18n.translate('xpack.contextEngine.memory.deleteConfirmBody', {
              defaultMessage:
                'Agents will no longer see this page. Its version history is kept for auditing.',
            })}
          </EuiText>
        </EuiConfirmModal>
      )}
    </>
  );
};
