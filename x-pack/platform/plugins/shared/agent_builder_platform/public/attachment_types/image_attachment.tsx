/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut, EuiImage } from '@elastic/eui';
import { css } from '@emotion/react';
import type { ImageAttachment } from '@kbn/agent-builder-common/attachments';
import {
  ActionButtonType,
  type AttachmentUIDefinition,
  type AttachmentRenderProps,
} from '@kbn/agent-builder-browser/attachments';

const imageStyles = css`
  max-width: 100%;
  max-height: 320px;
  object-fit: contain;
`;

const canvasImageStyles = css`
  max-width: 100%;
  max-height: calc(100vh - 200px);
  object-fit: contain;
`;

const previewButtonLabel = i18n.translate(
  'xpack.agentBuilderPlatform.attachments.image.previewButton',
  {
    defaultMessage: 'Preview',
  }
);

const missingDataMessage = i18n.translate(
  'xpack.agentBuilderPlatform.attachments.image.missingData',
  {
    defaultMessage: 'Screenshot data is unavailable.',
  }
);

const getImageSrc = (attachment: ImageAttachment): string | undefined => {
  const mediaType = attachment.data?.media_type;
  const data = attachment.data?.data;
  if (!mediaType || !data) {
    return undefined;
  }
  return `data:${mediaType};base64,${data}`;
};

const ImageContent: React.FC<AttachmentRenderProps<ImageAttachment> & { canvas?: boolean }> = ({
  attachment,
  canvas = false,
}) => {
  const src = getImageSrc(attachment);
  if (!src) {
    return <EuiCallOut announceOnMount size="s" color="warning" title={missingDataMessage} />;
  }

  const alt =
    attachment.description ??
    i18n.translate('xpack.agentBuilderPlatform.attachments.image.alt', {
      defaultMessage: 'Attached image',
    });

  return (
    <EuiImage
      alt={alt}
      src={src}
      css={canvas ? canvasImageStyles : imageStyles}
      allowFullScreen
      data-test-subj={canvas ? 'agentBuilderImageAttachmentCanvas' : 'agentBuilderImageAttachment'}
    />
  );
};

/**
 * UI definition for image attachments
 */
export const imageAttachmentDefinition: AttachmentUIDefinition<ImageAttachment> = {
  getLabel: () =>
    i18n.translate('xpack.agentBuilderPlatform.attachments.image.label', {
      defaultMessage: 'Screenshot',
    }),
  getIcon: () => 'image',
  renderInlineContent: (props) => <ImageContent {...props} />,
  renderCanvasContent: (props) => <ImageContent {...props} canvas />,
  getActionButtons: ({ openCanvas, isCanvas }) => {
    if (isCanvas || !openCanvas) {
      return [];
    }
    return [
      {
        label: previewButtonLabel,
        icon: 'eye',
        type: ActionButtonType.SECONDARY,
        handler: openCanvas,
      },
    ];
  },
};
