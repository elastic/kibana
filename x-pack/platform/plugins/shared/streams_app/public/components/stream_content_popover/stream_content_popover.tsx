/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiLink,
  EuiBadge,
  EuiLoadingSpinner,
  EuiEmptyPrompt,
  EuiPanel,
  EuiSpacer,
  EuiBasicTable,
  EuiHorizontalRule,
  EuiIcon,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { Attachment } from '@kbn/streams-plugin/server/lib/streams/attachments/types';
import type { Relationship } from '@kbn/streams-schema';
import { useKibana } from '../../hooks/use_kibana';
import { useAttachmentsFetch } from '../../hooks/use_attachments_fetch';
import { useRelationshipsFetch } from '../../hooks/use_relationships_fetch';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { useTimeRange } from '../../hooks/use_time_range';

interface StreamContentPopoverProps {
  streamName: string;
  onClose: () => void;
  contextSource?: 'esql_query' | 'streams_app' | 'url_param' | 'none';
}

export function StreamContentPopover({
  streamName,
  onClose,
  contextSource,
}: StreamContentPopoverProps) {
  const { euiTheme } = useEuiTheme();
  const router = useStreamsAppRouter();
  const { rangeFrom, rangeTo } = useTimeRange();

  const {
    dependencies: {
      start: { dashboard, share },
    },
    core: { application },
  } = useKibana();

  const attachmentsFetch = useAttachmentsFetch({ streamName });
  const relationshipsFetch = useRelationshipsFetch({ streamName });

  const attachments = useMemo(
    () => attachmentsFetch.value?.attachments ?? [],
    [attachmentsFetch.value?.attachments]
  );

  const relationships = useMemo(
    () => relationshipsFetch.value?.relationships ?? [],
    [relationshipsFetch.value?.relationships]
  );

  const isLoading = attachmentsFetch.loading || relationshipsFetch.loading;

  // Navigate to content page for full view
  const handleViewFullContent = useCallback(() => {
    application.navigateToUrl(
      router.link('/{key}/management/{tab}', {
        path: { key: streamName, tab: 'content' },
        query: { rangeFrom, rangeTo },
      })
    );
    onClose();
  }, [application, router, streamName, rangeFrom, rangeTo, onClose]);

  // Get attachment URL
  const getAttachmentUrl = useCallback(
    (attachment: Attachment) => {
      switch (attachment.type) {
        case 'dashboard':
          return dashboard.locator?.getRedirectUrl({ dashboardId: attachment.redirectId });
        case 'rule':
          return share.url.locators.get('MANAGEMENT_APP_LOCATOR')?.getRedirectUrl({
            sectionId: 'insightsAndAlerting',
            appId: 'rules',
            path: `rule/${attachment.id}`,
          });
        case 'slo':
          return application.getUrlForApp('slo', { path: `/slos/${attachment.id}` });
        default:
          return undefined;
      }
    },
    [dashboard, share, application]
  );

  // Attachment type icon mapping
  const getAttachmentIcon = (type: Attachment['type']) => {
    switch (type) {
      case 'dashboard':
        return 'dashboard';
      case 'rule':
        return 'bell';
      case 'slo':
        return 'visGauge';
      default:
        return 'document';
    }
  };

  // Attachment columns for the table
  const attachmentColumns: Array<EuiBasicTableColumn<Attachment>> = [
    {
      field: 'type',
      name: '',
      width: '32px',
      render: (type: Attachment['type']) => <EuiIcon type={getAttachmentIcon(type)} size="m" />,
    },
    {
      field: 'title',
      name: ASSET_NAME_COLUMN,
      truncateText: true,
      render: (title: string, attachment: Attachment) => {
        const url = getAttachmentUrl(attachment);
        return url ? (
          <EuiLink href={url}>{title || attachment.id}</EuiLink>
        ) : (
          <EuiText size="s">{title || attachment.id}</EuiText>
        );
      },
    },
    {
      field: 'type',
      name: TYPE_COLUMN,
      width: '100px',
      render: (type: Attachment['type']) => <EuiBadge color="hollow">{type}</EuiBadge>,
    },
  ];

  // Related streams columns
  const relationshipColumns: Array<EuiBasicTableColumn<Relationship>> = [
    {
      field: 'to_stream',
      name: STREAM_COLUMN,
      truncateText: true,
      render: (_: string, relationship: Relationship) => {
        const relatedStream =
          relationship.from_stream === streamName
            ? relationship.to_stream
            : relationship.from_stream;
        return (
          <EuiLink
            href={router.link('/{key}/management/{tab}', {
              path: { key: relatedStream, tab: 'retention' },
              query: { rangeFrom, rangeTo },
            })}
          >
            {relatedStream}
          </EuiLink>
        );
      },
    },
    {
      field: 'direction',
      name: DIRECTION_COLUMN,
      width: '100px',
      render: (direction: string) => (
        <EuiBadge color={direction === 'bidirectional' ? 'primary' : 'hollow'}>
          {direction === 'bidirectional' ? BIDIRECTIONAL_LABEL : DIRECTIONAL_LABEL}
        </EuiBadge>
      ),
    },
  ];

  return (
    <EuiFlyout
      ownFocus
      onClose={onClose}
      size="s"
      aria-labelledby="streamContentPopoverTitle"
      data-test-subj="streamsAppContentPopover"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="productStreamsWired" size="l" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="m">
              <h2 id="streamContentPopoverTitle">{streamName}</h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
        {contextSource && contextSource !== 'none' && (
          <>
            <EuiSpacer size="xs" />
            <EuiText size="xs" color="subdued">
              {getContextSourceLabel(contextSource)}
            </EuiText>
          </>
        )}
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {isLoading ? (
          <EuiEmptyPrompt icon={<EuiLoadingSpinner size="xl" />} title={<span />} />
        ) : (
          <>
            {/* Attached Assets Section */}
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <strong>{ATTACHED_ASSETS_TITLE}</strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">{attachments.length}</EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />

            {attachments.length === 0 ? (
              <EuiPanel
                hasBorder={false}
                hasShadow={false}
                paddingSize="s"
                css={css`
                  background-color: ${euiTheme.colors.backgroundBaseSubdued};
                `}
              >
                <EuiText size="s" color="subdued">
                  {NO_ATTACHMENTS_TEXT}
                </EuiText>
              </EuiPanel>
            ) : (
              <EuiBasicTable
                css={css`
                  & thead tr {
                    background-color: ${euiTheme.colors.backgroundBaseSubdued};
                  }
                `}
                items={attachments.slice(0, 5)}
                columns={attachmentColumns}
                tableCaption={ATTACHMENTS_TABLE_CAPTION}
                data-test-subj="streamsAppContentPopoverAttachmentsTable"
                compressed
              />
            )}
            {attachments.length > 5 && (
              <EuiText size="xs" color="subdued">
                {i18n.translate('xpack.streams.contentPopover.moreAttachments', {
                  defaultMessage: '+{count} more',
                  values: { count: attachments.length - 5 },
                })}
              </EuiText>
            )}

            <EuiHorizontalRule margin="m" />

            {/* Related Streams Section */}
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <strong>{RELATED_STREAMS_TITLE}</strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">{relationships.length}</EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />

            {relationships.length === 0 ? (
              <EuiPanel
                hasBorder={false}
                hasShadow={false}
                paddingSize="s"
                css={css`
                  background-color: ${euiTheme.colors.backgroundBaseSubdued};
                `}
              >
                <EuiText size="s" color="subdued">
                  {NO_RELATIONSHIPS_TEXT}
                </EuiText>
              </EuiPanel>
            ) : (
              <EuiBasicTable
                css={css`
                  & thead tr {
                    background-color: ${euiTheme.colors.backgroundBaseSubdued};
                  }
                `}
                items={relationships.slice(0, 5)}
                columns={relationshipColumns}
                tableCaption={RELATIONSHIPS_TABLE_CAPTION}
                data-test-subj="streamsAppContentPopoverRelationshipsTable"
                compressed
              />
            )}
            {relationships.length > 5 && (
              <EuiText size="xs" color="subdued">
                {i18n.translate('xpack.streams.contentPopover.moreRelationships', {
                  defaultMessage: '+{count} more',
                  values: { count: relationships.length - 5 },
                })}
              </EuiText>
            )}

            <EuiHorizontalRule margin="m" />

            {/* Link to full Content page */}
            <EuiFlexGroup justifyContent="center">
              <EuiFlexItem grow={false}>
                <EuiLink onClick={handleViewFullContent}>{VIEW_FULL_CONTENT_LINK}</EuiLink>
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}

function getContextSourceLabel(source: StreamContentPopoverProps['contextSource']): string {
  switch (source) {
    case 'esql_query':
      return i18n.translate('xpack.streams.contentPopover.contextSource.esqlQuery', {
        defaultMessage: 'Detected from ES|QL query',
      });
    case 'streams_app':
      return i18n.translate('xpack.streams.contentPopover.contextSource.streamsApp', {
        defaultMessage: 'Current stream',
      });
    case 'url_param':
      return i18n.translate('xpack.streams.contentPopover.contextSource.urlParam', {
        defaultMessage: 'From link',
      });
    default:
      return '';
  }
}

// i18n labels

const ATTACHED_ASSETS_TITLE = i18n.translate('xpack.streams.contentPopover.attachedAssets.title', {
  defaultMessage: 'Attached assets',
});

const NO_ATTACHMENTS_TEXT = i18n.translate('xpack.streams.contentPopover.attachedAssets.empty', {
  defaultMessage: 'No assets attached to this stream.',
});

const ATTACHMENTS_TABLE_CAPTION = i18n.translate(
  'xpack.streams.contentPopover.attachedAssets.tableCaption',
  {
    defaultMessage: 'List of attached assets',
  }
);

const ASSET_NAME_COLUMN = i18n.translate('xpack.streams.contentPopover.attachedAssets.nameColumn', {
  defaultMessage: 'Name',
});

const TYPE_COLUMN = i18n.translate('xpack.streams.contentPopover.attachedAssets.typeColumn', {
  defaultMessage: 'Type',
});

const RELATED_STREAMS_TITLE = i18n.translate('xpack.streams.contentPopover.relatedStreams.title', {
  defaultMessage: 'Related streams',
});

const NO_RELATIONSHIPS_TEXT = i18n.translate('xpack.streams.contentPopover.relatedStreams.empty', {
  defaultMessage: 'No related streams.',
});

const RELATIONSHIPS_TABLE_CAPTION = i18n.translate(
  'xpack.streams.contentPopover.relatedStreams.tableCaption',
  {
    defaultMessage: 'List of related streams',
  }
);

const STREAM_COLUMN = i18n.translate('xpack.streams.contentPopover.relatedStreams.streamColumn', {
  defaultMessage: 'Stream',
});

const DIRECTION_COLUMN = i18n.translate(
  'xpack.streams.contentPopover.relatedStreams.directionColumn',
  {
    defaultMessage: 'Direction',
  }
);

const BIDIRECTIONAL_LABEL = i18n.translate(
  'xpack.streams.contentPopover.relatedStreams.bidirectionalLabel',
  {
    defaultMessage: 'Both',
  }
);

const DIRECTIONAL_LABEL = i18n.translate(
  'xpack.streams.contentPopover.relatedStreams.directionalLabel',
  {
    defaultMessage: 'One-way',
  }
);

const VIEW_FULL_CONTENT_LINK = i18n.translate('xpack.streams.contentPopover.viewFullContent', {
  defaultMessage: 'View full Content page',
});
