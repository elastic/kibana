/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButtonEmpty,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiLink,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedDate } from '@kbn/i18n-react';
import type { Attachment } from '@kbn/streams-plugin/server/lib/streams/attachments/types';
import React from 'react';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { useTimefilter } from '../../hooks/use_timefilter';
import { InfoPanel } from '../info_panel';
import { AttachmentTagsList } from './attachment_tags_list';
import { ATTACHMENT_TYPE_CONFIG } from './attachment_constants';
import { AttachmentTypeBadge } from './attachment_type_badge';
import { getAttachmentUrl } from './get_attachment_url';

function FormattedDateTime({ value }: { value: string }) {
  return (
    <FormattedDate
      value={new Date(value)}
      year="numeric"
      month="short"
      day="2-digit"
      hour="2-digit"
      minute="2-digit"
      second="2-digit"
    />
  );
}

interface AttachmentDetailsFlyoutProps {
  attachment: Attachment;
  streamName: string;
  onClose: () => void;
  onUnlink?: () => void;
}

export function AttachmentDetailsFlyout({
  attachment,
  streamName,
  onClose,
  onUnlink,
}: AttachmentDetailsFlyoutProps) {
  const {
    core: { application },
    services: { telemetryClient },
    dependencies: {
      start: { share },
    },
  } = useKibana();

  const router = useStreamsAppRouter();
  const { timeState } = useTimefilter();

  const flyoutTitleId = useGeneratedHtmlId({
    prefix: 'attachmentDetailsFlyoutTitle',
  });

  const typeConfig = ATTACHMENT_TYPE_CONFIG[attachment.type];
  const url = getAttachmentUrl(
    attachment.redirectId,
    attachment.type,
    share.url.locators,
    timeState.timeRange
  );

  const handleNavigateToAttachment = () => {
    if (url) {
      telemetryClient.trackAttachmentFlyoutAction({
        stream_name: streamName,
        attachment_type: attachment.type,
        attachment_id: attachment.id,
        action: 'navigate_to_attachment',
      });
      application.navigateToUrl(url);
    }
  };

  const handleUnlink = () => {
    telemetryClient.trackAttachmentFlyoutAction({
      stream_name: streamName,
      attachment_type: attachment.type,
      attachment_id: attachment.id,
      action: 'unlink',
    });
    onUnlink?.();
  };

  const handleNavigateToStream = (targetStreamName: string) => {
    telemetryClient.trackAttachmentFlyoutAction({
      stream_name: streamName,
      attachment_type: attachment.type,
      attachment_id: attachment.id,
      action: 'navigate_to_attached_stream',
    });
    application.navigateToUrl(router.link('/{key}', { path: { key: targetStreamName } }));
  };

  const noDataPlaceholder = '-';

  const generalInfoItems = [
    {
      title: i18n.translate('xpack.streams.attachmentDetailsFlyout.attachmentTypeLabel', {
        defaultMessage: 'Attachment type',
      }),
      description: <AttachmentTypeBadge type={attachment.type} />,
    },
    {
      title: i18n.translate('xpack.streams.attachmentDetailsFlyout.tagsLabel', {
        defaultMessage: 'Tags',
      }),
      description:
        attachment.tags.length > 0 ? (
          <AttachmentTagsList tags={attachment.tags} showAll />
        ) : (
          <EuiText size="s">{noDataPlaceholder}</EuiText>
        ),
    },
    {
      title: i18n.translate('xpack.streams.attachmentDetailsFlyout.streamsLabel', {
        defaultMessage: 'Streams',
      }),
      description:
        attachment.streamNames.length > 0 ? (
          <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
            {attachment.streamNames.map((name) => (
              <EuiFlexItem key={name} grow={false}>
                <EuiLink
                  data-test-subj="streamsAppAttachmentDetailsFlyoutStreamLink"
                  onClick={() => handleNavigateToStream(name)}
                >
                  {name}
                </EuiLink>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        ) : (
          <EuiText size="s">{noDataPlaceholder}</EuiText>
        ),
    },
    {
      title: i18n.translate('xpack.streams.attachmentDetailsFlyout.createdAtLabel', {
        defaultMessage: 'Created at',
      }),
      description: attachment.createdAt ? (
        <FormattedDateTime value={attachment.createdAt} />
      ) : (
        <EuiText size="s">{noDataPlaceholder}</EuiText>
      ),
    },
    {
      title: i18n.translate('xpack.streams.attachmentDetailsFlyout.lastUpdatedLabel', {
        defaultMessage: 'Last updated',
      }),
      description: attachment.updatedAt ? (
        <FormattedDateTime value={attachment.updatedAt} />
      ) : (
        <EuiText size="s">{noDataPlaceholder}</EuiText>
      ),
    },
  ];

  return (
    <EuiFlyout
      onClose={onClose}
      aria-labelledby={flyoutTitleId}
      type="push"
      ownFocus={false}
      size="40%"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={flyoutTitleId}>{attachment.title}</h2>
        </EuiTitle>
        <EuiFlexGroup gutterSize="s" responsive={false}>
          {url && (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="streamsAppAttachmentDetailsFlyoutGoToButton"
                iconType={typeConfig.icon}
                onClick={handleNavigateToAttachment}
              >
                {i18n.translate('xpack.streams.attachmentDetailsFlyout.goToButtonLabel', {
                  defaultMessage: 'Go to {type}',
                  values: { type: typeConfig.label },
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
          {onUnlink && (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="streamsAppAttachmentDetailsFlyoutUnlinkButton"
                iconType="unlink"
                color="danger"
                onClick={handleUnlink}
              >
                {i18n.translate('xpack.streams.attachmentDetailsFlyout.removeButtonLabel', {
                  defaultMessage: 'Remove attachment',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiFlexItem>
            <InfoPanel
              title={i18n.translate('xpack.streams.attachmentDetailsFlyout.descriptionLabel', {
                defaultMessage: 'Description',
              })}
            >
              <EuiText>
                {attachment.description ||
                  i18n.translate('xpack.streams.attachmentDetailsFlyout.noDescriptionAvailable', {
                    defaultMessage: 'No description available',
                  })}
              </EuiText>
            </InfoPanel>
          </EuiFlexItem>
          <EuiFlexItem>
            <InfoPanel
              title={i18n.translate(
                'xpack.streams.attachmentDetailsFlyout.generalInformationLabel',
                {
                  defaultMessage: 'General information',
                }
              )}
            >
              {generalInfoItems.map((item, index) => (
                <React.Fragment key={index}>
                  <EuiDescriptionList
                    type="column"
                    columnWidths={[1, 2]}
                    compressed
                    listItems={[item]}
                  />
                  {index < generalInfoItems.length - 1 && <EuiHorizontalRule margin="m" />}
                </React.Fragment>
              ))}
            </InfoPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}
