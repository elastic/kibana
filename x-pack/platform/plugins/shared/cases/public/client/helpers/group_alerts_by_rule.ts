/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LEGACY_ALERT_TYPE } from '../../../common/constants/attachments';
import { toUnifiedAttachmentType } from '../../../common/utils/attachments/migration_utils';
import type { AttachmentRequestV2 } from '../../../common/types/api';
import type { Ecs } from '../../../common';
import { getRuleIdFromEvent } from './get_rule_id_from_event';
import type { CaseAttachmentsWithoutOwner } from '../../types';

type Maybe<T> = T | null;
interface Event {
  data: EventNonEcsData[];
  ecs: Ecs;
}
interface EventNonEcsData {
  field: string;
  value?: Maybe<string[]>;
}

type UnifiedReferenceAttachmentRequestWithoutOwner = Omit<
  Extract<AttachmentRequestV2, { attachmentId: string | string[] }>,
  'owner'
> & { metadata: { index: string[]; rule: { id: string; name: string } } };

export type GroupAlertsByRule = (items: Event[], owner: string) => CaseAttachmentsWithoutOwner;

export const groupAlertsByRule: GroupAlertsByRule = (items, owner) => {
  const attachmentType = toUnifiedAttachmentType(LEGACY_ALERT_TYPE, owner);
  const attachmentsByRule = items.reduce<
    Record<string, UnifiedReferenceAttachmentRequestWithoutOwner>
  >((acc, item) => {
    const rule = getRuleIdFromEvent(item);
    if (!acc[rule.id]) {
      acc[rule.id] = {
        attachmentId: [],
        metadata: {
          index: [],
          rule,
        },
        type: attachmentType,
      };
    }
    const attachmentIds = acc[rule.id].attachmentId;
    const indexes = acc[rule.id].metadata.index;
    if (Array.isArray(attachmentIds) && Array.isArray(indexes)) {
      attachmentIds.push(item.ecs._id ?? '');
      indexes.push(item.ecs._index ?? '');
    }
    return acc;
  }, {});
  return Object.values(attachmentsByRule);
};
