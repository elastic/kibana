/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiIconTip,
  EuiLink,
  EuiSpacer,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useEffect, useRef, useState } from 'react';
import useAsyncRetry from 'react-use/lib/useAsyncRetry';
import useMountedState from 'react-use/lib/useMountedState';

import { isHttpFetchError } from '@kbn/core-http-browser';
import type { ServiceAccount } from '@kbn/core-security-browser';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { PublicMethodsOf } from '@kbn/utility-types';

import { ServiceAccountRoleSelector } from './service_account_role_selector';
import {
  ES_SERVICE_ACCOUNT_MAX_ROLES,
  SERVICE_ACCOUNT_DESCRIPTION_MAX_LENGTH,
  SERVICE_ACCOUNT_NAME_MAX_LENGTH,
  SERVICE_ACCOUNT_NAME_REGEX,
  UIAM_SERVICE_ACCOUNT_MAX_ROLES,
} from '../../../common/service_accounts/constants';
import type { ServiceAccountsAPIClient } from '../../service_accounts';
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
  const [nameTouched, setNameTouched] = useState(false);
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
  const { retry: refreshRoles } = availableRoles;
  useEffect(() => {
    const refresh = () => refreshRoles();
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [refreshRoles]);
  const unavailableRoleNames = roles.filter(
    (roleName) => !availableRoles.value?.some((role) => role.name === roleName)
  );
  const maxRoles = isServerless ? UIAM_SERVICE_ACCOUNT_MAX_ROLES : ES_SERVICE_ACCOUNT_MAX_ROLES;
  const hasTooManyRoles = roles.length > maxRoles;
  const isRolesInvalid = roles.length === 0 || hasTooManyRoles || unavailableRoleNames.length > 0;
  const rolesError =
    unavailableRoleNames.length > 0
      ? i18n.translate(
          'xpack.security.management.serviceAccounts.create.unavailableRolesErrorMessage',
          {
            defaultMessage: 'Remove roles that are no longer available: {roles}.',
            values: { roles: i18n.formatList('conjunction', unavailableRoleNames) },
          }
        )
      : hasTooManyRoles
      ? i18n.translate(
          'xpack.security.management.serviceAccounts.create.tooManyRolesErrorMessage',
          {
            defaultMessage: 'Select no more than {maxRoles} roles.',
            values: { maxRoles },
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
        ...(description.trim() ? { description: description.trim() } : {}),
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
      size={540}
      maxWidth="100vw"
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
          aria-labelledby={titleId}
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
            isInvalid={(hasSubmitted || nameTouched) && isNameInvalid}
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
              onBlur={() => setNameTouched(true)}
              fullWidth
              value={name}
              maxLength={SERVICE_ACCOUNT_NAME_MAX_LENGTH}
              onChange={(event) => setName(event.target.value)}
              isInvalid={(hasSubmitted || nameTouched) && isNameInvalid}
              disabled={isSaving}
              data-test-subj="serviceAccountNameInput"
            />
          </EuiFormRow>
          <EuiFormRow
            fullWidth
            label={i18n.translate(
              'xpack.security.management.serviceAccounts.create.descriptionLabel',
              { defaultMessage: 'Description (optional)' }
            )}
          >
            <EuiFieldText
              fullWidth
              data-test-subj="createServiceAccountDescription"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={SERVICE_ACCOUNT_DESCRIPTION_MAX_LENGTH}
              disabled={isSaving}
            />
          </EuiFormRow>
          <EuiFormRow
            id={rolesId}
            fullWidth
            label={
              <>
                <span id={`${rolesId}-label-text`}>
                  {i18n.translate('xpack.security.management.serviceAccounts.create.rolesLabel', {
                    defaultMessage: 'Set privileges',
                  })}
                </span>{' '}
                <EuiIconTip
                  type="info"
                  aria-label={i18n.translate(
                    'xpack.security.management.serviceAccounts.create.rolePrivilegesHelpLabel',
                    { defaultMessage: 'About role privileges' }
                  )}
                  content={
                    <>
                      {isServerless ? (
                        <FormattedMessage
                          id="xpack.security.management.serviceAccounts.create.serverlessRolesHelpDescription"
                          defaultMessage="An account can only use privileges allowed by both its selected roles and your access at creation time. Selecting a role does not grant privileges you do not have."
                        />
                      ) : (
                        <FormattedMessage
                          id="xpack.security.management.serviceAccounts.create.rolesHelpDescription"
                          defaultMessage="The account receives the privileges granted by its selected roles."
                        />
                      )}
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
                />
              </>
            }
            helpText={
              createRoleUrl ? (
                <EuiLink
                  href={createRoleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-test-subj="createServiceAccountRoleLink"
                >
                  <FormattedMessage
                    id="xpack.security.management.serviceAccounts.create.createRoleLinkText"
                    defaultMessage="Create new role"
                  />
                </EuiLink>
              ) : undefined
            }
            isInvalid={
              (hasSubmitted || hasTooManyRoles || unavailableRoleNames.length > 0) && isRolesInvalid
            }
            error={rolesError}
          >
            <ServiceAccountRoleSelector
              aria-labelledby={`${rolesId}-label-text`}
              isInvalid={
                (hasSubmitted || hasTooManyRoles || unavailableRoleNames.length > 0) &&
                isRolesInvalid
              }
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
              <KbnDangerCallout
                announceOnMount
                title={i18n.translate(
                  'xpack.security.management.serviceAccounts.create.loadRolesErrorMessage',
                  { defaultMessage: 'Unable to load roles.' }
                )}
              />
            </>
          )}
          {(availableRoles.error || unavailableRoleNames.length > 0) && (
            <EuiButtonEmpty
              onClick={availableRoles.retry}
              isDisabled={isSaving || availableRoles.loading}
              iconType="refresh"
              size="s"
              data-test-subj="refreshServiceAccountRolesButton"
            >
              <FormattedMessage
                id="xpack.security.management.serviceAccounts.create.refreshRolesButtonLabel"
                defaultMessage="Refresh roles"
              />
            </EuiButtonEmpty>
          )}
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              color="text"
              onClick={onClose}
              isDisabled={isSaving}
              data-test-subj="createServiceAccountCancel"
            >
              <FormattedMessage
                id="xpack.security.management.serviceAccounts.create.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              type="submit"
              form={formId}
              isLoading={isSaving}
              isDisabled={
                isNameInvalid ||
                isRolesInvalid ||
                availableRoles.loading ||
                Boolean(availableRoles.error)
              }
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
