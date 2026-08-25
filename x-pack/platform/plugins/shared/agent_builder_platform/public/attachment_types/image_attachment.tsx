/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { ImageAttachmentData, UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';

type ImageAttachment = UnknownAttachment & { data: ImageAttachmentData };

const ImageInlineContent: React.FC<{ attachment: ImageAttachment }> = ({ attachment }) => (
  <img
    src={attachment.data.content}
    alt={attachment.data.filename ?? 'image'}
    css={css`
      max-width: 100%;
      max-height: 400px;
      border-radius: 4px;
      display: block;
    `}
  />
);

export const imageAttachmentDefinition: AttachmentUIDefinition<ImageAttachment> = {
  getLabel: (attachment) =>
    attachment.data.filename ??
    i18n.translate('xpack.agentBuilderPlatform.attachments.image.label', {
      defaultMessage: 'Image',
    }),
  getIcon: () => 'image',
  renderInlineContent: (props) => <ImageInlineContent attachment={props.attachment} />,
};
