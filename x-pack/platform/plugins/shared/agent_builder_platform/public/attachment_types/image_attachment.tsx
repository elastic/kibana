/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { HttpStart } from '@kbn/core/public';
import type { ImageAttachmentData, UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import { CHAT_ATTACHMENT_IMAGES_FILE_KIND } from '@kbn/agent-builder-common/attachments';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';

type ImageAttachment = UnknownAttachment & { data: ImageAttachmentData };

const getImageSrc = (attachment: ImageAttachment, http: HttpStart): string | undefined => {
  const { file_id: fileId } = attachment.data;
  if (!fileId) return undefined;
  return http.basePath.prepend(
    `/api/files/files/${CHAT_ATTACHMENT_IMAGES_FILE_KIND}/${fileId}/blob`
  );
};

const ImageInlineContent: React.FC<{ attachment: ImageAttachment; http: HttpStart }> = ({
  attachment,
  http,
}) => (
  <img
    src={getImageSrc(attachment, http)}
    alt={attachment.data.name ?? 'image'}
    css={css`
      max-width: 100%;
      max-height: 400px;
      border-radius: 4px;
      display: block;
    `}
  />
);

export const createImageAttachmentDefinition = ({
  http,
}: {
  http: HttpStart;
}): AttachmentUIDefinition<ImageAttachment> => ({
  getLabel: (attachment) =>
    attachment.data.name ??
    i18n.translate('xpack.agentBuilderPlatform.attachments.image.label', {
      defaultMessage: 'Image',
    }),
  getIcon: () => 'image',
  getThumbnail: (attachment) => getImageSrc(attachment, http),
  renderInlineContent: (props) => <ImageInlineContent attachment={props.attachment} http={http} />,
});
