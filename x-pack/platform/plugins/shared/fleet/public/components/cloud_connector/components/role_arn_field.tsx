/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFieldText, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnWarningCallout } from '@kbn/ui-callout';

import {
  CLEARED_IAM_ROLE_ARN_MESSAGE,
  INVALID_IAM_ROLE_ARN_MESSAGE,
  isIamRoleArnCleared,
  isIamRoleArnInvalid,
} from '../utils';

export const ROLE_ARN_FIELD_TEST_SUBJECTS = {
  INPUT: 'cloudConnectorFlyoutRoleArnInput',
  ERROR: 'cloudConnectorFlyoutRoleArnError',
  CALLOUT: 'cloudConnectorFlyoutRoleArnCallout',
} as const;

const FIELD_LABEL = i18n.translate('xpack.fleet.cloudConnector.policiesFlyout.roleArnFieldLabel', {
  defaultMessage: 'Role ARN',
});

const FIELD_HELP = i18n.translate('xpack.fleet.cloudConnector.policiesFlyout.roleArnFieldHelp', {
  defaultMessage:
    'The IAM role every integration using this identity assumes. Changing it changes how they all authenticate. Agents switch to the new role on their next policy update.',
});

const CALLOUT_TITLE = i18n.translate(
  'xpack.fleet.cloudConnector.policiesFlyout.roleArnCalloutTitle',
  { defaultMessage: 'Changing the role ARN will update every integration using this identity' }
);

export interface RoleArnFieldProps {
  /** The current edited value (controlled). */
  value: string;
  /** The stored value on the connector; used to detect whether the field has been edited. */
  storedValue?: string;
  onChange: (nextValue: string) => void;
  /** Number of package policies referencing this identity; `undefined` means still loading. */
  affectedPackagePolicyCount: number | undefined;
  /** The identity is shared with other spaces, whose policies the count does not include. */
  sharedWithOtherSpaces?: boolean;
}

export const RoleArnField: React.FC<RoleArnFieldProps> = ({
  value,
  storedValue,
  onChange,
  affectedPackagePolicyCount,
  sharedWithOtherSpaces = false,
}) => {
  const isInvalid = useMemo(() => isIamRoleArnInvalid(value), [value]);
  // An identity cannot give up its role, so an emptied field is an error rather than "unchanged":
  // without it the clear is dropped from the payload and silently discarded on save.
  const isCleared = useMemo(() => isIamRoleArnCleared(value, storedValue), [value, storedValue]);
  const errorMessage = isInvalid
    ? INVALID_IAM_ROLE_ARN_MESSAGE
    : isCleared
    ? CLEARED_IAM_ROLE_ARN_MESSAGE
    : undefined;
  // `value` is already trimmed by the input handler below, matching IacTemplateDetails.
  const isEdited = storedValue !== undefined && value !== storedValue.trim();
  const showCallout = isEdited && errorMessage === undefined;

  return (
    <>
      <EuiFormRow
        label={FIELD_LABEL}
        helpText={FIELD_HELP}
        isInvalid={errorMessage !== undefined}
        error={
          errorMessage ? (
            <span data-test-subj={ROLE_ARN_FIELD_TEST_SUBJECTS.ERROR}>{errorMessage}</span>
          ) : undefined
        }
        fullWidth
      >
        <EuiFieldText
          data-test-subj={ROLE_ARN_FIELD_TEST_SUBJECTS.INPUT}
          value={value}
          onChange={(event) => onChange(event.target.value.trim())}
          isInvalid={errorMessage !== undefined}
          fullWidth
        />
      </EuiFormRow>
      {showCallout && (
        <>
          <EuiSpacer size="s" />
          <div data-test-subj={ROLE_ARN_FIELD_TEST_SUBJECTS.CALLOUT}>
            <KbnWarningCallout
              title={CALLOUT_TITLE}
              text={
                affectedPackagePolicyCount === undefined ? (
                  <FormattedMessage
                    id="xpack.fleet.cloudConnector.policiesFlyout.roleArnCalloutUnknownCount"
                    defaultMessage="This identity is used by other integrations. Saving changes how each of them authenticates to AWS. Agents will switch to the new role on their next policy check-in. If the new role is not trusted or lacks the required permissions, all of them stop collecting."
                  />
                ) : sharedWithOtherSpaces ? (
                  <FormattedMessage
                    id="xpack.fleet.cloudConnector.policiesFlyout.roleArnCalloutSharedSpaces"
                    defaultMessage="This identity is used by {count, plural, one {# package policy} other {# package policies}} in this space, and it is shared with other spaces. Saving also changes the policies that use it in other spaces. Agents will switch to the new role on their next policy check-in. If the new role is not trusted or lacks the required permissions, all of them stop collecting."
                    values={{ count: affectedPackagePolicyCount }}
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.fleet.cloudConnector.policiesFlyout.roleArnCalloutKnownCount"
                    defaultMessage="This identity is used by {count, plural, one {# package policy} other {# package policies}}. Saving changes how each of them authenticates to AWS. Agents will switch to the new role on their next policy check-in. If the new role is not trusted or lacks the required permissions, all of them stop collecting."
                    values={{ count: affectedPackagePolicyCount }}
                  />
                )
              }
            />
          </div>
        </>
      )}
    </>
  );
};
