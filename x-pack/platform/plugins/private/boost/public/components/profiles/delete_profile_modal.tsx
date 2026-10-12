/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useMemo } from 'react';
import {
  EuiAccordion,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiHorizontalRule,
  EuiNotificationBadge,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { resolveRule, sortRules } from '../../../common/resolution';
import type { BoostDataSource, BoostProfile, BoostRule } from '../../../common/types';
import { useBoostServices } from '../../hooks/use_boost_services';
import { useDeleteProfile } from '../../hooks/use_boost_state';

interface DeleteProfileModalProps {
  profile: BoostProfile;
  rules: BoostRule[];
  profiles: BoostProfile[];
  dataSources: BoostDataSource[];
  onClose: () => void;
}

interface AffectedDataSource {
  name: string;
  /** The rule that applies once the deleted rules are gone. */
  nextRule?: string;
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
}: DeleteProfileModalProps) => {
  const { euiTheme } = useEuiTheme();
  const { notifications } = useBoostServices();
  const titleId = useGeneratedHtmlId();
  const accordionIdPrefix = useGeneratedHtmlId({ prefix: 'deletedRule' });
  const { mutate: deleteProfile, isLoading: isDeleting } = useDeleteProfile();
  const { name, type } = profile;

  const deletedRules = useMemo<DeletedRule[]>(() => {
    const profilesByName = new Map(profiles.map((item) => [item.name, item]));
    const attached = sortRules(rules).filter(
      ({ is_builtin: isBuiltin, boost_profile: profileName }) => !isBuiltin && profileName === name
    );
    const attachedNames = new Set(attached.map((rule) => rule.name));
    const remainingRules = rules.filter((rule) => !attachedNames.has(rule.name));

    return attached.map((rule) => ({
      name: rule.name,
      affected: dataSources
        .filter((dataSource) => resolveRule(dataSource, rules, profilesByName)?.name === rule.name)
        .map((dataSource) => ({
          name: dataSource.name,
          nextRule: resolveRule(dataSource, remainingRules, profilesByName)?.name,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }, [name, rules, profiles, dataSources]);

  const affectedCount = deletedRules.reduce((total, { affected }) => total + affected.length, 0);
  // A lone rule with affected data sources starts open, so the common case needs no click.
  const rulesWithAffected = deletedRules.filter(({ affected }) => affected.length > 0);
  const openRuleName = rulesWithAffected.length === 1 ? rulesWithAffected[0].name : undefined;

  const listTitleId = useGeneratedHtmlId({ prefix: 'deletedRulesTitle' });

  // Both consequences are stated up front, ahead of the per-rule details.
  const summary = [
    i18n.translate('xpack.boost.deleteProfileModal.rulesDeleted', {
      defaultMessage: 'Deleting this profile also deletes any boost rule that uses it.',
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
        defaultMessage: "Delete ''{profileName}'' boost profile?",
        values: { profileName: name },
      })}
      onCancel={onClose}
      onConfirm={() =>
        deleteProfile(name, {
          onSuccess: () =>
            notifications.toasts.addSuccess(
              i18n.translate('xpack.boost.profilesTab.deletedToast', {
                defaultMessage: 'Deleted boost profile "{name}"',
                values: { name },
              })
            ),
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
          <EuiSpacer size="m" />
          <EuiFormLabel id={listTitleId}>
            {i18n.translate('xpack.boost.deleteProfileModal.rulesListTitle', {
              defaultMessage: 'Rules to be deleted',
            })}
          </EuiFormLabel>
          <EuiSpacer size="xs" />
          {/* Long lists scroll inside the panel, keeping the modal's buttons in view. */}
          <EuiPanel
            hasBorder
            hasShadow={false}
            paddingSize="none"
            role="region"
            aria-labelledby={listTitleId}
            tabIndex={0}
            css={{ maxBlockSize: euiTheme.base * 20, overflowY: 'auto' }}
          >
            {deletedRules.map(({ name: ruleName, affected }, index) => (
              <Fragment key={ruleName}>
                {index > 0 && <EuiHorizontalRule margin="none" />}
                {affected.length > 0 ? (
                  <EuiAccordion
                    id={`${accordionIdPrefix}-${ruleName}`}
                    initialIsOpen={ruleName === openRuleName}
                    buttonContent={<EuiText size="s">{ruleName}</EuiText>}
                    buttonProps={{ paddingSize: 's' }}
                    extraAction={<AffectedCountBadge count={affected.length} type={type} />}
                    css={{ paddingInline: euiTheme.size.s }}
                    data-test-subj={`deletedRule-${ruleName}`}
                  >
                    {/* Indented by the accordion arrow's width and gap, so the content lines up
                        with the rule name above it. */}
                    <div
                      css={{
                        paddingBlockEnd: euiTheme.size.s,
                        paddingInlineStart: `calc(${euiTheme.size.l} + ${euiTheme.size.xs})`,
                      }}
                    >
                      <AffectedTable ruleName={ruleName} affected={affected} type={type} />
                    </div>
                  </EuiAccordion>
                ) : (
                  // Matches an accordion button's padding and line height, so rule names align.
                  <EuiText
                    size="s"
                    css={{
                      padding: euiTheme.size.s,
                      lineHeight: euiTheme.size.l,
                    }}
                    data-test-subj={`deletedRule-${ruleName}`}
                  >
                    {ruleName}
                  </EuiText>
                )}
              </Fragment>
            ))}
          </EuiPanel>
        </>
      )}
    </EuiConfirmModal>
  );
};

const formatAffectedCount = (type: BoostProfile['type'], count: number): string =>
  type === 'indices'
    ? i18n.translate('xpack.boost.deleteProfileModal.affectedIndexCount', {
        defaultMessage: '{count, plural, one {# affected index} other {# affected indices}}',
        values: { count },
      })
    : i18n.translate('xpack.boost.deleteProfileModal.affectedDataStreamCount', {
        defaultMessage:
          '{count, plural, one {# affected data stream} other {# affected data streams}}',
        values: { count },
      });

interface AffectedCountBadgeProps {
  count: number;
  type: BoostProfile['type'];
}

const AffectedCountBadge = ({ count, type }: AffectedCountBadgeProps) => {
  const label = formatAffectedCount(type, count);
  return (
    <EuiToolTip content={label} display="flex" disableScreenReaderOutput>
      <EuiNotificationBadge color="subdued" role="img" aria-label={label} tabIndex={0}>
        {count}
      </EuiNotificationBadge>
    </EuiToolTip>
  );
};

interface AffectedTableProps {
  ruleName: string;
  affected: AffectedDataSource[];
  type: BoostProfile['type'];
}

/**
 * The affected data sources, grouped by the rule each will now use. Built from flex layout with
 * table roles, so the borders sit only between groups.
 */
const AffectedTable = ({ ruleName, affected, type }: AffectedTableProps) => {
  const { euiTheme } = useEuiTheme();

  const groups = useMemo(() => {
    const namesByRule = new Map<string, string[]>();
    affected.forEach(({ name, nextRule = '' }) =>
      namesByRule.set(nextRule, [...(namesByRule.get(nextRule) ?? []), name])
    );
    return [...namesByRule.entries()]
      .map(([nextRule, names]) => ({ nextRule, names }))
      .sort((a, b) => a.nextRule.localeCompare(b.nextRule));
  }, [affected]);

  return (
    <div
      role="table"
      aria-label={i18n.translate('xpack.boost.deleteProfileModal.affectedTableLabel', {
        defaultMessage: 'Data sources that {ruleName} applies to, and the rule each will now use',
        values: { ruleName },
      })}
    >
      <EuiFlexGroup
        role="row"
        gutterSize="s"
        responsive={false}
        css={{ paddingBlockEnd: euiTheme.size.xs, borderBlockEnd: euiTheme.border.thin }}
      >
        <EuiFlexItem role="columnheader">
          <EuiFormLabel>
            {type === 'indices'
              ? i18n.translate('xpack.boost.deleteProfileModal.affectedIndexColumn', {
                  defaultMessage: 'Affected index',
                })
              : i18n.translate('xpack.boost.deleteProfileModal.affectedDataStreamColumn', {
                  defaultMessage: 'Affected data stream',
                })}
          </EuiFormLabel>
        </EuiFlexItem>
        <EuiFlexItem role="columnheader">
          <EuiFormLabel>
            {i18n.translate('xpack.boost.deleteProfileModal.nextRuleColumn', {
              defaultMessage: 'Will now use rule',
            })}
          </EuiFormLabel>
        </EuiFlexItem>
      </EuiFlexGroup>
      {groups.map(({ nextRule, names }, index) => (
        <EuiFlexGroup
          key={nextRule}
          role="row"
          gutterSize="s"
          responsive={false}
          // Borders separate groups only, so the last group doesn't double the panel's border.
          css={{
            paddingBlock: euiTheme.size.xs,
            borderBlockStart: index > 0 ? euiTheme.border.thin : undefined,
          }}
        >
          <EuiFlexItem role="cell">
            <EuiText size="s">
              {names.map((name) => (
                <div key={name}>{name}</div>
              ))}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem role="cell">
            <EuiText size="s">{nextRule}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ))}
    </div>
  );
};
