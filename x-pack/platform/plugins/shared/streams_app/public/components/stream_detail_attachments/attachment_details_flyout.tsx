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
  EuiPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { Attachment } from '@kbn/streams-plugin/server/lib/streams/attachments/types';
import React from 'react';
import { useKibana } from '../../hooks/use_kibana';
import { useTimefilter } from '../../hooks/use_timefilter';
import { AttachmentTagsList } from './attachment_tags_list';
import { ATTACHMENT_TYPE_CONFIG, AttachmentTypeBadge } from './attachment_type_badge';
import { getAttachmentUrl } from './get_attachment_url';

interface InfoPanelProps {
  title: string;
  children: React.ReactNode;
}

function InfoPanel({ title, children }: InfoPanelProps) {
  const { euiTheme } = useEuiTheme();

  const panelStyles = css`
    border-left: 4px solid ${euiTheme.colors.backgroundBaseSubdued};
  `;

  return (
    <EuiPanel hasBorder css={panelStyles}>
      <EuiText css={{ fontWeight: euiTheme.font.weight.semiBold }}>{title}</EuiText>
      <EuiHorizontalRule margin="s" />
      {children}
    </EuiPanel>
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
    dependencies: {
      start: { share },
    },
  } = useKibana();

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

  const handleNavigate = () => {
    if (url) {
      application.navigateToUrl(url);
    }
  };

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
      description: <AttachmentTagsList tags={attachment.tags} />,
    },
    {
      title: i18n.translate('xpack.streams.attachmentDetailsFlyout.streamLabel', {
        defaultMessage: 'Stream',
      }),
      description: <EuiText color="primary">{streamName}</EuiText>,
    },
  ];

  return (
    <EuiFlyout
      onClose={onClose}
      aria-labelledby={flyoutTitleId}
      type="push"
      ownFocus={false}
      style={{ width: '40%' }}
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
                onClick={handleNavigate}
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
                onClick={onUnlink}
              >
                {i18n.translate('xpack.streams.attachmentDetailsFlyout.unlinkButtonLabel', {
                  defaultMessage: 'Unlink attachment',
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
                {i18n.translate('xpack.streams.attachmentDetailsFlyout.noDescriptionAvailable', {
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
                <React.Fragment key={item.title}>
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
