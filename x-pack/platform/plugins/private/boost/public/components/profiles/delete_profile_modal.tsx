/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useMemo } from 'react';
import {
  EuiAccordion,
  EuiCode,
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
import { formatDataSourceCount } from '../format';

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
                'Delete profile and {ruleCount, plural, one {# rule} other {# rules}}',
              values: { ruleCount: deletedRules.length },
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
                    buttonContent={<EuiText size="s">{ruleName}</EuiText>}
                    buttonProps={{ paddingSize: 's' }}
                    extraAction={<AffectedCountBadge count={affected.length} type={type} />}
                    css={{ paddingBlock: euiTheme.size.s, paddingInline: euiTheme.size.base }}
                    data-test-subj={`deletedRule-${ruleName}`}
                  >
                    {/* Indented by the accordion arrow's width and gap, so the content lines up
                        with the rule name above it. */}
                    <div
                      css={{
                        paddingBlock: euiTheme.size.s,
                        paddingInlineStart: `calc(${euiTheme.size.l} + ${euiTheme.size.xs})`,
                      }}
                    >
                      <AffectedTable ruleName={ruleName} affected={affected} type={type} />
                    </div>
                  </EuiAccordion>
                ) : (
                  // Matches an accordion's padding, line height, and chevron indent, so rule
                  // names line up whether or not the rule expands.
                  <EuiText
                    size="s"
                    css={{
                      paddingBlock: `calc(${euiTheme.size.s} * 2)`,
                      paddingInlineStart: `calc(${euiTheme.size.base} + ${euiTheme.size.l} + ${euiTheme.size.xs})`,
                      paddingInlineEnd: euiTheme.size.base,
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
  return (
    <EuiToolTip content={formatAffectedCount(type, count)} display="flex">
      <EuiNotificationBadge color="subdued">
        {formatDataSourceCount(type, count)}
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
 * The affected data sources and the rule each will now use. Built from flex layout with table
 * roles, so the borders sit only between rows.
 */
const AffectedTable = ({ ruleName, affected, type }: AffectedTableProps) => {
  const { euiTheme } = useEuiTheme();

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
      {affected.map(({ name, nextRule }) => (
        <EuiFlexGroup
          key={name}
          role="row"
          gutterSize="s"
          responsive={false}
          css={{ paddingBlock: euiTheme.size.xs }}
        >
          <EuiFlexItem role="cell">
            <EuiText size="xs">
              <EuiCode>{name}</EuiCode>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem role="cell">
            <EuiText size="xs">{nextRule}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ))}
    </div>
  );
};
