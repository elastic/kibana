/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import type { BoostProfileType, DeletedRule } from '../../../common/types';
import type { AffectedLoadState } from './confirm_modal';
import { ConfirmModal } from './confirm_modal';
import { DeletedRulesList } from './deleted_rules_list';
import {
  DELETE_PROFILE_BODY,
  DELETE_PROFILE_CONFIRM,
  UNDO_WARNING,
  getDeleteProfileFallBack,
  getDeleteProfileRulesDeleted,
  getDeleteProfileTitle,
  getDeleteProfileWithRulesConfirm,
} from '../../translations';

export interface DeleteProfileModalProps extends AffectedLoadState {
  profileName: string;
  type: BoostProfileType;
  rules: readonly DeletedRule[];
  isDeleting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const getSummary = (type: BoostProfileType, rules: readonly DeletedRule[]): string => {
  const fallbacks = rules.flatMap((rule) => rule.fallbacks);
  const isEveryFallbackKnown = fallbacks.every(({ nextRuleName }) => nextRuleName !== undefined);
  return [
    getDeleteProfileRulesDeleted(rules.length),
    ...(fallbacks.length > 0
      ? [getDeleteProfileFallBack(type, fallbacks.length, isEveryFallbackKnown)]
      : []),
    UNDO_WARNING,
  ].join(' ');
};

export const DeleteProfileModal = ({
  profileName,
  type,
  rules,
  isDeleting = false,
  onCancel,
  onConfirm,
  isLoading = false,
  loadError,
  onRetryLoad,
}: DeleteProfileModalProps) => {
  const hasRules = rules.length > 0;

  return (
    <ConfirmModal
      isLoading={isLoading}
      loadError={loadError}
      onRetryLoad={onRetryLoad}
      title={getDeleteProfileTitle(profileName)}
      confirmButtonText={
        hasRules ? getDeleteProfileWithRulesConfirm(rules.length) : DELETE_PROFILE_CONFIRM
      }
      buttonColor="danger"
      isConfirming={isDeleting}
      onCancel={onCancel}
      onConfirm={onConfirm}
      description={hasRules ? getSummary(type, rules) : DELETE_PROFILE_BODY}
      data-test-subj="searchBoostDeleteProfileModal"
    >
      {hasRules && (
        <>
          <EuiSpacer size="l" />
          <DeletedRulesList type={type} rules={rules} />
        </>
      )}
    </ConfirmModal>
  );
};
