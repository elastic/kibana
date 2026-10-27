/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiConfirmModal, EuiSpacer, EuiText, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { resolveRule } from '../../../common/resolution';
import type { BoostDataSource, BoostProfile, BoostRule } from '../../../common/types';
import { useBoostServices } from '../../hooks/use_boost_services';
import { useDeleteProfile } from '../../hooks/use_boost_state';
import { formatDataSourceCount } from '../format';
import { ChangeTable } from '../change_table';
import { MODAL_WIDTH } from '../modal_width';
import { RuleChangeList } from '../rule_change_list';
import { TargetName } from '../rules/target_name';

interface DeleteProfileModalProps {
  profile: BoostProfile;
  rules: BoostRule[];
  profiles: BoostProfile[];
  dataSources: BoostDataSource[];
  onClose: () => void;
  /** Called once the profile is deleted, such as to leave its details page. */
  onDeleted?: () => void;
}

interface AffectedDataSource {
  name: string;
  isHidden?: boolean;
  /** The rule that applies once the deleted rules are gone, and its profile. */
  nextRule?: BoostRule;
}

interface DeletedRule {
  name: string;
  affected: AffectedDataSource[];
}

/**
 * Confirms deleting a custom profile. Its custom rules are deleted with it, and the data sources
 * they applied to fall back to the next matching rule.
 */
export const DeleteProfileModal = ({
  profile,
  rules,
  profiles,
  dataSources,
  onClose,
  onDeleted,
}: DeleteProfileModalProps) => {
  const { notifications } = useBoostServices();
  const titleId = useGeneratedHtmlId();
  const { mutate: deleteProfile, isLoading: isDeleting } = useDeleteProfile();
  const { name, type } = profile;

  const deletedRules = useMemo<DeletedRule[]>(() => {
    const profilesByName = new Map(profiles.map((item) => [item.name, item]));
    const attached = rules
      .filter(
        ({ is_builtin: isBuiltin, boost_profile: profileName }) =>
          !isBuiltin && profileName === name
      )
      .sort((a, b) => a.name.localeCompare(b.name));
    const attachedNames = new Set(attached.map((rule) => rule.name));
    const remainingRules = rules.filter((rule) => !attachedNames.has(rule.name));

    return attached.map((rule) => ({
      name: rule.name,
      affected: dataSources
        .filter((dataSource) => resolveRule(dataSource, rules, profilesByName)?.name === rule.name)
        .map((dataSource) => ({
          name: dataSource.name,
          isHidden: dataSource.hidden,
          nextRule: resolveRule(dataSource, remainingRules, profilesByName),
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }, [name, rules, profiles, dataSources]);

  const affectedCount = deletedRules.reduce((total, { affected }) => total + affected.length, 0);

  // Both consequences are stated up front, ahead of the per-rule details.
  const summary = [
    i18n.translate('xpack.boost.deleteProfileModal.rulesDeleted', {
      defaultMessage:
        '{count, plural, one {Deleting this profile will also delete the boost rule that uses it.} other {Deleting this profile will also delete the # boost rules that use it.}}',
      values: { count: deletedRules.length },
    }),
    ...(affectedCount > 0
      ? [
          type === 'indices'
            ? i18n.translate('xpack.boost.deleteProfileModal.indicesFallBack', {
                defaultMessage: 'Affected indices will fall back to the next matching rule.',
              })
            : i18n.translate('xpack.boost.deleteProfileModal.dataStreamsFallBack', {
                defaultMessage: 'Affected data streams will fall back to the next matching rule.',
              }),
        ]
      : []),
    i18n.translate('xpack.boost.deleteProfileModal.undoWarning', {
      defaultMessage: "You can't undo this action.",
    }),
  ].join(' ');

  return (
    <EuiConfirmModal
      aria-labelledby={titleId}
      titleProps={{ id: titleId }}
      title={i18n.translate('xpack.boost.profilesTab.deleteModalTitle', {
        defaultMessage: 'Delete boost profile "{profileName}"?',
        values: { profileName: name },
      })}
      onCancel={onClose}
      onConfirm={() =>
        deleteProfile(name, {
          onSuccess: () => {
            notifications.toasts.addSuccess(
              i18n.translate('xpack.boost.profilesTab.deletedToast', {
                defaultMessage: 'Deleted boost profile "{name}"',
                values: { name },
              })
            );
            onDeleted?.();
          },
          onSettled: onClose,
        })
      }
      cancelButtonText={i18n.translate('xpack.boost.profilesTab.deleteModalCancel', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={
        deletedRules.length > 0
          ? i18n.translate('xpack.boost.deleteProfileModal.confirmWithRules', {
              defaultMessage:
                'Delete {profileCount, plural, one {# profile} other {# profiles}} and {ruleCount, plural, one {# rule} other {# rules}}',
              values: { profileCount: 1, ruleCount: deletedRules.length },
            })
          : i18n.translate('xpack.boost.profilesTab.deleteModalConfirm', {
              defaultMessage: 'Delete profile',
            })
      }
      buttonColor="danger"
      isLoading={isDeleting}
      maxWidth={MODAL_WIDTH}
      data-test-subj="deleteBoostProfileModal"
    >
      {deletedRules.length === 0 ? (
        <p>
          {i18n.translate('xpack.boost.profilesTab.deleteModalBody', {
            defaultMessage: "This permanently deletes the profile. You can't undo this action.",
          })}
        </p>
      ) : (
        <>
          <EuiText size="s">
            <p>{summary}</p>
          </EuiText>
          <EuiSpacer size="l" />
          <RuleChangeList
            aria-label={i18n.translate('xpack.boost.deleteProfileModal.rulesListLabel', {
              defaultMessage: 'Boost rules to be deleted',
            })}
            items={deletedRules.map(({ name: ruleName, affected }) => ({
              name: ruleName,
              count: affected.length > 0 ? formatDataSourceCount(type, affected.length) : undefined,
              details: affected.length > 0 && (
                <ChangeTable
                  aria-label={i18n.translate('xpack.boost.deleteProfileModal.affectedTableLabel', {
                    defaultMessage:
                      'Data sources that {ruleName} applies to, and the rule and profile each will now use',
                    values: { ruleName },
                  })}
                  columns={[
                    type === 'indices'
                      ? i18n.translate('xpack.boost.deleteProfileModal.affectedIndexColumn', {
                          defaultMessage: 'Affected index',
                        })
                      : i18n.translate('xpack.boost.deleteProfileModal.affectedDataStreamColumn', {
                          defaultMessage: 'Affected data stream',
                        }),
                    i18n.translate('xpack.boost.deleteProfileModal.nextRuleColumn', {
                      defaultMessage: 'New rule',
                    }),
                    i18n.translate('xpack.boost.deleteProfileModal.nextProfileColumn', {
                      defaultMessage: 'New profile',
                    }),
                  ]}
                  rows={affected.map(({ name: dataSourceName, isHidden, nextRule }) => ({
                    id: dataSourceName,
                    cells: [
                      <TargetName key="name" name={dataSourceName} isHidden={isHidden} />,
                      nextRule?.name,
                      nextRule?.boost_profile,
                    ],
                  }))}
                />
              ),
              'data-test-subj': `deletedRule-${ruleName}`,
            }))}
          />
        </>
      )}
    </EuiConfirmModal>
  );
};
