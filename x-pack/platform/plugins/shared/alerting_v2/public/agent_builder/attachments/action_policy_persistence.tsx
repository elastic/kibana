/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { ActionPoliciesApi } from '../../services/action_policies_api';
import {
  AttachmentPersistenceNotice,
  getAttachmentRunStatus,
  useAttachmentPersistence,
  type AttachmentPersistenceState,
  type AttachmentRunStatus,
} from './attachment_persistence';
import type { ActionPolicyAttachment } from './action_policy_attachment_definition';

const ACTION_POLICY_RUN_STATUS_LABELS = {
  draft: i18n.translate('xpack.alertingV2.actionPolicyAttachment.statusDraft', {
    defaultMessage: 'Draft',
  }),
  enabled: i18n.translate('xpack.alertingV2.actionPolicyAttachment.statusEnabled', {
    defaultMessage: 'Enabled',
  }),
  disabled: i18n.translate('xpack.alertingV2.actionPolicyAttachment.statusDisabled', {
    defaultMessage: 'Disabled',
  }),
};

export const ACTION_POLICY_OUT_OF_SYNC_MESSAGE = i18n.translate(
  'xpack.alertingV2.actionPolicyAttachment.persistence.outOfSync',
  { defaultMessage: 'The saved policy has changed since this attachment was last synced.' }
);

const ACTION_POLICY_UNSAVED_CHANGES_MESSAGE = i18n.translate(
  'xpack.alertingV2.actionPolicyAttachment.persistence.unsavedChangesBody',
  { defaultMessage: 'Save the policy to keep these edits.' }
);

export const getActionPolicyRunStatus = (
  isDraft: boolean,
  isEnabled: boolean
): AttachmentRunStatus =>
  getAttachmentRunStatus(ACTION_POLICY_RUN_STATUS_LABELS, isDraft, isEnabled);

export const useActionPolicyPersistence = (
  attachment: ActionPolicyAttachment
): AttachmentPersistenceState => {
  const actionPoliciesApi = useService(ActionPoliciesApi);
  const fetchUpdatedAt = useCallback(
    async (id: string, signal: AbortSignal) =>
      (await actionPoliciesApi.getActionPolicy(id, signal)).updated_at,
    [actionPoliciesApi]
  );
  return useAttachmentPersistence(attachment, {
    snapshotUpdatedAt: attachment.data.updated_at,
    fetchUpdatedAt,
  });
};

export const ActionPolicyPersistenceNotice = (state: AttachmentPersistenceState) => (
  <AttachmentPersistenceNotice
    {...state}
    outOfSyncMessage={ACTION_POLICY_OUT_OF_SYNC_MESSAGE}
    unsavedChangesMessage={ACTION_POLICY_UNSAVED_CHANGES_MESSAGE}
  />
);
