/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiAccordion,
  EuiSpacer,
  EuiText,
  EuiBadge,
  EuiPanel,
  EuiButton,
  EuiEmptyPrompt,
  EuiLoadingSpinner,
  useGeneratedHtmlId,
  EuiCallOut,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Streams } from '@kbn/streams-schema';
import { STREAMS_UI_PRIVILEGES } from '@kbn/streams-plugin/public';
import type { Attachment } from '@kbn/streams-plugin/server/lib/streams/attachments/types';
import { useAttachmentsFetch } from '../../hooks/use_attachments_fetch';
import { useAttachmentsApi } from '../../hooks/use_attachments_api';
import { useRelationshipsFetch } from '../../hooks/use_relationships_fetch';
import { useRelationshipsApi } from '../../hooks/use_relationships_api';
import { useContentPackSuggestionsFetch } from '../../hooks/use_content_pack_suggestions_fetch';
import { useIntegrationSuggestionsFetch } from '../../hooks/use_integration_suggestions_fetch';
import { useAIFeatures } from '../../hooks/use_ai_features';
import { useKibana } from '../../hooks/use_kibana';
import { AttachmentsTable } from '../stream_detail_attachments/attachment_table';
import { AddAttachmentFlyout } from '../stream_detail_attachments/add_attachment_flyout';
import { AttachmentDetailsFlyout } from '../stream_detail_attachments/attachment_details_flyout';
import { ConfirmAttachmentModal } from '../stream_detail_attachments/confirm_attachment_modal';
import { DashboardSuggestionControl } from '../stream_detail_dashboard_suggestion/dashboard_suggestion_control';
import { RelatedStreamsSection } from './related_streams_section';
import { ContentPackSuggestionsSection } from './content_pack_suggestions_section';
import { IntegrationSuggestionsSection } from './integration_suggestions_section';

interface StreamDetailContentProps {
  definition: Streams.all.GetResponse;
}

export function StreamDetailContent({ definition }: StreamDetailContentProps) {
  const streamName = definition.stream.name;

  const {
    core: {
      application: {
        capabilities: {
          streams: { [STREAMS_UI_PRIVILEGES.manage]: canManage },
        },
      },
      notifications,
    },
  } = useKibana();

  const aiFeatures = useAIFeatures();

  // Accordion IDs
  const attachedAssetsAccordionId = useGeneratedHtmlId({ prefix: 'attachedAssets' });
  const dashboardSuggestionsAccordionId = useGeneratedHtmlId({ prefix: 'dashboardSuggestions' });
  const contentPackSuggestionsAccordionId = useGeneratedHtmlId({
    prefix: 'contentPackSuggestions',
  });
  const integrationSuggestionsAccordionId = useGeneratedHtmlId({
    prefix: 'integrationSuggestions',
  });
  const relatedStreamsAccordionId = useGeneratedHtmlId({ prefix: 'relatedStreams' });

  // Attachments state
  const [isAddAttachmentFlyoutOpen, setIsAddAttachmentFlyoutOpen] = useState(false);
  const [detailsAttachment, setDetailsAttachment] = useState<Attachment | null>(null);
  const [attachmentsToUnlink, setAttachmentsToUnlink] = useState<Attachment[]>([]);
  const [isLinkLoading, setIsLinkLoading] = useState(false);
  const [isUnlinkLoading, setIsUnlinkLoading] = useState(false);

  // Data fetching
  const attachmentsFetch = useAttachmentsFetch({ streamName });
  const relationshipsFetch = useRelationshipsFetch({ streamName });
  const contentPackSuggestionsFetch = useContentPackSuggestionsFetch({ streamName });
  const integrationSuggestionsFetch = useIntegrationSuggestionsFetch({ streamName });

  // APIs
  const { addAttachments, removeAttachments } = useAttachmentsApi({ name: streamName });
  const { unlinkRelationship, linkRelationship } = useRelationshipsApi({ streamName });

  const linkedAttachments = useMemo(() => {
    return attachmentsFetch.value?.attachments ?? [];
  }, [attachmentsFetch.value?.attachments]);

  const relationships = useMemo(() => {
    return relationshipsFetch.value?.relationships ?? [];
  }, [relationshipsFetch.value?.relationships]);

  const contentPackSuggestions = useMemo(() => {
    return contentPackSuggestionsFetch.value?.dashboards ?? [];
  }, [contentPackSuggestionsFetch.value?.dashboards]);

  const integrationSuggestions = useMemo(() => {
    return integrationSuggestionsFetch.value?.suggestions ?? [];
  }, [integrationSuggestionsFetch.value?.suggestions]);

  // Handlers
  const handleViewDetails = useCallback((attachment: Attachment) => {
    setDetailsAttachment(attachment);
  }, []);

  const handleLinkAttachments = useCallback(
    async (attachments: Attachment[]) => {
      setIsLinkLoading(true);
      try {
        await addAttachments(attachments);
        attachmentsFetch.refresh();
        setIsAddAttachmentFlyoutOpen(false);
        notifications.toasts.addSuccess({
          title: i18n.translate('xpack.streams.content.attachments.addSuccess.title', {
            defaultMessage: 'Attachments added successfully',
          }),
        });
      } finally {
        setIsLinkLoading(false);
      }
    },
    [addAttachments, attachmentsFetch, notifications.toasts]
  );

  const handleUnlinkAttachments = useCallback(
    async (attachments: Attachment[]) => {
      setIsUnlinkLoading(true);
      try {
        await removeAttachments(attachments);
        attachmentsFetch.refresh();
        notifications.toasts.addSuccess({
          title: i18n.translate('xpack.streams.content.attachments.removeSuccess.title', {
            defaultMessage: 'Attachments removed',
          }),
        });
      } finally {
        setIsUnlinkLoading(false);
        setAttachmentsToUnlink([]);
        setDetailsAttachment(null);
      }
    },
    [removeAttachments, attachmentsFetch, notifications.toasts]
  );

  const handleUnlinkRelationship = useCallback(
    async (targetStream: string) => {
      try {
        await unlinkRelationship(targetStream);
        relationshipsFetch.refresh();
        notifications.toasts.addSuccess({
          title: i18n.translate('xpack.streams.content.relationships.unlinkSuccess.title', {
            defaultMessage: 'Relationship removed',
          }),
        });
      } catch (error) {
        notifications.toasts.addDanger({
          title: i18n.translate('xpack.streams.content.relationships.unlinkError.title', {
            defaultMessage: 'Failed to remove relationship',
          }),
        });
      }
    },
    [unlinkRelationship, relationshipsFetch, notifications.toasts]
  );

  const handleLinkRelationship = useCallback(
    async (relationship: Parameters<typeof linkRelationship>[0]) => {
      try {
        await linkRelationship(relationship);
        relationshipsFetch.refresh();
        notifications.toasts.addSuccess({
          title: i18n.translate('xpack.streams.content.relationships.linkSuccess.title', {
            defaultMessage: 'Relationship added',
          }),
        });
      } catch (error) {
        notifications.toasts.addDanger({
          title: i18n.translate('xpack.streams.content.relationships.linkError.title', {
            defaultMessage: 'Failed to add relationship',
          }),
        });
        throw error;
      }
    },
    [linkRelationship, relationshipsFetch, notifications.toasts]
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      {/* Attached Assets Section */}
      <EuiFlexItem>
        <EuiAccordion
          id={attachedAssetsAccordionId}
          buttonContent={
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="m">
                  <strong>{ATTACHED_ASSETS_TITLE}</strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">{linkedAttachments.length}</EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
          initialIsOpen
          paddingSize="m"
        >
          <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none">
            {attachmentsFetch.loading ? (
              <EuiEmptyPrompt icon={<EuiLoadingSpinner size="xl" />} title={<span />} />
            ) : linkedAttachments.length === 0 ? (
              <EuiEmptyPrompt
                iconType="documents"
                title={<h3>{NO_ATTACHMENTS_TITLE}</h3>}
                body={<p>{NO_ATTACHMENTS_DESCRIPTION}</p>}
                actions={
                  canManage ? (
                    <EuiButton
                      onClick={() => setIsAddAttachmentFlyoutOpen(true)}
                      data-test-subj="streamsAppContentAddAttachmentButton"
                    >
                      {ADD_ATTACHMENT_BUTTON}
                    </EuiButton>
                  ) : undefined
                }
              />
            ) : (
              <>
                <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      size="s"
                      disabled={!canManage}
                      onClick={() => setIsAddAttachmentFlyoutOpen(true)}
                      data-test-subj="streamsAppContentAddAttachmentButton"
                    >
                      {ADD_ATTACHMENT_BUTTON}
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="s" />
                <AttachmentsTable
                  entityId={streamName}
                  attachments={linkedAttachments}
                  loading={attachmentsFetch.loading}
                  onUnlinkAttachment={
                    canManage ? (attachment) => setAttachmentsToUnlink([attachment]) : undefined
                  }
                  onViewDetails={handleViewDetails}
                  dataTestSubj="streamsAppContentAttachmentsTable"
                  showActions
                />
              </>
            )}
          </EuiPanel>
        </EuiAccordion>
      </EuiFlexItem>

      {/* AI Dashboard Suggestions Section */}
      {Streams.ingest.all.GetResponse.is(definition) && (
        <EuiFlexItem>
          <EuiAccordion
            id={dashboardSuggestionsAccordionId}
            buttonContent={
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiText size="m">
                    <strong>{AI_DASHBOARD_SUGGESTIONS_TITLE}</strong>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            }
            initialIsOpen={false}
            paddingSize="m"
          >
            <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none">
              {aiFeatures ? (
                <DashboardSuggestionControl
                  definition={definition.stream}
                  aiFeatures={aiFeatures}
                  onSaveAndAttach={async (dashboardId: string) => {
                    await handleLinkAttachments([
                      {
                        id: dashboardId,
                        type: 'dashboard',
                        title: '',
                        tags: [],
                        redirectId: dashboardId,
                        streamNames: [],
                      },
                    ]);
                  }}
                />
              ) : (
                <EuiCallOut title={AI_NOT_AVAILABLE_TITLE} color="primary" iconType="iInCircle">
                  {AI_NOT_AVAILABLE_DESCRIPTION}
                </EuiCallOut>
              )}
            </EuiPanel>
          </EuiAccordion>
        </EuiFlexItem>
      )}

      {/* Content Pack Suggestions Section (only for classic streams) */}
      {Streams.ClassicStream.GetResponse.is(definition) && (
        <EuiFlexItem>
          <EuiAccordion
            id={contentPackSuggestionsAccordionId}
            buttonContent={
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiText size="m">
                    <strong>{CONTENT_PACK_SUGGESTIONS_TITLE}</strong>
                  </EuiText>
                </EuiFlexItem>
                {contentPackSuggestions.length > 0 && (
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="hollow">{contentPackSuggestions.length}</EuiBadge>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            }
            initialIsOpen={contentPackSuggestions.length > 0}
            paddingSize="m"
          >
            <ContentPackSuggestionsSection
              suggestions={contentPackSuggestions}
              loading={contentPackSuggestionsFetch.loading}
              streamName={streamName}
              onAttach={async (dashboardId: string) => {
                // The API only uses id and type, but the hook is typed for full Attachment
                await handleLinkAttachments([
                  {
                    id: dashboardId,
                    type: 'dashboard',
                    title: '',
                    tags: [],
                    redirectId: dashboardId,
                    streamNames: [],
                  },
                ]);
              }}
            />
          </EuiAccordion>
        </EuiFlexItem>
      )}

      {/* Integration Suggestions Section (for ingest streams with feature detection) */}
      {Streams.ingest.all.GetResponse.is(definition) && (
        <EuiFlexItem>
          <EuiAccordion
            id={integrationSuggestionsAccordionId}
            buttonContent={
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiText size="m">
                    <strong>{INTEGRATION_SUGGESTIONS_TITLE}</strong>
                  </EuiText>
                </EuiFlexItem>
                {integrationSuggestions.length > 0 && (
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="hollow">{integrationSuggestions.length}</EuiBadge>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            }
            initialIsOpen={integrationSuggestions.length > 0}
            paddingSize="m"
          >
            <IntegrationSuggestionsSection
              suggestions={integrationSuggestions}
              loading={integrationSuggestionsFetch.loading}
              streamName={streamName}
            />
          </EuiAccordion>
        </EuiFlexItem>
      )}

      {/* Related Streams Section */}
      <EuiFlexItem>
        <EuiAccordion
          id={relatedStreamsAccordionId}
          buttonContent={
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="m">
                  <strong>{RELATED_STREAMS_TITLE}</strong>
                </EuiText>
              </EuiFlexItem>
              {relationships.length > 0 && (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">{relationships.length}</EuiBadge>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          }
          initialIsOpen={relationships.length > 0}
          paddingSize="m"
        >
          <RelatedStreamsSection
            relationships={relationships}
            loading={relationshipsFetch.loading}
            streamName={streamName}
            canManage={Boolean(canManage)}
            onUnlink={handleUnlinkRelationship}
            onLink={handleLinkRelationship}
            onRefresh={relationshipsFetch.refresh}
          />
        </EuiAccordion>
      </EuiFlexItem>

      {/* Flyouts and Modals */}
      {isAddAttachmentFlyoutOpen && (
        <AddAttachmentFlyout
          entityId={streamName}
          onAddAttachments={handleLinkAttachments}
          isLoading={isLinkLoading}
          onClose={() => setIsAddAttachmentFlyoutOpen(false)}
        />
      )}

      {detailsAttachment && (
        <AttachmentDetailsFlyout
          attachment={detailsAttachment}
          streamName={streamName}
          onClose={() => setDetailsAttachment(null)}
          onUnlink={
            canManage
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
          onConfirm={() => handleUnlinkAttachments(attachmentsToUnlink)}
        />
      )}
    </EuiFlexGroup>
  );
}

// i18n labels

const ATTACHED_ASSETS_TITLE = i18n.translate('xpack.streams.content.attachedAssets.title', {
  defaultMessage: 'Attached assets',
});

const NO_ATTACHMENTS_TITLE = i18n.translate('xpack.streams.content.attachedAssets.empty.title', {
  defaultMessage: 'No assets attached',
});

const NO_ATTACHMENTS_DESCRIPTION = i18n.translate(
  'xpack.streams.content.attachedAssets.empty.description',
  {
    defaultMessage: 'Attach dashboards, rules, or SLOs to this stream for quick access.',
  }
);

const ADD_ATTACHMENT_BUTTON = i18n.translate('xpack.streams.content.attachedAssets.addButton', {
  defaultMessage: 'Add attachment',
});

const AI_DASHBOARD_SUGGESTIONS_TITLE = i18n.translate(
  'xpack.streams.content.dashboardSuggestions.title',
  {
    defaultMessage: 'AI dashboard suggestions',
  }
);

const AI_NOT_AVAILABLE_TITLE = i18n.translate(
  'xpack.streams.content.dashboardSuggestions.notAvailable.title',
  {
    defaultMessage: 'AI features not available',
  }
);

const AI_NOT_AVAILABLE_DESCRIPTION = i18n.translate(
  'xpack.streams.content.dashboardSuggestions.notAvailable.description',
  {
    defaultMessage:
      'AI features require an Enterprise license and configured AI connectors. Contact your administrator for more information.',
  }
);

const CONTENT_PACK_SUGGESTIONS_TITLE = i18n.translate(
  'xpack.streams.content.contentPackSuggestions.title',
  {
    defaultMessage: 'Content pack suggestions',
  }
);

const INTEGRATION_SUGGESTIONS_TITLE = i18n.translate(
  'xpack.streams.content.integrationSuggestions.title',
  {
    defaultMessage: 'Integration suggestions',
  }
);

const RELATED_STREAMS_TITLE = i18n.translate('xpack.streams.content.relatedStreams.title', {
  defaultMessage: 'Related streams',
});
