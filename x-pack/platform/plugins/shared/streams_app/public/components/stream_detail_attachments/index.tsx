/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPopover,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { usePerformanceContext } from '@kbn/ebt-tools';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { STREAMS_UI_PRIVILEGES } from '@kbn/streams-plugin/public';
import type {
  Attachment,
  AttachmentType,
} from '@kbn/streams-plugin/server/lib/streams/attachments/types';
import { Streams } from '@kbn/streams-schema';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { useAttachmentsApi } from '../../hooks/use_attachments_api';
import { useAttachmentsFetch } from '../../hooks/use_attachments_fetch';
import { useKibana } from '../../hooks/use_kibana';
import { getStreamTypeFromDefinition } from '../../util/get_stream_type_from_definition';
import { AddAttachmentFlyout } from './add_attachment_flyout';
import { AttachmentDetailsFlyout } from './attachment_details_flyout';
import {
  AttachmentFilters,
  DEFAULT_ATTACHMENT_FILTERS,
  type AttachmentFiltersState,
} from './attachment_filters';
import { AttachmentsTable } from './attachment_table';
import { AttachmentsEmptyPrompt } from './attachments_empty_prompt';
import { ConfirmAttachmentModal } from './confirm_attachment_modal';

const getCountByType = (attachments: Attachment[]): Record<AttachmentType, number> => {
  return attachments.reduce<Record<AttachmentType, number>>(
    (acc, attachment) => {
      acc[attachment.type] += 1;
      return acc;
    },
    { dashboard: 0, rule: 0, slo: 0 }
  );
};

export function StreamDetailAttachments({ definition }: { definition: Streams.all.GetResponse }) {
  const [filters, setFilters] = useState<AttachmentFiltersState>(DEFAULT_ATTACHMENT_FILTERS);
  const [isSelectionPopoverOpen, setIsSelectionPopoverOpen] = useState(false);

  const [isAddAttachmentFlyoutOpen, setIsAddAttachmentFlyoutOpen] = useState(false);
  const [detailsAttachment, setDetailsAttachment] = useState<Attachment | null>(null);

  const {
    core,
    services: { telemetryClient },
  } = useKibana();
  const {
    application: {
      capabilities: {
        streams: { [STREAMS_UI_PRIVILEGES.manage]: canLinkAttachments },
      },
    },
    notifications,
  } = core;

  const { onPageReady } = usePerformanceContext();

  const attachmentFilters = useMemo(
    () => ({
      ...(filters.debouncedQuery && { query: filters.debouncedQuery }),
      ...(filters.types.length > 0 && { attachmentTypes: filters.types }),
      ...(filters.tags.length > 0 && { tags: filters.tags }),
    }),
    [filters.debouncedQuery, filters.types, filters.tags]
  );

  const attachmentsFetch = useAttachmentsFetch({
    streamName: definition.stream.name,
    filters: attachmentFilters,
  });
  const { addAttachments, removeAttachments } = useAttachmentsApi({
    name: definition.stream.name,
  });

  // Telemetry for TTFMP (time to first meaningful paint)
  useEffect(() => {
    if (definition && !attachmentsFetch.loading) {
      const streamType = getStreamTypeFromDefinition(definition.stream);
      const processingStepsCount = Streams.ingest.all.Definition.is(definition.stream)
        ? definition.stream.ingest.processing.steps.length
        : 0;
      onPageReady({
        meta: {
          description: `[ttfmp_streams_detail_attachments] streamType: ${streamType}`,
        },
        customMetrics: {
          key1: 'attachment_count',
          value1: attachmentsFetch.value?.attachments?.length ?? 0,
          key2: 'processing_steps_count',
          value2: processingStepsCount,
        },
      });
    }
  }, [definition, attachmentsFetch.loading, attachmentsFetch.value, onPageReady]);

  const [attachmentsToUnlink, setAttachmentsToUnlink] = useState<Attachment[]>([]);
  const linkedAttachments = useMemo(() => {
    return attachmentsFetch.value?.attachments ?? [];
  }, [attachmentsFetch.value?.attachments]);

  const [selectedAttachments, setSelectedAttachments] = useState<Attachment[]>([]);

  const selectionPopoverId = useGeneratedHtmlId({
    prefix: 'selectionPopover',
  });

  const hasFiltersApplied =
    filters.types.length > 0 || filters.tags.length > 0 || filters.debouncedQuery !== '';
  const hasNoAttachments =
    !attachmentsFetch.loading && linkedAttachments.length === 0 && !hasFiltersApplied;

  const openAddAttachmentFlyout = () => {
    setIsAddAttachmentFlyoutOpen(true);
  };

  const handleViewDetails = useCallback(
    (attachment: Attachment) => {
      setDetailsAttachment(attachment);
      telemetryClient.trackAttachmentFlyoutOpened({
        stream_name: definition.stream.name,
        attachment_type: attachment.type,
        attachment_id: attachment.id,
      });
    },
    [definition.stream.name, telemetryClient]
  );

  const [{ loading: isLinkLoading }, handleLinkAttachments] = useAsyncFn(
    async (attachments: Attachment[]) => {
      await addAttachments(attachments);
      attachmentsFetch.refresh();
      setIsAddAttachmentFlyoutOpen(false);

      telemetryClient.trackAttachmentLinked({
        stream_name: definition.stream.name,
        attachment_count: attachments.length,
        count_by_type: getCountByType(attachments),
      });

      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.streams.attachments.addSuccess.title', {
          defaultMessage: 'Attachments added successfully',
        }),
        iconType: 'cheer',
        text: toMountPoint(
          <FormattedMessage
            id="xpack.streams.attachments.addSuccess.text"
            defaultMessage="{count} {count, plural, one {attachment was} other {attachments were}} added to the {streamName} stream."
            values={{
              count: attachments.length,
              streamName: <strong>{definition.stream.name}</strong>,
            }}
          />,
          core
        ),
      });
    },
    [
      addAttachments,
      attachmentsFetch,
      notifications.toasts,
      definition.stream.name,
      core,
      telemetryClient,
      getCountByType,
    ]
  );

  const [{ loading: isUnlinkLoading }, handleUnlinkAttachments] = useAsyncFn(
    async (attachments: Attachment[]) => {
      await removeAttachments(attachments);
      attachmentsFetch.refresh();
      setSelectedAttachments([]);
      setIsSelectionPopoverOpen(false);

      telemetryClient.trackAttachmentUnlinked({
        stream_name: definition.stream.name,
        attachment_count: attachments.length,
        count_by_type: getCountByType(attachments),
      });

      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.streams.attachments.removeSuccess.title', {
          defaultMessage: 'Attachments removed',
        }),
        iconType: 'unlink',
        text: toMountPoint(
          <FormattedMessage
            id="xpack.streams.attachments.removeSuccess.text"
            defaultMessage="{count} {count, plural, one {attachment was} other {attachments were}} removed from the {streamName} stream."
            values={{
              count: attachments.length,
              streamName: <strong>{definition.stream.name}</strong>,
            }}
          />,
          core
        ),
      });
    },
    [
      removeAttachments,
      attachmentsFetch,
      notifications.toasts,
      definition.stream.name,
      core,
      telemetryClient,
      getCountByType,
    ]
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      {hasNoAttachments ? (
        <EuiFlexItem>
          <AttachmentsEmptyPrompt
            onAddAttachments={openAddAttachmentFlyout}
            disabled={!canLinkAttachments}
          />
        </EuiFlexItem>
      ) : (
        <>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
              <EuiFlexItem grow>
                <AttachmentFilters
                  filters={filters}
                  onFiltersChange={setFilters}
                  searchPlaceholder={i18n.translate(
                    'xpack.streams.streamDetailAttachments.searchPlaceholder',
                    {
                      defaultMessage: 'Search for your attachments by name',
                    }
                  )}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  data-test-subj="streamsAppStreamDetailAddAttachmentButton"
                  disabled={!canLinkAttachments}
                  onClick={openAddAttachmentFlyout}
                >
                  {i18n.translate(
                    'xpack.streams.streamDetailAttachmentView.addAttachmentButtonLabel',
                    {
                      defaultMessage: 'Add attachment',
                    }
                  )}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  {i18n.translate('xpack.streams.streamDetailAttachments.attachmentCount', {
                    defaultMessage: '{count} Attachments',
                    values: { count: linkedAttachments.length },
                  })}
                </EuiText>
              </EuiFlexItem>
              {selectedAttachments.length > 0 && (
                <EuiFlexItem grow={false}>
                  <EuiPopover
                    id={selectionPopoverId}
                    button={
                      <EuiLink
                        data-test-subj="streamsAppStreamDetailSelectedAttachmentsLink"
                        onClick={() => setIsSelectionPopoverOpen(!isSelectionPopoverOpen)}
                      >
                        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                          <EuiFlexItem grow={false}>
                            {i18n.translate(
                              'xpack.streams.streamDetailAttachments.selectedAttachmentsCount',
                              {
                                defaultMessage: '{count} attachments selected',
                                values: { count: selectedAttachments.length },
                              }
                            )}
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            <EuiIcon
                              type={isSelectionPopoverOpen ? 'arrowUp' : 'arrowDown'}
                              size="s"
                            />
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </EuiLink>
                    }
                    isOpen={isSelectionPopoverOpen}
                    closePopover={() => setIsSelectionPopoverOpen(false)}
                    panelPaddingSize="none"
                    anchorPosition="downLeft"
                  >
                    <EuiContextMenuPanel
                      size="s"
                      items={[
                        <EuiContextMenuItem
                          key="unlink"
                          icon="unlink"
                          disabled={isUnlinkLoading}
                          onClick={() => {
                            setAttachmentsToUnlink(selectedAttachments);
                            setIsSelectionPopoverOpen(false);
                          }}
                        >
                          {i18n.translate(
                            'xpack.streams.streamDetailAttachments.removeAttachmentsLabel',
                            {
                              defaultMessage: 'Remove attachments',
                            }
                          )}
                        </EuiContextMenuItem>,
                        <EuiContextMenuItem
                          key="cancel"
                          icon="cross"
                          onClick={() => {
                            setSelectedAttachments([]);
                            setIsSelectionPopoverOpen(false);
                          }}
                        >
                          {i18n.translate(
                            'xpack.streams.streamDetailAttachments.clearSelectionLabel',
                            {
                              defaultMessage: 'Clear selection',
                            }
                          )}
                        </EuiContextMenuItem>,
                      ]}
                    />
                  </EuiPopover>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <AttachmentsTable
              entityId={definition?.stream.name}
              attachments={linkedAttachments}
              loading={attachmentsFetch.loading}
              selectedAttachments={selectedAttachments}
              setSelectedAttachments={canLinkAttachments ? setSelectedAttachments : undefined}
              onUnlinkAttachment={
                canLinkAttachments
                  ? (attachment) => setAttachmentsToUnlink([attachment])
                  : undefined
              }
              onViewDetails={handleViewDetails}
              dataTestSubj="streamsAppStreamDetailAttachmentsTable"
              showActions
            />
          </EuiFlexItem>
        </>
      )}
      {definition && isAddAttachmentFlyoutOpen ? (
        <AddAttachmentFlyout
          entityId={definition.stream.name}
          onAddAttachments={handleLinkAttachments}
          isLoading={isLinkLoading}
          onClose={() => {
            setIsAddAttachmentFlyoutOpen(false);
          }}
        />
      ) : null}
      {detailsAttachment && (
        <AttachmentDetailsFlyout
          attachment={detailsAttachment}
          streamName={definition.stream.name}
          onClose={() => setDetailsAttachment(null)}
          onUnlink={
            canLinkAttachments
              ? () => {
                  setAttachmentsToUnlink([detailsAttachment]);
                }
              : undefined
          }
        />
      )}
      {attachmentsToUnlink.length > 0 && (
        <ConfirmAttachmentModal
          attachments={attachmentsToUnlink}
          isLoading={isUnlinkLoading}
          onCancel={() => setAttachmentsToUnlink([])}
          onConfirm={async () => {
            await handleUnlinkAttachments(attachmentsToUnlink);
            setAttachmentsToUnlink([]);
            setDetailsAttachment(null);
          }}
        />
      )}
    </EuiFlexGroup>
  );
}
