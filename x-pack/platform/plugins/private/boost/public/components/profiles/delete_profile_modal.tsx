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
  EuiHorizontalRule,
  EuiIcon,
  EuiNotificationBadge,
  EuiPanel,
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiText,
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
  // A lone rule with affected data sources starts open, so the common case needs no click.
  const rulesWithAffected = deletedRules.filter(({ affected }) => affected.length > 0);
  const openRuleName = rulesWithAffected.length === 1 ? rulesWithAffected[0].name : undefined;

  const rulesLabel = i18n.translate('xpack.boost.deleteProfileModal.rulesListLabel', {
    defaultMessage: 'Boost rules to delete',
  });

  // Both consequences are stated up front, ahead of the per-rule details.
  const summary = [
    i18n.translate('xpack.boost.deleteProfileModal.rulesDeleted', {
      defaultMessage: 'Deleting this profile also deletes any boost rule that uses it.',
    }),
    ...(affectedCount > 0
      ? [
          i18n.translate('xpack.boost.deleteProfileModal.fallBack', {
            defaultMessage: '{dataSources} will fall back to the next matching rule.',
            values: { dataSources: formatDataSourceCount(type, affectedCount) },
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
              defaultMessage: 'Delete profile and rules',
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
          {/* Long lists scroll inside the panel, keeping the modal's buttons in view. */}
          <EuiPanel
            hasBorder
            hasShadow={false}
            paddingSize="none"
            role="region"
            aria-label={rulesLabel}
            tabIndex={0}
            css={{ maxBlockSize: euiTheme.base * 20, overflowY: 'auto' }}
          >
            {deletedRules.map(({ name: ruleName, affected }, index) => (
              <Fragment key={ruleName}>
                {index > 0 && <EuiHorizontalRule margin="none" />}
                <EuiAccordion
                  id={`${accordionIdPrefix}-${ruleName}`}
                  initialIsOpen={ruleName === openRuleName}
                  buttonContent={<EuiText size="s">{ruleName}</EuiText>}
                  buttonProps={{ paddingSize: 's' }}
                  extraAction={
                    <EuiNotificationBadge
                      color="subdued"
                      aria-label={formatDataSourceCount(type, affected.length)}
                    >
                      {affected.length}
                    </EuiNotificationBadge>
                  }
                  paddingSize="s"
                  css={{ paddingInline: euiTheme.size.s }}
                  data-test-subj={`deletedRule-${ruleName}`}
                >
                  <AffectedList affected={affected} type={type} />
                </EuiAccordion>
              </Fragment>
            ))}
          </EuiPanel>
        </>
      )}
    </EuiConfirmModal>
  );
};

interface AffectedListProps {
  affected: AffectedDataSource[];
  type: BoostProfile['type'];
}

/** Each affected data source and the rule it falls back to, such as `logs-app → elastic-default`. */
const AffectedList = ({ affected, type }: AffectedListProps) => {
  if (affected.length === 0) {
    return (
      <EuiText size="s" color="subdued">
        <p>
          {type === 'indices'
            ? i18n.translate('xpack.boost.deleteProfileModal.noAffectedIndices', {
                defaultMessage: "This rule doesn't apply to any indices right now.",
              })
            : i18n.translate('xpack.boost.deleteProfileModal.noAffectedDataStreams', {
                defaultMessage: "This rule doesn't apply to any data streams right now.",
              })}
        </p>
      </EuiText>
    );
  }

  return (
    <EuiText size="s">
      <ul css={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {affected.map(({ name, nextRule }) => (
          <li key={name}>
            {/* The arrow reads well visually; screen readers get the full sentence instead. */}
            <span aria-hidden={true}>
              {name} <EuiIcon type="sortRight" size="s" color="subdued" aria-hidden={true} />{' '}
              {nextRule}
            </span>
            <EuiScreenReaderOnly>
              <span>
                {i18n.translate('xpack.boost.deleteProfileModal.fallsBackTo', {
                  defaultMessage: '{dataSource} will use {rule}',
                  values: { dataSource: name, rule: nextRule },
                })}
              </span>
            </EuiScreenReaderOnly>
          </li>
        ))}
      </ul>
    </EuiText>
  );
};
