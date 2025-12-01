/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiPopover,
  EuiPopoverTitle,
  EuiSearchBar,
  EuiSelectable,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { debounce } from 'lodash';
import React, { useMemo, useState, useEffect } from 'react';
import type {
  Attachment,
  AttachmentType,
} from '@kbn/streams-plugin/server/lib/streams/attachments/types';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { AttachmentsTable } from './attachment_table';

const ATTACHMENT_TYPE_LABELS: Record<AttachmentType, string> = {
  dashboard: i18n.translate('xpack.streams.addAttachmentFlyout.typeDashboard', {
    defaultMessage: 'Dashboard',
  }),
  rule: i18n.translate('xpack.streams.addAttachmentFlyout.typeRule', {
    defaultMessage: 'Rule',
  }),
  slo: i18n.translate('xpack.streams.addAttachmentFlyout.typeSlo', {
    defaultMessage: 'SLO',
  }),
};

const ATTACHMENT_TYPE_OPTIONS = Object.entries(ATTACHMENT_TYPE_LABELS).map(([type, label]) => ({
  value: type as AttachmentType,
  label,
}));

export function AddAttachmentFlyout({
  entityId,
  onAddAttachments,
  linkedAttachments,
  onClose,
}: {
  entityId: string;
  onAddAttachments: (attachments: Attachment[]) => Promise<void>;
  linkedAttachments: Attachment[];
  onClose: () => void;
}) {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
        savedObjectsTagging: { ui: savedObjectsTaggingUi },
      },
    },
  } = useKibana();

  const { euiTheme } = useEuiTheme();

  const [query, setQuery] = useState('');

  const [submittedQuery, setSubmittedQuery] = useState(query);
  const [selectedAttachments, setSelectedAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<AttachmentType | undefined>(undefined);
  const [isTagsPopoverOpen, setIsTagsPopoverOpen] = useState(false);
  const [isTypePopoverOpen, setIsTypePopoverOpen] = useState(false);

  const setSubmittedQueryDebounced = useMemo(() => {
    return debounce(setSubmittedQuery, 150);
  }, []);

  const attachmentSuggestionsFetch = useStreamsAppFetch(
    ({ signal }) => {
      return streamsRepositoryClient
        .fetch('POST /internal/streams/{streamName}/attachments/_suggestions', {
          signal,
          params: {
            path: {
              streamName: entityId,
            },
            query: {
              query: submittedQuery,
              attachmentType: selectedType,
            },
            body: {
              tags: selectedTags,
            },
          },
        })
        .then(({ suggestions }) => {
          return {
            attachments: suggestions.filter((attachment) => {
              return !linkedAttachments.find(
                (linkedAttachment) => linkedAttachment.id === attachment.id
              );
            }),
          };
        });
    },
    [
      streamsRepositoryClient,
      entityId,
      submittedQuery,
      selectedType,
      selectedTags,
      linkedAttachments,
    ]
  );

  const tagList = savedObjectsTaggingUi.getTagList();

  const tagsFilterButton = (
    <EuiFilterButton
      iconType="arrowDown"
      badgeColor="accent"
      onClick={() => setIsTagsPopoverOpen(!isTagsPopoverOpen)}
      isSelected={isTagsPopoverOpen}
      numFilters={tagList.length}
      hasActiveFilters={selectedTags.length > 0}
      numActiveFilters={selectedTags.length}
    >
      {i18n.translate('xpack.streams.addAttachmentFlyout.tagsFilterButtonLabel', {
        defaultMessage: 'Tags',
      })}
    </EuiFilterButton>
  );

  const typeFilterButton = (
    <EuiFilterButton
      iconType="arrowDown"
      onClick={() => setIsTypePopoverOpen(!isTypePopoverOpen)}
      isSelected={isTypePopoverOpen}
      hasActiveFilters={selectedType !== undefined}
      numActiveFilters={selectedType !== undefined ? 1 : 0}
    >
      {i18n.translate('xpack.streams.addAttachmentFlyout.typeFilterButtonLabel', {
        defaultMessage: 'Type',
      })}
    </EuiFilterButton>
  );

  const tagsPopoverId = useGeneratedHtmlId({
    prefix: 'tagsPopover',
  });

  const typePopoverId = useGeneratedHtmlId({
    prefix: 'typePopover',
  });

  const flyoutTitleId = useGeneratedHtmlId({
    prefix: 'addAttachmentFlyoutTitle',
  });

  useEffect(() => {
    setSelectedAttachments([]);
  }, [linkedAttachments]);

  const allAttachments = useMemo(() => {
    return attachmentSuggestionsFetch.value?.attachments || [];
  }, [attachmentSuggestionsFetch.value]);

  return (
    <EuiFlyout onClose={onClose} aria-labelledby={flyoutTitleId}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle>
          <h2 id={flyoutTitleId}>
            {i18n.translate('xpack.streams.addAttachmentFlyout.flyoutHeaderLabel', {
              defaultMessage: 'Add attachments',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiFlexGroup direction="row" gutterSize="s">
            <EuiFlexItem grow>
              <EuiSearchBar
                box={{
                  incremental: true,
                  placeholder: i18n.translate(
                    'xpack.streams.addAttachmentFlyout.searchPlaceholder',
                    {
                      defaultMessage: 'Search for attachments',
                    }
                  ),
                }}
                query={query}
                onChange={({ queryText }) => {
                  setQuery(queryText);
                  setSubmittedQueryDebounced(queryText);
                }}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFilterGroup>
                <EuiPopover
                  id={typePopoverId}
                  button={typeFilterButton}
                  isOpen={isTypePopoverOpen}
                  closePopover={() => setIsTypePopoverOpen(false)}
                  panelPaddingSize="none"
                >
                  <EuiSelectable
                    singleSelection
                    options={ATTACHMENT_TYPE_OPTIONS.map((option) => ({
                      label: option.label,
                      checked: selectedType === option.value ? 'on' : undefined,
                      value: option.value,
                    }))}
                    onChange={(newOptions) => {
                      const selected = newOptions.find((option) => option.checked === 'on');
                      setSelectedType(selected ? selected.value : undefined);
                    }}
                  >
                    {(list) => (
                      <div
                        css={css`
                          min-width: 200px;
                        `}
                      >
                        {list}
                      </div>
                    )}
                  </EuiSelectable>
                </EuiPopover>
                <EuiPopover
                  id={tagsPopoverId}
                  button={tagsFilterButton}
                  isOpen={isTagsPopoverOpen}
                  closePopover={() => setIsTagsPopoverOpen(false)}
                  panelPaddingSize="none"
                >
                  <EuiSelectable
                    allowExclusions
                    searchable
                    searchProps={{
                      placeholder: i18n.translate(
                        'xpack.streams.addAttachmentFlyout.searchTagsLabel',
                        {
                          defaultMessage: 'Search tags',
                        }
                      ),
                      compressed: true,
                    }}
                    options={(tagList || []).map((tag) => ({
                      label: tag.name,
                      checked: selectedTags.includes(tag.id) ? 'on' : undefined,
                      tagId: tag.id,
                    }))}
                    onChange={(newOptions) => {
                      setSelectedTags(
                        newOptions
                          .filter((option) => option.checked === 'on')
                          .map(({ tagId }) => tagId)
                      );
                    }}
                  >
                    {(list, search) => (
                      <div style={{ width: 300 }}>
                        <EuiPopoverTitle paddingSize="s">{search}</EuiPopoverTitle>
                        {list}
                      </div>
                    )}
                  </EuiSelectable>
                </EuiPopover>
              </EuiFilterGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                {i18n.translate('xpack.streams.addAttachmentFlyout.totalAttachmentsCount', {
                  defaultMessage: '{count} Attachments',
                  values: { count: allAttachments.length },
                })}
              </EuiText>
            </EuiFlexItem>
            {selectedAttachments.length > 0 && (
              <EuiFlexItem grow={false}>
                <EuiText size="s" css={{ color: euiTheme.colors.textPrimary }}>
                  {i18n.translate('xpack.streams.addAttachmentFlyout.selectedAttachmentsCount', {
                    defaultMessage: '{count} attachments selected',
                    values: { count: selectedAttachments.length },
                  })}
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          <AttachmentsTable
            entityId={entityId}
            attachments={allAttachments}
            loading={attachmentSuggestionsFetch.loading}
            selectedAttachments={selectedAttachments}
            setSelectedAttachments={setSelectedAttachments}
            dataTestSubj="streamsAppAddAttachmentFlyoutAttachmentsTable"
          />
        </EuiFlexGroup>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            {selectedAttachments.length > 0 && (
              <EuiText size="s" css={{ color: euiTheme.colors.textPrimary }}>
                {i18n.translate('xpack.streams.addAttachmentFlyout.footerSelectedCount', {
                  defaultMessage: '{count} Selected attachments',
                  values: { count: selectedAttachments.length },
                })}
              </EuiText>
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="streamsAppAddAttachmentFlyoutCancelButton"
                  onClick={onClose}
                >
                  {i18n.translate('xpack.streams.addAttachmentFlyout.cancelButtonLabel', {
                    defaultMessage: 'Cancel',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  isLoading={isLoading}
                  disabled={selectedAttachments.length === 0}
                  data-test-subj="streamsAppAddAttachmentFlyoutAddAttachmentsButton"
                  onClick={async () => {
                    setIsLoading(true);
                    try {
                      await onAddAttachments(selectedAttachments);
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                >
                  {i18n.translate('xpack.streams.addAttachmentFlyout.addToStreamButtonLabel', {
                    defaultMessage: 'Add to stream',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
