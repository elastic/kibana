/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { RulesApi } from '../../services/rules_api';
import {
  AttachmentPersistenceNotice,
  getAttachmentRunStatus,
  useAttachmentPersistence,
  type AttachmentPersistenceState,
  type AttachmentRunStatus,
} from './attachment_persistence';
import type { RuleAttachment } from './rule_attachment_definition';

const RULE_RUN_STATUS_LABELS = {
  draft: i18n.translate('xpack.alertingV2.ruleAttachment.statusDraft', {
    defaultMessage: 'Draft',
  }),
  enabled: i18n.translate('xpack.alertingV2.ruleAttachment.statusEnabled', {
    defaultMessage: 'Enabled',
  }),
  disabled: i18n.translate('xpack.alertingV2.ruleAttachment.statusDisabled', {
    defaultMessage: 'Disabled',
  }),
};

export const RULE_OUT_OF_SYNC_MESSAGE = i18n.translate(
  'xpack.alertingV2.ruleAttachment.persistence.outOfSync',
  { defaultMessage: 'The saved rule has changed since this attachment was last synced.' }
);

const RULE_UNSAVED_CHANGES_MESSAGE = i18n.translate(
  'xpack.alertingV2.ruleAttachment.persistence.unsavedChangesBody',
  { defaultMessage: 'Save the rule to keep these edits.' }
);

export const getRuleRunStatus = (isDraft: boolean, isEnabled: boolean): AttachmentRunStatus =>
  getAttachmentRunStatus(RULE_RUN_STATUS_LABELS, isDraft, isEnabled);

export const useRulePersistence = (attachment: RuleAttachment): AttachmentPersistenceState => {
  const rulesApi = useService(RulesApi);
  const fetchUpdatedAt = useCallback(
    async (id: string, signal: AbortSignal) => (await rulesApi.getRule(id, signal)).updated_at,
    [rulesApi]
  );
  return useAttachmentPersistence(attachment, {
    snapshotUpdatedAt: attachment.data.updated_at,
    fetchUpdatedAt,
  });
};

export const RulePersistenceNotice = (state: AttachmentPersistenceState) => (
  <AttachmentPersistenceNotice
    {...state}
    outOfSyncMessage={RULE_OUT_OF_SYNC_MESSAGE}
    unsavedChangesMessage={RULE_UNSAVED_CHANGES_MESSAGE}
  />
);
