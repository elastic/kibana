/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useRef, useState } from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import numeral from '@elastic/numeral';
import type { ToastInput } from '@kbn/core/public';
import { AttachmentType, SUPPORTED_IMAGE_MIME_TYPES } from '@kbn/agent-builder-common/attachments';
import type { ConversationAttachment } from '@kbn/agent-builder-common/attachments';
import type { ScopedFilesClient } from '@kbn/files-plugin/public';
import { labels } from '../../../../utils/i18n';
import { useToasts } from '../../../../hooks/use_toasts';
import { useConversationContext } from '../../../../context/conversation/conversation_context';
import { useAgentBuilderServices } from '../../../../hooks/use_agent_builder_service';

// 2MB raw → ~2.7MB base64; stays within the 4MB route cap
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const FORMATTED_MAX_SIZE = numeral(MAX_IMAGE_BYTES).format('0.[0] b');

const ACCEPT_ATTRIBUTE = SUPPORTED_IMAGE_MIME_TYPES.join(',');

export const getUniqueName = (originalName: string, existingNames: Set<string>): string => {
  if (!existingNames.has(originalName)) return originalName;
  const dot = originalName.lastIndexOf('.');
  const base = dot !== -1 ? originalName.slice(0, dot) : originalName;
  const ext = dot !== -1 ? originalName.slice(dot) : '';
  let n = 2;
  while (existingNames.has(`${base} ${n}${ext}`)) n++;
  return `${base} ${n}${ext}`;
};

/**
 * Validates a File, uploads it to the files service, and calls upsertAttachments.
 * Used by both the attach button (file picker) and the paste handler.
 */
export const processImageFile = async ({
  file,
  name: providedName,
  filesClient,
  existingAttachments,
  upsertAttachments,
  addErrorToast,
}: {
  file: File;
  /** Pre-computed unique name. If omitted, computed from existingAttachments. */
  name?: string;
  filesClient: ScopedFilesClient;
  existingAttachments: ConversationAttachment[];
  upsertAttachments: (attachments: ConversationAttachment[]) => void;
  addErrorToast: (input: ToastInput) => void;
}): Promise<void> => {
  if (!(SUPPORTED_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
    addErrorToast({ title: labels.attachImage.invalidType });
    return;
  }

  if (file.size > MAX_IMAGE_BYTES) {
    addErrorToast({ title: labels.attachImage.tooLarge(FORMATTED_MAX_SIZE) });
    return;
  }

  const existingNames = new Set(
    existingAttachments.flatMap((a) =>
      'items' in a ? [] : a.type === AttachmentType.image ? [(a.data as { name?: string }).name ?? ''] : []
    )
  );
  const name = providedName ?? getUniqueName(file.name, existingNames);

  try {
    const { file: fileEntry } = await filesClient.create({ name, mimeType: file.type });
    await filesClient.upload({ id: fileEntry.id, body: file, contentType: file.type });
    upsertAttachments([
      {
        type: AttachmentType.image,
        data: { file_id: fileEntry.id, name, mime_type: file.type },
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
  const { filesClient } = useAgentBuilderServices();
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      // reset so the same file can be re-picked after removal
      event.target.value = '';
      if (!file || !upsertAttachments) return;

      setIsUploading(true);
      await processImageFile({
        file,
        filesClient,
        existingAttachments: attachments ?? [],
        upsertAttachments,
        addErrorToast,
      });
      setIsUploading(false);
    },
    [attachments, upsertAttachments, filesClient, addErrorToast]
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
          isLoading={isUploading}
          isDisabled={isUploading}
          data-test-subj="attachImageButton"
          size="s"
        />
      </EuiToolTip>
    </>
  );
};
