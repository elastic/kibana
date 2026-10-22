/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import type { AttachmentAttributes } from '../../../../common/types/domain';
import { CASE_SAVED_OBJECT } from '../../../../common/constants';
import type { AttachmentForDeletion } from '../../../services/attachments/types';
import type { AttachmentSavedObjectType } from '../../../services/user_actions/types';

/** Builds an attachment as read for deletion, referencing the given case. */
export const toAttachmentForDeletion = (
  so: SavedObject<AttachmentAttributes>,
  caseId: string = 'mock-id-1'
): AttachmentForDeletion => ({
  id: so.id,
  type: so.type as AttachmentSavedObjectType,
  owner: so.attributes.owner,
  references: [{ id: caseId, name: 'associated-cases', type: CASE_SAVED_OBJECT }],
  attributes: so.attributes,
});
