/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiSpacer, EuiText, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { FailedDeletion, ProfileDeletion } from '../../hooks/use_boost_state';
import { ChangeTable } from '../change_table';
import type { ErrorDetailsServices } from '../error_details';
import { RequestErrorDetails, showErrorToast } from '../error_details';

const TRY_AGAIN_NOTE = i18n.translate('xpack.boost.profileDeletion.tryAgainNote', {
  defaultMessage: 'You can try again.',
});

interface FailedRulesProps {
  summary: string;
  failures: readonly FailedDeletion[];
}

/** The rules a profile's deletion couldn't delete, and why, as the delete modals list changes. */
const FailedRules = ({ summary, failures }: FailedRulesProps) => {
  const { euiTheme } = useEuiTheme();
  return (
    <>
      <EuiText size="s">
        <p>{`${summary} ${TRY_AGAIN_NOTE}`}</p>
      </EuiText>
      <EuiSpacer size="l" />
      <EuiPanel hasBorder hasShadow={false} paddingSize="none">
        <ChangeTable
          aria-label={i18n.translate('xpack.boost.profileDeletion.failedRulesLabel', {
            defaultMessage: "Boost rules that couldn't be deleted, and why",
          })}
          columns={[
            i18n.translate('xpack.boost.profileDeletion.ruleColumn', {
              defaultMessage: 'Boost rule',
            }),
            i18n.translate('xpack.boost.profileDeletion.errorColumn', {
              defaultMessage: 'Error',
            }),
          ]}
          rows={failures.map(({ name, message }) => ({ id: name, cells: [name, message] }))}
          // Long lists scroll, keeping the modal's buttons in view.
          maxHeight={euiTheme.base * 15}
        />
      </EuiPanel>
    </>
  );
};

/**
 * Says what deleting a profile and the rules that use it did. When it all worked, a success toast
 * counts the rules too. When something failed, a danger toast says what was kept, and its details
 * say what couldn't be deleted, and why, with a button that tries again: with the rules that are
 * left, or else the profile alone.
 */
export const notifyProfileDeletion = (
  services: ErrorDetailsServices,
  name: string,
  deletion: ProfileDeletion,
  onRetry: (ruleNames: string[]) => void
): void => {
  const { ruleCount, failures } = deletion;
  if (failures.length === 0) {
    services.notifications.toasts.addSuccess(
      ruleCount === 0
        ? i18n.translate('xpack.boost.profilesTab.deletedToast', {
            defaultMessage: 'Deleted boost profile "{name}"',
            values: { name },
          })
        : i18n.translate('xpack.boost.profileDeletion.deletedWithRules', {
            defaultMessage:
              'Deleted boost profile "{name}" and {ruleCount, plural, one {# rule} other {# rules}}',
            values: { name, ruleCount },
          })
    );
    return;
  }

  const title = i18n.translate('xpack.boost.profileDeletion.failedTitle', {
    defaultMessage: 'Unable to delete boost profile "{name}"',
    values: { name },
  });
  const failedRules = failures.filter(({ kind }) => kind === 'rule');
  if (failedRules.length > 0) {
    const summary = i18n.translate('xpack.boost.profileDeletion.rulesFailed', {
      defaultMessage:
        "{ruleCount, plural, one {Couldn't delete the rule that uses it} other {Couldn't delete {failedRuleCount} of the # rules that use it}}, so the profile was kept.",
      values: { ruleCount, failedRuleCount: failedRules.length },
    });
    showErrorToast(services, {
      title,
      text: summary,
      details: <FailedRules summary={summary} failures={failedRules} />,
      onRetry: () => onRetry(failedRules.map(({ name: ruleName }) => ruleName)),
    });
    return;
  }

  // Only the profile failed, after any rules that used it were deleted.
  const [{ details }] = failures;
  const description =
    ruleCount > 0
      ? i18n.translate('xpack.boost.profileDeletion.profileFailedAfterRules', {
          defaultMessage:
            '{ruleCount, plural, one {Deleted the rule that used it} other {Deleted the # rules that used it}}, but an error prevented the profile from being deleted.',
          values: { ruleCount },
        })
      : i18n.translate('xpack.boost.profileDeletion.profileFailedAlone', {
          defaultMessage: 'An error prevented this profile from being deleted.',
        });
  showErrorToast(services, {
    title,
    // Without rules, nothing else happened, so the title says it all.
    text:
      ruleCount > 0
        ? i18n.translate('xpack.boost.profileDeletion.profileFailed', {
            defaultMessage:
              '{ruleCount, plural, one {Deleted the rule that used it} other {Deleted the # rules that used it}}, but not the profile.',
            values: { ruleCount },
          })
        : undefined,
    details: (
      <RequestErrorDetails description={`${description} ${TRY_AGAIN_NOTE}`} details={details} />
    ),
    onRetry: () => onRetry([]),
  });
};
