/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { EuiFlyoutProps } from '@elastic/eui';
import { useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { useFetchRule } from '../../../hooks/use_fetch_rule';
import { useDeleteRule } from '../../../hooks/use_delete_rule';
import { useToggleRuleEnabled } from '../../../hooks/use_toggle_rule_enabled';
import { useRunRule } from '../../../hooks/use_run_rule';
import { useBulkUpdateRuleApiKey } from '../../../hooks/use_bulk_update_rule_api_key';
import { UserCapabilities } from '../../../services/user_capabilities';
import type { RuleApiResponse } from '../../../services/rules_api';
import { DeleteConfirmationModal } from '../modals/delete_confirmation_modal';
import { UpdateApiKeyConfirmationModal } from '../modals/update_api_key_confirmation_modal';
import { useRuleChangeHistoryModal } from '../modals/change_history';
import { EntityNotFoundFlyout } from '../../entity_not_found_flyout';
import { LoadingFlyout } from '../../loading_flyout';
import { RuleSummaryFlyout } from './rule_summary_flyout';

interface Props {
  ruleId: string;
  /** Defaults to `push`, which keeps the flyout beside the content it was opened from. */
  type?: EuiFlyoutProps['type'];
  onClose: () => void;
  onEdit: (rule: RuleApiResponse) => void;
  onClone: (rule: RuleApiResponse) => void;
}

export const RuleSummaryFlyoutContainer = ({
  ruleId,
  type = 'push',
  onClose,
  onEdit,
  onClone,
}: Props) => {
  const [ruleToDelete, setRuleToDelete] = useState<RuleApiResponse | null>(null);
  const [ruleToUpdateApiKey, setRuleToUpdateApiKey] = useState<RuleApiResponse | null>(null);
  const canWrite = useService(UserCapabilities).canWrite('rules');

  const { data: rule, isLoading, isError } = useFetchRule(ruleId);
  const { mutate: deleteRule, isLoading: isDeleting } = useDeleteRule();
  const { mutate: toggleRuleEnabled } = useToggleRuleEnabled();
  const { mutate: runRule } = useRunRule();
  const { mutate: updateRuleApiKey, isLoading: isUpdatingApiKey } = useBulkUpdateRuleApiKey();
  const { openChangeHistory, changeHistoryModal } = useRuleChangeHistoryModal();

  if (isLoading) {
    return <LoadingFlyout onClose={onClose} />;
  }

  if (isError || !rule) {
    return (
      <EntityNotFoundFlyout
        title={i18n.translate('xpack.alertingV2.rule.summaryFlyout.notFoundTitle', {
          defaultMessage: 'Rule not found',
        })}
        body={i18n.translate('xpack.alertingV2.rule.summaryFlyout.notFoundBody', {
          defaultMessage: 'The rule may have been deleted or you may not have access to it.',
        })}
        onClose={onClose}
      />
    );
  }

  return (
    <>
      <RuleSummaryFlyout
        rule={rule}
        canWrite={canWrite}
        type={type}
        hasAnimation={false}
        ownFocus={false}
        session="start"
        onClose={onClose}
        onEdit={onEdit}
        onClone={onClone}
        onDelete={(r) => setRuleToDelete(r)}
        onToggleEnabled={(r) => toggleRuleEnabled({ id: r.id, enabled: !r.enabled })}
        onRun={(r) => runRule({ id: r.id })}
        onUpdateApiKey={(r) => setRuleToUpdateApiKey(r)}
        onViewChangeHistory={(r) => openChangeHistory({ id: r.id, name: r.metadata.name })}
      />
      {changeHistoryModal}
      {ruleToDelete && (
        <DeleteConfirmationModal
          ruleName={ruleToDelete.metadata.name}
          onCancel={() => setRuleToDelete(null)}
          onConfirm={() => {
            deleteRule(
              { id: ruleToDelete.id, name: ruleToDelete.metadata.name },
              {
                onSuccess: () => {
                  setRuleToDelete(null);
                  onClose();
                },
              }
            );
          }}
          isLoading={isDeleting}
        />
      )}
      {ruleToUpdateApiKey && (
        <UpdateApiKeyConfirmationModal
          ruleName={ruleToUpdateApiKey.metadata.name}
          onCancel={() => setRuleToUpdateApiKey(null)}
          onConfirm={() => {
            updateRuleApiKey(
              { mode: 'by_ids', ids: [ruleToUpdateApiKey.id] },
              { onSettled: () => setRuleToUpdateApiKey(null) }
            );
          }}
          isLoading={isUpdatingApiKey}
        />
      )}
    </>
  );
};
