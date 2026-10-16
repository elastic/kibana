/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { BoostProfileType } from '../../../common/types';
import { useBoostServices } from '../../hooks/use_boost_services';
import { useDeleteRule } from '../../hooks/use_boost_state';
import { formatDataSourceCount } from '../format';

interface DeleteRuleModalProps {
  ruleName: string;
  /** The type of the rule's profile, which names what it applies to. */
  profileType: BoostProfileType | undefined;
  /** How many indices or data streams the rule applies to, after higher-ranked rules. */
  appliesTo: number;
  onClose: () => void;
  /** Called once the rule is deleted, such as to leave its details page. */
  onDeleted?: () => void;
}

/** Confirms deleting a custom rule. What it applied to falls back to the next matching rule. */
export const DeleteRuleModal = ({
  ruleName,
  profileType,
  appliesTo,
  onClose,
  onDeleted,
}: DeleteRuleModalProps) => {
  const { notifications } = useBoostServices();
  const titleId = useGeneratedHtmlId();
  const { mutate: deleteRule, isLoading: isDeleting } = useDeleteRule();

  return (
    <EuiConfirmModal
      aria-labelledby={titleId}
      titleProps={{ id: titleId }}
      title={i18n.translate('xpack.boost.rulesTab.deleteModalTitle', {
        defaultMessage: 'Delete boost rule "{name}"?',
        values: { name: ruleName },
      })}
      onCancel={onClose}
      onConfirm={() =>
        deleteRule(ruleName, {
          onSuccess: () => {
            notifications.toasts.addSuccess(
              i18n.translate('xpack.boost.rulesTab.deletedToast', {
                defaultMessage: 'Deleted boost rule "{name}"',
                values: { name: ruleName },
              })
            );
            onDeleted?.();
          },
          onSettled: onClose,
        })
      }
      cancelButtonText={i18n.translate('xpack.boost.rulesTab.deleteModalCancel', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate('xpack.boost.rulesTab.deleteModalConfirm', {
        defaultMessage: 'Delete rule',
      })}
      buttonColor="danger"
      isLoading={isDeleting}
      data-test-subj="deleteBoostRuleModal"
    >
      <p>
        {appliesTo > 0
          ? i18n.translate('xpack.boost.rulesTab.deleteModalBodyInUse', {
              defaultMessage:
                "The {dataSources} this rule applies to will use the next matching rule, such as the default rule. You can't undo this action.",
              values: { dataSources: formatDataSourceCount(profileType, appliesTo) },
            })
          : i18n.translate('xpack.boost.rulesTab.deleteModalBody', {
              defaultMessage: "This permanently deletes the rule. You can't undo this action.",
            })}
      </p>
    </EuiConfirmModal>
  );
};
