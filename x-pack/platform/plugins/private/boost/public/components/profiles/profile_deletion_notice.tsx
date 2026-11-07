/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { ProfileDeletion } from '../../hooks/use_boost_state';
import type { ErrorDetailsServices } from '../error_details';
import { ERROR_NAME_COLUMNS, ErrorDetails, showErrorToast } from '../error_details';

const TRY_AGAIN_NOTE = i18n.translate('xpack.boost.profileDeletion.tryAgainNote', {
  defaultMessage: 'You can try again.',
});

/**
 * Says what deleting a profile and the rules that use it did. When it all worked, a success toast
 * counts the rules too. When something failed, a danger toast says what was kept, and its details
 * list what couldn't be deleted, and why, with a button that tries again: with the rules that are
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
      details: (
        <ErrorDetails
          description={`${summary} ${TRY_AGAIN_NOTE}`}
          nameColumn={ERROR_NAME_COLUMNS.rule}
          failures={failedRules}
        />
      ),
      onRetry: () => onRetry(failedRules.map(({ name: ruleName }) => ruleName)),
    });
    return;
  }

  // Only the profile failed, after any rules that used it were deleted.
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
    details: <ErrorDetails description={`${description} ${TRY_AGAIN_NOTE}`} failures={failures} />,
    onRetry: () => onRetry([]),
  });
};
