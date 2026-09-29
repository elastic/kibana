/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiLink,
  EuiSpacer,
  EuiTextArea,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useRef, useState } from 'react';
import useAsyncRetry from 'react-use/lib/useAsyncRetry';
import useMountedState from 'react-use/lib/useMountedState';

import { isHttpFetchError } from '@kbn/core-http-browser';
import type { ServiceAccount } from '@kbn/core-security-browser';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { PublicMethodsOf } from '@kbn/utility-types';

import {
  SERVICE_ACCOUNT_DESCRIPTION_MAX_LENGTH,
  SERVICE_ACCOUNT_NAME_MAX_LENGTH,
  SERVICE_ACCOUNT_NAME_REGEX,
} from '../../../common/service_accounts/constants';
import type { ServiceAccountsAPIClient } from '../../service_accounts';
import { RoleComboBox } from '../role_combo_box';
import type { RolesAPIClient } from '../roles';

interface Props {
  isServerless: boolean;
  serviceAccountsAPIClient: Pick<PublicMethodsOf<ServiceAccountsAPIClient>, 'create'>;
  rolesAPIClient: Pick<PublicMethodsOf<RolesAPIClient>, 'getRoles'>;
  createRoleUrl?: string;
  onClose: () => void;
  onCreated: (account: ServiceAccount) => void;
}

export const CreateServiceAccountFlyout = ({
  isServerless,
  serviceAccountsAPIClient,
  rolesAPIClient,
  createRoleUrl,
  onClose,
  onCreated,
}: Props) => {
  const titleId = useGeneratedHtmlId({ prefix: 'createServiceAccountTitle' });
  const formId = useGeneratedHtmlId({ prefix: 'createServiceAccountForm' });
  const nameId = useGeneratedHtmlId({ prefix: 'createServiceAccountName' });
  const rolesId = useGeneratedHtmlId({ prefix: 'createServiceAccountRoles' });
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [roles, setRoles] = useState<string[]>([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const saving = useRef(false);
  const isMounted = useMountedState();
  const availableRoles = useAsyncRetry(
    () => rolesAPIClient.getRoles({ includeReservedRoles: true }),
    [rolesAPIClient]
  );
  const unavailableRoleNames = roles.filter(
    (roleName) => !availableRoles.value?.some((role) => role.name === roleName)
  );
  const isRolesInvalid = roles.length === 0 || unavailableRoleNames.length > 0;
  const rolesError =
    unavailableRoleNames.length > 0
      ? i18n.translate(
          'xpack.security.management.serviceAccounts.create.unavailableRolesErrorMessage',
          {
            defaultMessage: 'Remove roles that are no longer available: {roles}.',
            values: { roles: i18n.formatList('conjunction', unavailableRoleNames) },
          }
        )
      : i18n.translate('xpack.security.management.serviceAccounts.create.rolesErrorMessage', {
          defaultMessage: 'Select at least one role.',
        });
  const normalizedName = name.trim();
  const isNameInvalid =
    !SERVICE_ACCOUNT_NAME_REGEX.test(normalizedName) ||
    normalizedName.length > SERVICE_ACCOUNT_NAME_MAX_LENGTH;

  const submit = async () => {
    if (saving.current) return;
    setHasSubmitted(true);
    if (isNameInvalid || isRolesInvalid || availableRoles.loading || availableRoles.error) {
      return;
    }
    saving.current = true;
    setIsSaving(true);
    setSaveError(undefined);
    let account: ServiceAccount;
    try {
      account = await serviceAccountsAPIClient.create({
        name: normalizedName,
        roles,
        ...(!isServerless && description.trim() ? { description: description.trim() } : {}),
      });
    } catch (error) {
      if (!isMounted()) return;
      const message =
        isHttpFetchError(error) &&
        error.body &&
        typeof error.body === 'object' &&
        'message' in error.body &&
        typeof error.body.message === 'string'
          ? error.body.message
          : i18n.translate('xpack.security.management.serviceAccounts.create.failedErrorMessage', {
              defaultMessage: 'Unable to create the service account. Try again.',
            });
      setSaveError(message);
      return;
    } finally {
      saving.current = false;
      if (isMounted()) setIsSaving(false);
    }
    if (isMounted()) onCreated(account);
  };

  return (
    <EuiFlyout
      size="m"
      aria-labelledby={titleId}
      onClose={() => {
        if (!saving.current) onClose();
      }}
      closeButtonProps={{ isDisabled: isSaving }}
      data-test-subj="createServiceAccountFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>
            <FormattedMessage
              id="xpack.security.management.serviceAccounts.create.flyoutTitle"
              defaultMessage="Create account"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm
          id={formId}
          component="form"
          fullWidth
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
          isInvalid={Boolean(saveError)}
          error={saveError}
        >
          <EuiFormRow
            id={nameId}
            fullWidth
            label={i18n.translate('xpack.security.management.serviceAccounts.create.nameLabel', {
              defaultMessage: 'Name',
            })}
            isInvalid={hasSubmitted && isNameInvalid}
            error={i18n.translate(
              'xpack.security.management.serviceAccounts.create.nameErrorMessage',
              {
                defaultMessage:
                  'Enter a name of up to {maxLength} characters, starting with a letter or digit and containing only letters, digits, hyphens, or underscores.',
                values: { maxLength: SERVICE_ACCOUNT_NAME_MAX_LENGTH },
              }
            )}
          >
            <EuiFieldText
              fullWidth
              value={name}
              maxLength={SERVICE_ACCOUNT_NAME_MAX_LENGTH}
              onChange={(event) => setName(event.target.value)}
              isInvalid={hasSubmitted && isNameInvalid}
              disabled={isSaving}
              data-test-subj="serviceAccountNameInput"
            />
          </EuiFormRow>
          {!isServerless && (
            <EuiFormRow
              fullWidth
              label={i18n.translate(
                'xpack.security.management.serviceAccounts.create.descriptionLabel',
                {
                  defaultMessage: 'Description (optional)',
                }
              )}
            >
              <EuiTextArea
                fullWidth
                data-test-subj="createServiceAccountDescription"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={SERVICE_ACCOUNT_DESCRIPTION_MAX_LENGTH}
                disabled={isSaving}
              />
            </EuiFormRow>
          )}
          <EuiFormRow
            id={rolesId}
            fullWidth
            label={i18n.translate('xpack.security.management.serviceAccounts.create.rolesLabel', {
              defaultMessage: 'Set privileges',
            })}
            labelAppend={
              createRoleUrl ? (
                <EuiLink href={createRoleUrl} target="_blank" external>
                  <FormattedMessage
                    id="xpack.security.management.serviceAccounts.create.createRoleLinkText"
                    defaultMessage="Create new role"
                  />
                </EuiLink>
              ) : undefined
            }
            isInvalid={hasSubmitted && isRolesInvalid}
            error={rolesError}
            helpText={
              <>
                <FormattedMessage
                  id="xpack.security.management.serviceAccounts.create.rolesHelpDescription"
                  defaultMessage="An account can only use privileges allowed by both its selected roles and your access at creation time. Selecting a role does not grant privileges you do not have."
                />
                {isServerless && (
                  <p>
                    <FormattedMessage
                      id="xpack.security.management.serviceAccounts.create.crossProjectRolesHelpDescription"
                      defaultMessage="For cross-project search, selected role names also apply in linked projects where those roles exist. Custom roles are not copied between projects."
                    />
                  </p>
                )}
              </>
            }
          >
            <RoleComboBox
              fullWidth
              isInvalid={hasSubmitted && isRolesInvalid}
              availableRoles={availableRoles.value ?? []}
              selectedRoleNames={roles}
              onChange={setRoles}
              isLoading={availableRoles.loading}
              isDisabled={isSaving || availableRoles.loading || Boolean(availableRoles.error)}
            />
          </EuiFormRow>
          {availableRoles.error && (
            <>
              <EuiSpacer size="m" />
              <EuiCallOut
                announceOnMount
                color="danger"
                title={i18n.translate(
                  'xpack.security.management.serviceAccounts.create.loadRolesErrorMessage',
                  { defaultMessage: 'Unable to load roles.' }
                )}
              />
            </>
          )}
          <EuiButtonEmpty
            onClick={availableRoles.retry}
            isDisabled={isSaving || availableRoles.loading}
            iconType="refresh"
            size="s"
          >
            <FormattedMessage
              id="xpack.security.management.serviceAccounts.create.refreshRolesButtonLabel"
              defaultMessage="Refresh roles"
            />
          </EuiButtonEmpty>
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} isDisabled={isSaving}>
              <FormattedMessage
                id="xpack.security.management.serviceAccounts.create.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              type="submit"
              form={formId}
              isLoading={isSaving}
              isDisabled={availableRoles.loading || Boolean(availableRoles.error)}
              data-test-subj="createServiceAccountSubmit"
            >
              <FormattedMessage
                id="xpack.security.management.serviceAccounts.create.submitButtonLabel"
                defaultMessage="Create account"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
