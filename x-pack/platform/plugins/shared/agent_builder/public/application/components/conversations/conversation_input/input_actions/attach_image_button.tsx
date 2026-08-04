/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useRef } from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import numeral from '@elastic/numeral';
import type { ToastInput } from '@kbn/core/public';
import { AttachmentType, SUPPORTED_IMAGE_MIME_TYPES } from '@kbn/agent-builder-common/attachments';
import type { ConversationAttachment } from '@kbn/agent-builder-common/attachments';
import { readBlobAsDataUrl } from '../../../../utils/data_url';
import { labels } from '../../../../utils/i18n';
import { useToasts } from '../../../../hooks/use_toasts';
import { useConversationContext } from '../../../../context/conversation/conversation_context';

// 2MB raw → ~2.7MB base64; stays within the 4MB route cap
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const FORMATTED_MAX_SIZE = numeral(MAX_IMAGE_BYTES).format('0.[0] b');

const ACCEPT_ATTRIBUTE = SUPPORTED_IMAGE_MIME_TYPES.join(',');

/**
 * Validates a File and, on success, calls upsertAttachments with an image attachment.
 * Used by both the attach button (file picker) and the paste handler.
 */
export const processImageFile = async ({
  file,
  upsertAttachments,
  addErrorToast,
  hasImageAttached,
}: {
  file: File;
  upsertAttachments: (attachments: ConversationAttachment[]) => void;
  addErrorToast: (input: ToastInput) => void;
  hasImageAttached: boolean;
}): Promise<void> => {
  if (hasImageAttached) {
    addErrorToast({ title: labels.attachImage.alreadyAttached });
    return;
  }

  if (!(SUPPORTED_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
    addErrorToast({ title: labels.attachImage.invalidType });
    return;
  }

  if (file.size > MAX_IMAGE_BYTES) {
    addErrorToast({ title: labels.attachImage.tooLarge(FORMATTED_MAX_SIZE) });
    return;
  }

  try {
    const dataUrl = await readBlobAsDataUrl(file);
    upsertAttachments([
      {
        type: AttachmentType.image,
        data: { content: dataUrl, mime_type: file.type, filename: file.name },
      } as ConversationAttachment,
    ]);
  } catch {
    addErrorToast({ title: labels.attachImage.readError });
  }
};

export const AttachImageButton: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addErrorToast } = useToasts();
  const { attachments, upsertAttachments } = useConversationContext();

  const hasImageAttached = Boolean(
    attachments?.some((a) => !('items' in a) && a.type === AttachmentType.image)
  );

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      // reset so the same file can be re-picked after removal
      event.target.value = '';
      if (!file || !upsertAttachments) return;

      await processImageFile({ file, upsertAttachments, addErrorToast, hasImageAttached });
    },
    [upsertAttachments, hasImageAttached, addErrorToast]
  );

  if (!upsertAttachments) return null;

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        style={{ display: 'none' }}
        onChange={handleFileChange}
        data-test-subj="attachImageInput"
      />
      <EuiToolTip content={labels.attachImage.buttonAriaLabel} disableScreenReaderOutput>
        <EuiButtonIcon
          iconType="image"
          aria-label={labels.attachImage.buttonAriaLabel}
          onClick={() => fileInputRef.current?.click()}
          data-test-subj="attachImageButton"
          size="s"
        />
      </EuiToolTip>
    </>
  );
};
