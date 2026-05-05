/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { paths } from '../../../constants';
import { useFetchRule } from '../../../hooks/use_fetch_rule';
import { useDeleteRule } from '../../../hooks/use_delete_rule';
import { useToggleRuleEnabled } from '../../../hooks/use_toggle_rule_enabled';
import type { RuleApiResponse } from '../../../services/rules_api';
import { DeleteConfirmationModal } from '../modals/delete_confirmation_modal';
import { RuleSummaryFlyout } from './rule_summary_flyout';

interface Props {
  ruleId: string;
  onClose: () => void;
}

export const RuleSummaryFlyoutContainer = ({ ruleId, onClose }: Props) => {
  const { navigateToUrl } = useService(CoreStart('application'));
  const { basePath } = useService(CoreStart('http'));
  const [ruleToDelete, setRuleToDelete] = useState<RuleApiResponse | null>(null);

  const { data: rule } = useFetchRule(ruleId);
  const { mutate: deleteRule, isLoading: isDeleting } = useDeleteRule();
  const { mutate: toggleRuleEnabled } = useToggleRuleEnabled();

  if (!rule) return null;

  return (
    <>
      <RuleSummaryFlyout
        rule={rule}
        onClose={onClose}
        onEdit={(r) => navigateToUrl(basePath.prepend(paths.ruleEdit(r.id)))}
        onClone={(r) =>
          navigateToUrl(
            basePath.prepend(`${paths.ruleCreate}?cloneFrom=${encodeURIComponent(r.id)}`)
          )
        }
        onDelete={(r) => setRuleToDelete(r)}
        onToggleEnabled={(r) => toggleRuleEnabled({ id: r.id, enabled: !r.enabled })}
      />
      {ruleToDelete && (
        <DeleteConfirmationModal
          ruleName={ruleToDelete.metadata.name}
          onCancel={() => setRuleToDelete(null)}
          onConfirm={() => {
            deleteRule(ruleToDelete.id, {
              onSuccess: () => {
                setRuleToDelete(null);
                onClose();
              },
            });
          }}
          isLoading={isDeleting}
        />
      )}
    </>
  );
};
