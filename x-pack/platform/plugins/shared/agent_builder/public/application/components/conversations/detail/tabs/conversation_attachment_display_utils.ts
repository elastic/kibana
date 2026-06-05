/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  UnknownAttachment,
  VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';
import {
  ATTACHMENT_REF_ACTOR,
  ATTACHMENT_REF_OPERATION,
  getLatestVersion,
} from '@kbn/agent-builder-common/attachments';
import type { AttachmentUIDefinition, AttachmentSourceLink } from '@kbn/agent-builder-browser/attachments';
import type { Conversation, ConversationRound } from '@kbn/agent-builder-common';

export interface ConversationAttachmentDisplayModel {
  attachment: UnknownAttachment;
  title: string;
  subtitle?: string;
  typeBadge: string;
  addedBy?: string;
  addedAt?: string;
  isPersistent: boolean;
  iconType: IconType;
  sourceLink?: AttachmentSourceLink;
}

const formatTypeBadge = (type: string): string => {
  const segment = type.includes('.') ? type.split('.').pop() : type;
  return (segment ?? type).replace(/_/g, ' ').toUpperCase();
};

const formatShortAttachmentId = (id: string): string => {
  if (id.length <= 24) {
    return id;
  }
  const colonIndex = id.indexOf(':');
  if (colonIndex > 0 && colonIndex < 32) {
    return id.slice(0, colonIndex);
  }
  return `${id.slice(0, 8)}…`;
};

const formatProductName = (type: string): string | undefined => {
  if (type.startsWith('security.')) {
    return 'Security';
  }
  if (type.startsWith('observability.')) {
    return 'Observability';
  }
  return undefined;
};

const readHostHint = (data: Record<string, unknown>): string | undefined => {
  const hostName = data['host.name'];
  if (typeof hostName === 'string' && hostName.length > 0) {
    return hostName;
  }
  if (Array.isArray(hostName) && typeof hostName[0] === 'string') {
    return hostName[0];
  }

  const alert = data.alert;
  if (typeof alert === 'string') {
    const hostLine = alert
      .split('\n')
      .map((line) => line.trim())
      .find((line) => /^host:/i.test(line));
    if (hostLine) {
      return hostLine.replace(/^host:\s*/i, '').trim();
    }
  }

  return undefined;
};

export const buildAttachmentSubtitle = ({
  type,
  data,
  headerSubtitle,
}: {
  type: string;
  data: Record<string, unknown>;
  headerSubtitle?: string;
}): string | undefined => {
  if (headerSubtitle) {
    return headerSubtitle;
  }

  const product = formatProductName(type);
  const hostHint = readHostHint(data);
  const parts: string[] = [];

  if (product) {
    parts.push(
      hostHint
        ? i18n.translate('xpack.agentBuilder.conversationDetail.attachments.fromProductHost', {
            defaultMessage: 'From {product} - {host}',
            values: { product, host: hostHint },
          })
        : i18n.translate('xpack.agentBuilder.conversationDetail.attachments.fromProduct', {
            defaultMessage: 'From {product}',
            values: { product },
          })
    );
  }

  return parts.length > 0 ? parts.join('') : undefined;
};

export const resolveAddedByLabel = ({
  attachmentId,
  rounds,
  conversationOwnerName,
}: {
  attachmentId: string;
  rounds?: ConversationRound[];
  conversationOwnerName?: string;
}): string | undefined => {
  if (!rounds?.length) {
    return conversationOwnerName;
  }

  for (const round of rounds) {
    const refs = round.input.attachment_refs;
    if (!refs?.length) {
      continue;
    }

    for (const ref of refs) {
      if (ref.attachment_id !== attachmentId) {
        continue;
      }

      const operation = ref.operation ?? ATTACHMENT_REF_OPERATION.created;
      if (operation === ATTACHMENT_REF_OPERATION.read) {
        continue;
      }

      const actor = ref.actor ?? ATTACHMENT_REF_ACTOR.user;
      if (actor === ATTACHMENT_REF_ACTOR.agent) {
        return i18n.translate('xpack.agentBuilder.conversationDetail.attachments.addedByAgent', {
          defaultMessage: 'Agent',
        });
      }
      if (actor === ATTACHMENT_REF_ACTOR.system) {
        return i18n.translate('xpack.agentBuilder.conversationDetail.attachments.addedBySystem', {
          defaultMessage: 'System',
        });
      }

      return conversationOwnerName;
    }
  }

  return conversationOwnerName;
};

export const toUnknownAttachment = (attachment: VersionedAttachment): UnknownAttachment => {
  const latest = getLatestVersion(attachment);

  return {
    id: attachment.id,
    type: attachment.type,
    data: (latest?.data ?? {}) as Record<string, unknown>,
    description: attachment.description,
    hidden: attachment.hidden,
    origin: attachment.origin,
    version: attachment.current_version,
    versionCount: attachment.versions.length,
  };
};

export const buildConversationAttachmentDisplayModel = ({
  attachment,
  uiDefinition,
  rounds,
  conversationOwnerName,
}: {
  attachment: VersionedAttachment;
  uiDefinition?: AttachmentUIDefinition;
  rounds?: ConversationRound[];
  conversationOwnerName?: string;
}): ConversationAttachmentDisplayModel => {
  const unknownAttachment = toUnknownAttachment(attachment);
  const label = uiDefinition?.getLabel(unknownAttachment) ?? attachment.type;
  const header = uiDefinition?.getHeader?.({ attachment: unknownAttachment });
  const latest = getLatestVersion(attachment);
  const data = (latest?.data ?? {}) as Record<string, unknown>;

  const titleDescription = attachment.description ?? label;
  const title = i18n.translate('xpack.agentBuilder.conversationDetail.attachments.title', {
    defaultMessage: '{id} — {description}',
    values: {
      id: formatShortAttachmentId(attachment.id),
      description: titleDescription,
    },
  });

  const subtitleBase = buildAttachmentSubtitle({
    type: attachment.type,
    data,
    headerSubtitle: header?.subtitle,
  });
  const addedBy = resolveAddedByLabel({
    attachmentId: attachment.id,
    rounds,
    conversationOwnerName,
  });
  const subtitle =
    subtitleBase && addedBy
      ? i18n.translate('xpack.agentBuilder.conversationDetail.attachments.subtitleWithActor', {
          defaultMessage: '{source} · added by {actor}',
          values: { source: subtitleBase, actor: addedBy },
        })
      : addedBy
        ? i18n.translate('xpack.agentBuilder.conversationDetail.attachments.subtitleActorOnly', {
            defaultMessage: 'added by {actor}',
            values: { actor: addedBy },
          })
        : subtitleBase;

  return {
    attachment: unknownAttachment,
    title,
    subtitle,
    typeBadge: formatTypeBadge(attachment.type),
    addedBy,
    addedAt: latest?.created_at,
    isPersistent: attachment.active !== false,
    iconType: header?.icon ?? uiDefinition?.getIcon?.() ?? 'document',
    sourceLink: uiDefinition?.getSourceLink?.({ attachment: unknownAttachment }),
  };
};

export const isDisplayableConversationAttachment = (
  attachment: VersionedAttachment
): boolean => !attachment.hidden && attachment.active !== false;

export const getDisplayableConversationAttachments = (
  attachments: VersionedAttachment[] = []
): VersionedAttachment[] => attachments.filter(isDisplayableConversationAttachment);

export const buildAttachmentDisplayModels = ({
  attachments,
  getUiDefinition,
  conversation,
}: {
  attachments: VersionedAttachment[];
  getUiDefinition: (type: string) => AttachmentUIDefinition | undefined;
  conversation?: Pick<Conversation, 'rounds' | 'user'>;
}): ConversationAttachmentDisplayModel[] => {
  const ownerName = conversation?.user.name ?? conversation?.user.username;

  return getDisplayableConversationAttachments(attachments).map((attachment) =>
      buildConversationAttachmentDisplayModel({
        attachment,
        uiDefinition: getUiDefinition(attachment.type),
        rounds: conversation?.rounds,
        conversationOwnerName: ownerName,
      })
    );
};
