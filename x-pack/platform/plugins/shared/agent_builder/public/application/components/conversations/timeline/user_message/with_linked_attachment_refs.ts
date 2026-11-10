/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttachmentVersionRef,
  VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';
import {
  ATTACHMENT_REF_ACTOR,
  ATTACHMENT_REF_OPERATION,
} from '@kbn/agent-builder-common/attachments';
import {
  ATTACHMENT_ID_PARAM,
  BINARY_ATTACHMENT_SCHEME,
} from '../../conversation_input/message_editor/attachment_placeholder';

// The query of a binary chip link, e.g. `id=abc` in `[a.pdf](binary://a.pdf?id=abc)`.
const BINARY_LINK_QUERY_PATTERN = new RegExp(
  `\\]\\(${BINARY_ATTACHMENT_SCHEME}:\\/\\/[^?)]*\\?([^)]*)\\)`,
  'g'
);

/** Ids of the attachments the message text links to, in text order. */
export const getLinkedAttachmentIds = (text: string): string[] =>
  Array.from(text.matchAll(BINARY_LINK_QUERY_PATTERN)).flatMap(([, query]) => {
    const id = new URLSearchParams(query).get(ATTACHMENT_ID_PARAM);
    return id ? [id] : [];
  });

/**
 * Adds a ref for each attachment the message text links to, e.g. a PDF added to the conversation
 * on paste. Such an attachment has no `chat_input` event tied to the message, so the link is
 * what ties it to the message.
 */
export const withLinkedAttachmentRefs = ({
  text,
  attachmentRefs,
  conversationAttachments,
}: {
  text: string;
  attachmentRefs?: AttachmentVersionRef[];
  conversationAttachments?: VersionedAttachment[];
}): AttachmentVersionRef[] | undefined => {
  const linkedIds = getLinkedAttachmentIds(text);
  if (linkedIds.length === 0) {
    return attachmentRefs;
  }

  const refs = [...(attachmentRefs ?? [])];
  const knownIds = new Set(refs.map(({ attachment_id: id }) => id));
  for (const id of linkedIds) {
    const attachment = conversationAttachments?.find((candidate) => candidate.id === id);
    if (!attachment || knownIds.has(id)) {
      continue;
    }
    knownIds.add(id);
    refs.push({
      attachment_id: id,
      version: attachment.current_version,
      operation: ATTACHMENT_REF_OPERATION.created,
      actor: ATTACHMENT_REF_ACTOR.user,
    });
  }
  return refs;
};
