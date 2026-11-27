/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import type { BoostProfileType, FallbackTarget } from '../../../common/types';
import type { AffectedLoadState } from './confirm_modal';
import { ConfirmModal } from './confirm_modal';
import { AffectedTable } from './affected_table';
import { FALLBACK_COLUMNS } from './fallback_columns';
import {
  DELETE_RULE_BODY,
  DELETE_RULE_CONFIRM,
  getDeleteRuleBodyWithFallbacks,
  getDeleteRuleTableLabel,
  getDeleteRuleTitle,
} from '../../translations';

export interface DeleteRuleModalProps extends AffectedLoadState {
  ruleName: string;
  /** The type of the rule's profile. */
  type: BoostProfileType;
  fallbacks: readonly FallbackTarget[];
  isDeleting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const DeleteRuleModal = ({
  ruleName,
  type,
  fallbacks,
  isDeleting = false,
  onCancel,
  onConfirm,
  isLoading = false,
  loadError,
  onRetryLoad,
}: DeleteRuleModalProps) => {
  const hasFallbacks = fallbacks.length > 0;

  return (
    <ConfirmModal
      isLoading={isLoading}
      loadError={loadError}
      onRetryLoad={onRetryLoad}
      title={getDeleteRuleTitle(ruleName)}
      confirmButtonText={DELETE_RULE_CONFIRM}
      buttonColor="danger"
      isConfirming={isDeleting}
      onCancel={onCancel}
      onConfirm={onConfirm}
      description={
        hasFallbacks
          ? getDeleteRuleBodyWithFallbacks(
              type,
              fallbacks.length,
              fallbacks.every(({ nextRuleName }) => nextRuleName !== undefined)
            )
          : DELETE_RULE_BODY
      }
      data-test-subj="searchBoostDeleteRuleModal"
    >
      {hasFallbacks && (
        <>
          <EuiSpacer size="l" />
          <AffectedTable
            aria-label={getDeleteRuleTableLabel(type)}
            type={type}
            targets={fallbacks}
            columns={FALLBACK_COLUMNS}
            data-test-subj="searchBoostDeleteRuleModalTable"
          />
        </>
      )}
    </ConfirmModal>
  );
};
