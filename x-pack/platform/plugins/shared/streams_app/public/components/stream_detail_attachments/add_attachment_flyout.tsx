/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useState, useEffect } from 'react';
import type { Attachment } from '@kbn/streams-plugin/server/lib/streams/attachments/types';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import {
  AttachmentFilters,
  DEFAULT_ATTACHMENT_FILTERS,
  type AttachmentFiltersState,
} from './attachment_filters';
import { AttachmentsTable } from './attachment_table';

export function AddAttachmentFlyout({
  entityId,
  onAddAttachments,
  linkedAttachments,
  isLoading,
  onClose,
}: {
  entityId: string;
  onAddAttachments: (attachments: Attachment[]) => Promise<void>;
  linkedAttachments: Attachment[];
  isLoading: boolean;
  onClose: () => void;
}) {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const { euiTheme } = useEuiTheme();

  const [filters, setFilters] = useState<AttachmentFiltersState>(DEFAULT_ATTACHMENT_FILTERS);
  const [selectedAttachments, setSelectedAttachments] = useState<Attachment[]>([]);

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
              query: filters.debouncedQuery,
              attachmentType: filters.type,
            },
            body: {
              tags: filters.tags,
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
      filters.debouncedQuery,
      filters.type,
      filters.tags,
      linkedAttachments,
    ]
  );

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
          <AttachmentFilters
            filters={filters}
            onFiltersChange={setFilters}
            searchPlaceholder={i18n.translate(
              'xpack.streams.addAttachmentFlyout.searchPlaceholder',
              {
                defaultMessage: 'Search for attachments',
              }
            )}
          />
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
            selectionDisabled={isLoading}
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
                  onClick={() => onAddAttachments(selectedAttachments)}
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
