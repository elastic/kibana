/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiConfirmModal,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { resolveRule } from '../../../common/resolution';
import type { BoostDataSource, BoostProfile, BoostRule } from '../../../common/types';
import { useBoostServices } from '../../hooks/use_boost_services';
import { useDeleteRule } from '../../hooks/use_boost_state';
import { ChangeTable } from '../change_table';
import { formatDataSourceCount } from '../format';
import { MODAL_WIDTH } from '../modal_width';
import { TargetName } from './target_name';

interface DeleteRuleModalProps {
  ruleName: string;
  /** The rules in effect, which decide what the deleted rule's data sources fall back to. */
  rules: readonly BoostRule[];
  profiles: readonly BoostProfile[];
  dataSources: readonly BoostDataSource[];
  onClose: () => void;
  /** Called once the rule is deleted, such as to leave its details page. */
  onDeleted?: () => void;
}

interface AffectedDataSource {
  name: string;
  isHidden?: boolean;
  /** The rule that applies once this one is deleted. */
  nextRule?: BoostRule;
}

/**
 * Confirms deleting a custom rule, listing what it applies to and the rule and profile each falls
 * back to.
 */
export const DeleteRuleModal = ({
  ruleName,
  rules,
  profiles,
  dataSources,
  onClose,
  onDeleted,
}: DeleteRuleModalProps) => {
  const { euiTheme } = useEuiTheme();
  const { notifications } = useBoostServices();
  const titleId = useGeneratedHtmlId();
  const { mutate: deleteRule, isLoading: isDeleting } = useDeleteRule();

  const { profileType, affected } = useMemo(() => {
    const profilesByName = new Map(profiles.map((profile) => [profile.name, profile]));
    const rule = rules.find(({ name }) => name === ruleName);
    const remainingRules = rules.filter(({ name }) => name !== ruleName);
    return {
      profileType: rule && profilesByName.get(rule.boost_profile)?.type,
      affected: dataSources
        .filter((dataSource) => resolveRule(dataSource, rules, profilesByName)?.name === ruleName)
        .map(
          (dataSource): AffectedDataSource => ({
            name: dataSource.name,
            isHidden: dataSource.hidden,
            nextRule: resolveRule(dataSource, remainingRules, profilesByName),
          })
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  }, [ruleName, rules, profiles, dataSources]);

  const hasAffected = affected.length > 0;

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
      // As wide as the other modals that list what a change affects, when there's a list.
      maxWidth={hasAffected ? MODAL_WIDTH : undefined}
      data-test-subj="deleteBoostRuleModal"
    >
      <EuiText size="s">
        <p>
          {hasAffected
            ? i18n.translate('xpack.boost.rulesTab.deleteModalBodyInUse', {
                defaultMessage:
                  "Deleting this rule will cause the {dataSources} below to fall back to the next matching rule and its boost profile. The boost profile this rule uses won't be deleted. You can't undo this action.",
                values: { dataSources: formatDataSourceCount(profileType, affected.length) },
              })
            : i18n.translate('xpack.boost.rulesTab.deleteModalBody', {
                defaultMessage:
                  "This permanently deletes the rule. The boost profile it uses won't be deleted. You can't undo this action.",
              })}
        </p>
      </EuiText>
      {hasAffected && (
        <>
          <EuiSpacer size="l" />
          <EuiPanel hasBorder hasShadow={false} paddingSize="none">
            <ChangeTable
              aria-label={i18n.translate('xpack.boost.rulesTab.deleteModalTableLabel', {
                defaultMessage:
                  'Data sources this rule applies to, and the rule and profile each will now use',
              })}
              columns={[
                profileType === 'data_streams'
                  ? i18n.translate('xpack.boost.rulesTab.deleteModalDataStreamColumn', {
                      defaultMessage: 'Affected data stream',
                    })
                  : i18n.translate('xpack.boost.rulesTab.deleteModalIndexColumn', {
                      defaultMessage: 'Affected index',
                    }),
                i18n.translate('xpack.boost.rulesTab.deleteModalNextRuleColumn', {
                  defaultMessage: 'New rule',
                }),
                i18n.translate('xpack.boost.rulesTab.deleteModalNextProfileColumn', {
                  defaultMessage: 'New profile',
                }),
              ]}
              rows={affected.map(({ name, isHidden, nextRule }) => ({
                id: name,
                cells: [
                  <TargetName key="name" name={name} isHidden={isHidden} />,
                  nextRule?.name,
                  nextRule?.boost_profile,
                ],
              }))}
              // Long lists scroll, keeping the modal's buttons in view.
              maxHeight={euiTheme.base * 15}
            />
          </EuiPanel>
        </>
      )}
    </EuiConfirmModal>
  );
};
