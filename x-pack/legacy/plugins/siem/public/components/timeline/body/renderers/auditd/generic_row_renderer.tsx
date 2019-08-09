/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IconType } from '@elastic/eui';
import { get } from 'lodash/fp';
import React from 'react';

import * as i18n from './translations';
import { RowRenderer, RowRendererContainer } from '../row_renderer';
import { Row } from '../helpers';
import { AuditdGenericDetails } from './generic_details';
import { AuditdGenericFileDetails } from './generic_file_details';

export const createGenericAuditRowRenderer = ({
  actionName,
  text,
}: {
  actionName: string;
  text: string;
}): RowRenderer => ({
  isInstance: ecs => {
    const module: string | null | undefined = get('event.module[0]', ecs);
    const action: string | null | undefined = get('event.action[0]', ecs);
    return (
      module != null &&
      module.toLowerCase() === 'auditd' &&
      action != null &&
      action.toLowerCase() === actionName
    );
  },
  renderRow: ({ browserFields, data, width, children }) => (
    <Row>
      {children}
      <RowRendererContainer width={width}>
        <AuditdGenericDetails
          browserFields={browserFields}
          data={data}
          contextId={actionName}
          text={text}
        />
      </RowRendererContainer>
    </Row>
  ),
});

export const createGenericFileRowRenderer = ({
  actionName,
  text,
  fileIcon = 'document',
}: {
  actionName: string;
  text: string;
  fileIcon?: IconType;
}): RowRenderer => ({
  isInstance: ecs => {
    const module: string | null | undefined = get('event.module[0]', ecs);
    const action: string | null | undefined = get('event.action[0]', ecs);
    return (
      module != null &&
      module.toLowerCase() === 'auditd' &&
      action != null &&
      action.toLowerCase() === actionName
    );
  },
  renderRow: ({ browserFields, data, width, children }) => (
    <Row>
      {children}
      <RowRendererContainer width={width}>
        <AuditdGenericFileDetails
          browserFields={browserFields}
          data={data}
          contextId={actionName}
          text={text}
          fileIcon={fileIcon}
        />
      </RowRendererContainer>
    </Row>
  ),
});

// For a full list of where most these came from see this page:
// https://github.com/elastic/go-libaudit/blob/master/aucoalesce/normalizations.yaml

const auditdWasAuthorizedRowRenderer = createGenericAuditRowRenderer({
  actionName: 'was-authorized',
  text: i18n.WAS_AUTHORIZED_TO_USE,
});

const auditdStartedSessionRowRenderer = createGenericAuditRowRenderer({
  actionName: 'started-session',
  text: i18n.STARTED,
});

// TODO: Remove this once https://github.com/elastic/go-libaudit/issues/52
// is solved and no users are using this older logged-in
const auditdLoggedInDeprecatedRowRenderer = createGenericAuditRowRenderer({
  actionName: 'logged-in',
  text: i18n.ATTEMPTED_LOGIN,
});

const auditdLoggedInRowRenderer = createGenericAuditRowRenderer({
  actionName: 'login',
  text: i18n.ATTEMPTED_LOGIN,
});

const auditdExecutedRowRenderer = createGenericAuditRowRenderer({
  actionName: 'executed',
  text: i18n.EXECUTED,
});

const auditdEndedFromRowRenderer = createGenericAuditRowRenderer({
  actionName: 'ended-session',
  text: i18n.ENDED_FROM,
});

const auditdAcquiredCredentialsRowRenderer = createGenericAuditRowRenderer({
  actionName: 'acquired-credentials',
  text: i18n.ACQUIRED_CREDENTIALS_TO,
});

const auditdDisposedCredentialsRowRenderer = createGenericAuditRowRenderer({
  actionName: 'disposed-credentials',
  text: i18n.DISPOSED_CREDENTIALS_TO,
});

const auditdConnectedToRowRenderer = createGenericAuditRowRenderer({
  actionName: 'connected-to',
  text: i18n.CONNECTED_USING,
});

const auditdOpenedFileRowRenderer = createGenericFileRowRenderer({
  actionName: 'opened-file',
  text: i18n.OPENED_FILE,
});

// This doesn't produce a file.path so I use the generic row renderer
const auditdChangedFileAttributeOfRowRenderer = createGenericAuditRowRenderer({
  actionName: 'changed-file-attributes-of',
  text: i18n.CHANGED_FILE_ATTRIBUTES_OF,
});

const auditdChangedFilePermissionsOfRowRenderer = createGenericFileRowRenderer({
  actionName: 'changed-file-permissions-of',
  text: i18n.CHANGED_FILE_PERMISSIONS_OF,
});

const auditdChangedFileOwnershipOfRowRenderer = createGenericFileRowRenderer({
  actionName: 'changed-file-ownership-of',
  text: i18n.CHANGED_FILE_OWNERSHIP_OF,
});

// TODO: Not UI-tested
const auditdChangedKernelModuleRowRenderer = createGenericAuditRowRenderer({
  actionName: 'loaded-kernel-module',
  text: i18n.LOADED_KERNEL_MODULE,
});

// TODO: Not UI-tested
const auditdUnloadedKernelModuleRowRenderer = createGenericAuditRowRenderer({
  actionName: 'unloaded-kernel-module',
  text: i18n.UNLOADED_KERNEL_MODULE_OF,
});

const auditdCreatedDirectoryRowRenderer = createGenericFileRowRenderer({
  actionName: 'created-directory',
  text: i18n.CREATED_DIRECTORY,
  fileIcon: 'folderOpen',
});

const auditdMountedRowRenderer = createGenericFileRowRenderer({
  actionName: 'mounted',
  text: i18n.MOUNTED,
});

const auditdRenamedRowRenderer = createGenericFileRowRenderer({
  actionName: 'renamed',
  text: i18n.RENAMED,
});

const auditdCheckedMetaDataRowRenderer = createGenericFileRowRenderer({
  actionName: 'checked-metadata-of',
  text: i18n.CHECKED_METADATA_OF,
});

const auditdCheckedFileSystemMetaDataRowRenderer = createGenericFileRowRenderer({
  actionName: 'checked-filesystem-metadata-of',
  text: i18n.CHECKED_FILE_SYSTEM_METADATA_OF,
});

const auditdSymLinkedDataRowRenderer = createGenericFileRowRenderer({
  actionName: 'symlinked',
  text: i18n.SYMLINKED,
});

// TODO: UI-Testing
const auditdUnmountedRowRenderer = createGenericFileRowRenderer({
  actionName: 'unmounted',
  text: i18n.UNMOUNTED,
});

const auditdDeletedRowRenderer = createGenericFileRowRenderer({
  actionName: 'deleted',
  text: i18n.DELETED,
});

const auditdChangedTimeStampOfRowRenderer = createGenericFileRowRenderer({
  actionName: 'changed-timestamp-of',
  text: i18n.CHANGED_TIME_STAMP_OF,
});

// TODO: UI-Testing
const auditdListenForConnectionsRowRenderer = createGenericAuditRowRenderer({
  actionName: 'listen-for-connections',
  text: i18n.LISTEN_FOR_CONNECTIONS,
});

const auditdBoundSocketRowRenderer = createGenericAuditRowRenderer({
  actionName: 'bound-socket',
  text: i18n.BOUND_SOCKET_FROM,
});

const auditdReceivedFromRowRenderer = createGenericAuditRowRenderer({
  actionName: 'received-from',
  text: i18n.RECEIVED_FROM,
});

const auditdSentToRowRenderer = createGenericAuditRowRenderer({
  actionName: 'sent-to',
  text: i18n.SENT_TO,
});

const auditdKilledPidRowRenderer = createGenericAuditRowRenderer({
  actionName: 'killed-pid',
  text: i18n.KILLED_PROCESS_ID_OF,
});

const auditdChangedIdentityRowRenderer = createGenericAuditRowRenderer({
  actionName: 'changed-identity-of',
  text: i18n.CHANGED_IDENTITY_USING,
});

// TODO: UI-Testing
const auditdChangedSystemTimeRowRenderer = createGenericAuditRowRenderer({
  actionName: 'changed-system-time',
  text: i18n.CHANGED_SYSTEM_TIME_WITH,
});

// TODO: UI-Testing
const auditdMakeDeviceRowRenderer = createGenericAuditRowRenderer({
  actionName: 'make-device',
  text: i18n.MADE_DEVICE_WITH,
});

// TODO: UI-Testing
const auditdChangedSystemNameRowRenderer = createGenericAuditRowRenderer({
  actionName: 'changed-system-name',
  text: i18n.CHANGED_SYSTEM_NAME,
});

const auditdAllocatedMemoryRowRenderer = createGenericAuditRowRenderer({
  actionName: 'allocated-memory',
  text: i18n.ALLOCATED_MEMORY_FOR,
});

// TODO: UI-Testing
const auditdSchedulingPolicyRowRenderer = createGenericAuditRowRenderer({
  actionName: 'adjusted-scheduling-policy-of',
  text: i18n.SCHEDULED_POLICY_OF,
});

const auditdAddedUserAccountRowRenderer = createGenericAuditRowRenderer({
  actionName: 'added-user-account',
  text: i18n.ADDED_USER_ACCOUNT,
});

// TODO: UI-Testing
const auditdCausedMacPolicyErrorRowRenderer = createGenericAuditRowRenderer({
  actionName: 'caused-mac-policy-error',
  text: i18n.CAUSED_MAC_POLICY_ERROR,
});

// TODO: UI-Testing
const auditdloadedFirewallRuleErrorRowRenderer = createGenericAuditRowRenderer({
  actionName: 'loaded-firewall-rule-to',
  text: i18n.LOADED_FIREWALL_RULE,
});

const auditdChangedPromiscuousModeRowRenderer = createGenericAuditRowRenderer({
  actionName: 'changed-promiscuous-mode-on-device',
  text: i18n.CHANGED_PROMISCUOUS_MODE,
});

// TODO: UI-Testing
const auditdLockedAccountModeRowRenderer = createGenericAuditRowRenderer({
  actionName: 'locked-account',
  text: i18n.LOCKED_ACCOUNT,
});

// TODO: UI-Testing
const auditdUnLockedAccountModeRowRenderer = createGenericAuditRowRenderer({
  actionName: 'unlocked-account',
  text: i18n.UNLOCKED_ACCOUNT,
});

// TODO: This could be more custom with account info coming from auditd.data.acct
const auditdAddedGroupAccountModeRowRenderer = createGenericAuditRowRenderer({
  actionName: 'added-group-account-to',
  text: i18n.ADDED_GROUP_ACCOUNT_USING,
});

// TODO: UI-Testing
const auditdCrashedProgramRowRenderer = createGenericAuditRowRenderer({
  actionName: 'crashed-program',
  text: i18n.CRASHED_PROGRAM,
});

// TODO: UI-Testing
const auditdAttemptedExecutionOfForbiddenProgramRowRenderer = createGenericAuditRowRenderer({
  actionName: 'attempted-execution-of-forbidden-program',
  text: i18n.EXECUTION_OF_FORBIDDEN_PROGRAM,
});

// TODO: UI-Testing
// NOTE: This is misspelled due to this ticket: https://github.com/elastic/go-libaudit/issues/51
// This has to remain for forwards and backwards compatibility
// Once we customers do NOT have this misspelling anymore then we can change this out.
const auditdSuspiciousLinkDeprecatedRowRenderer = createGenericAuditRowRenderer({
  actionName: 'used-suspcious-link',
  text: i18n.USED_SUSPICIOUS_PROGRAM,
});

// TODO: UI-Testing
const auditdSuspiciousLinkRowRenderer = createGenericAuditRowRenderer({
  actionName: 'used-suspicious-link',
  text: i18n.USED_SUSPICIOUS_PROGRAM,
});

// TODO: UI-Testing
// NOTE: Remove this once this ticket is solved: https://github.com/elastic/go-libaudit/issues/52
// This has to remain for forwards and backwards compatibility until customers no longer have this string
const auditdFailedLoginDeprecatedTooManyTimesRowRenderer = createGenericAuditRowRenderer({
  actionName: 'failed-log-in-too-many-times-to',
  text: i18n.FAILED_LOGIN_TOO_MANY_TIMES,
});

const auditdFailedLoginTooManyTimesRowRenderer = createGenericAuditRowRenderer({
  actionName: 'failed-login-too-many-times-to',
  text: i18n.FAILED_LOGIN_TOO_MANY_TIMES,
});

// TODO: UI-Testing
// NOTE: Remove this once this ticket is solved: https://github.com/elastic/go-libaudit/issues/52
// This has to remain for forwards and backwards compatibility until customers no longer have this string
const auditdLoginFromUnusualDeprecatedPlaceToRowRenderer = createGenericAuditRowRenderer({
  actionName: 'attempted-log-in-from-unusual-place-to',
  text: i18n.ATTEMPTED_LOGIN_FROM_UNUSUAL_PLACE,
});

// TODO: UI-Testing
const auditdLoginFromUnusualPlaceToRowRenderer = createGenericAuditRowRenderer({
  actionName: 'attempted-login-from-unusual-place-to',
  text: i18n.ATTEMPTED_LOGIN_FROM_UNUSUAL_PLACE,
});

// TODO: UI-Testing
const auditdOpenTooManySessionsToRowRenderer = createGenericAuditRowRenderer({
  actionName: 'opened-too-many-sessions-to',
  text: i18n.OPENED_TOO_MANY_SESSIONS,
});

// TODO: UI-Testing
// NOTE: Remove this once this ticket is solved: https://github.com/elastic/go-libaudit/issues/52
// This has to remain for forwards and backwards compatibility until customers no longer have this string
const auditdLoginFromDeprecatedUnusualHourRowRenderer = createGenericAuditRowRenderer({
  actionName: 'attempted-log-in-during-unusual-hour-to',
  text: i18n.ATTEMPTED_LOGIN_FROM_UNUSUAL_HOUR,
});

// TODO: UI-Testing
const auditdLoginFromUnusualHourRowRenderer = createGenericAuditRowRenderer({
  actionName: 'attempted-login-during-unusual-hour-to',
  text: i18n.ATTEMPTED_LOGIN_FROM_UNUSUAL_HOUR,
});

// TODO: UI-Testing
const auditdTestedFileSystemIntegoryOfRowRenderer = createGenericAuditRowRenderer({
  actionName: 'tested-file-system-integrity-of',
  text: i18n.TESTED_FILE_SYSTEM_INTEGRITY,
});

// TODO: UI-Testing
const auditdViolatedSelinuxPolicyRowRenderer = createGenericAuditRowRenderer({
  actionName: 'violated-selinux-policy',
  text: i18n.VIOLATED_SELINUX_POLICY,
});

// TODO: This could use better data such as auditd.data.operation
const auditdViolatedAppArmorPolicyRowRenderer = createGenericAuditRowRenderer({
  actionName: 'violated-apparmor-policy',
  text: i18n.VIOLATED_APP_ARMOR_POLICY_FROM,
});

// TODO: UI-Testing
const auditdChangedGropuRowRenderer = createGenericAuditRowRenderer({
  actionName: 'changed-group',
  text: i18n.CHANGED_GROUP,
});

// TODO: UI-Testing
const auditdChangedUserIdRowRenderer = createGenericAuditRowRenderer({
  actionName: 'changed-user-id',
  text: i18n.CHANGED_USER_ID,
});

// TODO: UI-Testing
// NOTE: Remove once this ticket is solved: https://github.com/elastic/go-libaudit/issues/53
const auditdChangedAuditConfigurationDeprecatedRowRenderer = createGenericAuditRowRenderer({
  actionName: 'changed-auditd-configuration',
  text: i18n.CHANGED_AUDIT_CONFIGURATION,
});

// TODO: This should be custom -- Tested and does not work as is like this.
const auditdChangedAuditConfigurationRowRenderer = createGenericAuditRowRenderer({
  actionName: 'changed-audit-configuration',
  text: i18n.CHANGED_AUDIT_CONFIGURATION,
});

const auditdRefreshedCredentialsRowRenderer = createGenericAuditRowRenderer({
  actionName: 'refreshed-credentials',
  text: i18n.REFRESHED_CREDENTIALS_FOR,
});

// TODO: UI-Testing
const auditdNegotiatedCryptoKeyRowRenderer = createGenericAuditRowRenderer({
  actionName: 'negotiated-crypto-key',
  text: i18n.NEGOTIATED_CRYPTO_KEY,
});

// TODO: UI-Testing
// NOTE: Remove this once this ticket is solved: https://github.com/elastic/go-libaudit/issues/52
// This has to remain for forwards and backwards compatibility until customers no longer have this string
const auditdCryptoOfficerLoggednDeprecatedRowRenderer = createGenericAuditRowRenderer({
  actionName: 'crypto-officer-logged-in',
  text: i18n.CRYPTO_OFFICER_LOGGED_IN,
});

const auditdCryptoOfficerLoggednRowRenderer = createGenericAuditRowRenderer({
  actionName: 'crypto-officer-login',
  text: i18n.CRYPTO_OFFICER_LOGGED_IN,
});

// TODO: UI-Testing
// NOTE: Remove this once this ticket is solved: https://github.com/elastic/go-libaudit/issues/52
// This has to remain for forwards and backwards compatibility until customers no longer have this string
const auditdCryptoOfficerLoggedoutDeprecatedRowRenderer = createGenericAuditRowRenderer({
  actionName: 'crypto-officer-logged-out',
  text: i18n.CRYPTO_OFFICER_LOGGED_OUT,
});

// TODO: UI-Testing
const auditdCryptoOfficerLoggedoutRowRenderer = createGenericAuditRowRenderer({
  actionName: 'crypto-officer-logout',
  text: i18n.CRYPTO_OFFICER_LOGGED_OUT,
});

// TODO: UI-Testing
const auditdStartedCryptoSessionRowRenderer = createGenericAuditRowRenderer({
  actionName: 'started-crypto-session',
  text: i18n.STARTED_CRYPTO_SESSION,
});

// TODO: UI-Testing
const auditdAccessResultRowRenderer = createGenericAuditRowRenderer({
  actionName: 'access-result',
  text: i18n.ACCESS_RESULT,
});

// TODO: UI-Testing
// NOTE: Remove this once this ticket is solved: https://github.com/elastic/go-libaudit/issues/53
// This has to remain for forwards and backwards compatibility until customers no longer have this string
const auditdAbortedAuditDeprecatedStartupRowRenderer = createGenericAuditRowRenderer({
  actionName: 'aborted-auditd-startup',
  text: i18n.ABORTED_AUDIT_STARTUP,
});

// TODO: UI-Testing
const auditdAbortedAuditStartupRowRenderer = createGenericAuditRowRenderer({
  actionName: 'aborted-audit-startup',
  text: i18n.ABORTED_AUDIT_STARTUP,
});

// TODO: UI-Testing
const auditdRemoteAuditConnectedRowRenderer = createGenericAuditRowRenderer({
  actionName: 'remote-audit-connected',
  text: i18n.REMOTE_AUDIT_CONNECTED,
});

// TODO: UI-Testing
const auditdRemoteAuditDisconnectedRowRenderer = createGenericAuditRowRenderer({
  actionName: 'remote-audit-disconnected',
  text: i18n.REMOTE_AUDIT_DISCONNECTED,
});

// TODO: UI-Testing
const auditdShutdownAuditRowRenderer = createGenericAuditRowRenderer({
  actionName: 'shutdown-audit',
  text: i18n.SHUTDOWN_AUDIT,
});

// TODO: UI-Testing
const auditdAuditErrorRowRenderer = createGenericAuditRowRenderer({
  actionName: 'audit-error',
  text: i18n.AUDIT_ERROR,
});

// TODO: UI-Testing
// TODO: Remove once this ticket is solved: https://github.com/elastic/go-libaudit/issues/53
const auditdReconfiguredAuditDeprecatedRowRenderer = createGenericAuditRowRenderer({
  actionName: 'reconfigured-auditd',
  text: i18n.RECONFIGURED_AUDIT,
});

// TODO: UI-Testing
const auditdReconfiguredAuditRowRenderer = createGenericAuditRowRenderer({
  actionName: 'reconfigured-audit',
  text: i18n.RECONFIGURED_AUDIT,
});

// TODO: UI-Testing
const auditdResumedAuditLoggingRowRenderer = createGenericAuditRowRenderer({
  actionName: 'resumed-audit-logging',
  text: i18n.RESUMED_AUDIT_LOGGING,
});

// TODO: UI-Testing
const auditdRotatedAuditLogsRowRenderer = createGenericAuditRowRenderer({
  actionName: 'rotated-audit-logs',
  text: i18n.ROTATED_AUDIT_LOGS,
});

// TODO: UI-Testing
const auditdStartedAuditRowRenderer = createGenericAuditRowRenderer({
  actionName: 'started-audit',
  text: i18n.STARTED_AUDIT,
});

const auditdDeletedGroupAccountFromRowRenderer = createGenericAuditRowRenderer({
  actionName: 'deleted-group-account-from',
  text: i18n.DELETED_GROUP_ACCOUNT_USING,
});

const auditdDeletedUserAccountRowRenderer = createGenericAuditRowRenderer({
  actionName: 'deleted-user-account',
  text: i18n.DELETED_USER_ACCOUNT_USING,
});

// TODO: UI-Testing
const auditdChangedAuditFeatureRowRenderer = createGenericAuditRowRenderer({
  actionName: 'changed-audit-feature',
  text: i18n.CHANGED_AUDIT_FEATURE,
});

// TODO: UI-Testing
const auditdRelabeledRowRenderer = createGenericAuditRowRenderer({
  actionName: 'relabeled-filesystem',
  text: i18n.RELABELED_FILESYSTEM,
});

// TODO: UI-Testing
const auditdAuthenticatedToGroupRowRenderer = createGenericAuditRowRenderer({
  actionName: 'authenticated-to-group',
  text: i18n.AUTHENTICATED_TO_GROUP,
});

// TODO: UI-Testing
const auditdChangedGroupPasswordRowRenderer = createGenericAuditRowRenderer({
  actionName: 'changed-group-password',
  text: i18n.CHANGED_GROUP_PASSWORD,
});

// TODO: UI-Testing
const auditdModifiedGroupAccountRowRenderer = createGenericAuditRowRenderer({
  actionName: 'modified-group-account',
  text: i18n.MODIFIED_GROUP_ACCOUNT,
});

// TODO: UI-Testing
const auditdInitializedAuditSubsystemRowRenderer = createGenericAuditRowRenderer({
  actionName: 'initialized-audit-subsystem',
  text: i18n.INITIALIZED_AUDIT_SUBSYSTEM,
});

// TODO: UI-Testing
const auditdModifiedLevelOfRowRenderer = createGenericAuditRowRenderer({
  actionName: 'modified-level-of',
  text: i18n.MODIFIED_LEVEL_OF,
});

// TODO: UI-Testing
const auditdOverrodeLabelOfRowRenderer = createGenericAuditRowRenderer({
  actionName: 'overrode-label-of',
  text: i18n.OVERRODE_LABEL_OF,
});

// TODO: UI-Testing
const auditdChangedLoginIdToRowRenderer = createGenericAuditRowRenderer({
  actionName: 'changed-login-id-to',
  text: i18n.CHANGED_LOGIN_ID_TO,
});

// TODO: UI-Testing
const auditdMacPermissionRowRenderer = createGenericAuditRowRenderer({
  actionName: 'mac-permission',
  text: i18n.MAC_PERMISSION,
});

// TODO: UI-Testing
const auditdChangedSelinuxBooleanRowRenderer = createGenericAuditRowRenderer({
  actionName: 'changed-selinux-boolean',
  text: i18n.CHANGED_SELINUX_BOOLEAN,
});

// TODO: UI-Testing
const auditdLoadedSelinuxPolicyRowRenderer = createGenericAuditRowRenderer({
  actionName: 'loaded-selinux-policy',
  text: i18n.LOADED_SELINUX_POLICY,
});

// TODO: UI-Testing
const auditdChangedSelinuxEnforcementRowRenderer = createGenericAuditRowRenderer({
  actionName: 'changed-selinux-enforcement',
  text: i18n.CHANGED_SELINUX_ENFORCEMENT,
});

// TODO: UI-Testing
const auditdAssignedUserRoleToRowRenderer = createGenericAuditRowRenderer({
  actionName: 'assigned-user-role-to',
  text: i18n.ASSIGNED_USER_ROLE_TO,
});

// TODO: UI-Testing
const auditdModifiedRoleRowRenderer = createGenericAuditRowRenderer({
  actionName: 'modified-role',
  text: i18n.MODIFIED_ROLE,
});

// TODO: UI-Testing
// TODO: This is misspelled and should be user. Remove this once we know
// no customers are using this older name from beats
// https://github.com/elastic/go-libaudit/issues/54
const auditdRemovedUserRoleDeprecatedFromRowRenderer = createGenericAuditRowRenderer({
  actionName: 'removed-use-role-from',
  text: i18n.REMOVED_USER_ROLE_FROM,
});

// TODO: UI-Testing
const auditdRemovedUserRoleFromRowRenderer = createGenericAuditRowRenderer({
  actionName: 'removed-user-role-from',
  text: i18n.REMOVED_USER_ROLE_FROM,
});

// TODO: UI-Testing
const auditdViolatedSeccompPolicyRowRenderer = createGenericAuditRowRenderer({
  actionName: 'violated-seccomp-policy',
  text: i18n.VIOLATED_SECCOMP_POLICY_WITH,
});

// TODO: How do you get the service name? auditd.summary.object.primary kind of gives it sometimes
// TODO: Investigate a custom renderer for this at some point (or have it be more ECS compliant)
const auditdStartedServiceRowRenderer = createGenericAuditRowRenderer({
  actionName: 'started-service',
  text: i18n.STARTED_SERVICE,
});

// TODO: How do you get the service name? auditd.summary.object.primary kind of gives it sometimes
// TODO: Investigate a custom renderer for this at some point (or have it be more ECS compliant)
const auditdStoppedServiceRowRenderer = createGenericAuditRowRenderer({
  actionName: 'stopped-service',
  text: i18n.STOPPED_SERVICE,
});

// TODO: UI-Testing
const auditdBootedSystemRowRenderer = createGenericAuditRowRenderer({
  actionName: 'booted-system',
  text: i18n.BOOTED_SYSTEM,
});

const auditdChangedToRunlevelRowRenderer = createGenericAuditRowRenderer({
  actionName: 'changed-to-runlevel',
  text: i18n.CHANGED_TO_RUN_LEVEL_WITH,
});

// TODO: UI-Testing
const auditdShutdownSystemRowRenderer = createGenericAuditRowRenderer({
  actionName: 'shutdown-system',
  text: i18n.SHUTDOWN_SYSTEM,
});

// TODO: UI-Testing
const auditdSentTestRowRenderer = createGenericAuditRowRenderer({
  actionName: 'sent-test',
  text: i18n.SENT_TEST,
});

// TODO: UI-Testing
const auditdUnknownRowRenderer = createGenericAuditRowRenderer({
  actionName: 'unknown',
  text: i18n.UNKNOWN,
});

// TODO: UI-Testing
const auditdSentMessageRowRenderer = createGenericAuditRowRenderer({
  actionName: 'sent-message',
  text: i18n.SENT_MESSAGE,
});

// TODO: UI-Testing
const auditdAccessPermissionRowRenderer = createGenericAuditRowRenderer({
  actionName: 'access-permission',
  text: i18n.ACCESS_PERMISSION,
});

const auditdAuthenticated = createGenericAuditRowRenderer({
  actionName: 'authenticated',
  text: i18n.AUTHENTICATED_USING,
});

const auditdChangedPasswordRowRenderer = createGenericAuditRowRenderer({
  actionName: 'changed-password',
  text: i18n.CHANGED_PASSWORD_WITH,
});

// TODO: This does not put its commands into process, so you have to write a custom
// renderer which shows it in from auditd.data.cmd or have the beat be more ECS compliant
const auditdRanCommandRowRenderer = createGenericAuditRowRenderer({
  actionName: 'ran-command',
  text: i18n.RAN_COMMAND,
});

const auditdErrorRowRenderer = createGenericAuditRowRenderer({
  actionName: 'error',
  text: i18n.ERROR_FROM,
});

// TODO: UI-Testing
// NOTE: Remove this once this ticket is solved: https://github.com/elastic/go-libaudit/issues/52
const auditdLoggedOutDeprecatedRowRenderer = createGenericAuditRowRenderer({
  actionName: 'logged-out',
  text: i18n.LOGGED_OUT,
});

// TODO: UI-Testing
const auditdLoggedOutRowRenderer = createGenericAuditRowRenderer({
  actionName: 'logout',
  text: i18n.LOGGED_OUT,
});

// TODO: UI-Testing
const auditdChangedMacConfigurationRowRenderer = createGenericAuditRowRenderer({
  actionName: 'changed-mac-configuration',
  text: i18n.CHANGED_MAC_CONFIGURATION,
});

// TODO: UI-Testing
const auditdLoadedMacPolicyRowRenderer = createGenericAuditRowRenderer({
  actionName: 'loaded-mac-policy',
  text: i18n.LOADED_MAC_POLICY,
});

// TODO: UI-Testing
const auditdModifiedUserAccountRowRenderer = createGenericAuditRowRenderer({
  actionName: 'modified-user-account',
  text: i18n.MODIFIED_USER_ACCOUNT,
});

const auditdChangedRoleToRowRenderer = createGenericAuditRowRenderer({
  actionName: 'changed-role-to',
  text: i18n.CHANGED_ROLE_USING,
});

// TODO: UI-Testing
const auditdAccessErrorRowRenderer = createGenericAuditRowRenderer({
  actionName: 'access-error',
  text: i18n.ACCESS_ERROR,
});

const auditdChangedConfigurationRowRenderer = createGenericAuditRowRenderer({
  actionName: 'changed-configuration',
  text: i18n.CHANGED_CONFIGURATION_WITH,
});

// TODO: UI-Testing
const auditdIssuedVmControlRowRenderer = createGenericAuditRowRenderer({
  actionName: 'issued-vm-control',
  text: i18n.ISSUED_VM_CONTROL,
});

// TODO: UI-Testing
const auditdCreatedVmImageRowRenderer = createGenericAuditRowRenderer({
  actionName: 'created-vm-image',
  text: i18n.CREATED_VM_IMAGE,
});

// TODO: UI-Testing
const auditdDeletedVmImageRowRenderer = createGenericAuditRowRenderer({
  actionName: 'deleted-vm-image',
  text: i18n.DELETED_VM_IMAGE,
});

// TODO: UI-Testing
const auditdCheckedIntegrityOfRowRenderer = createGenericAuditRowRenderer({
  actionName: 'checked-integrity-of',
  text: i18n.CHECKED_INTEGRITY_OF,
});

// TODO: UI-Testing
const auditdAssignedVmIdRowRenderer = createGenericAuditRowRenderer({
  actionName: 'assigned-vm-id',
  text: i18n.ASSIGNED_VM_ID,
});

// TODO: UI-Testing
const auditdMigratedVmFromRowRenderer = createGenericAuditRowRenderer({
  actionName: 'migrated-vm-from',
  text: i18n.MIGRATED_VM_FROM,
});

// TODO: UI-Testing
const auditdMigratedVmToRowRenderer = createGenericAuditRowRenderer({
  actionName: 'migrated-vm-to',
  text: i18n.MIGRATED_VM_TO,
});

// TODO: UI-Testing
const auditdAssignedVmResourceRowRenderer = createGenericAuditRowRenderer({
  actionName: 'assigned-vm-resource',
  text: i18n.ASSIGNED_VM_RESOURCE,
});

export const auditdRowRenderers: RowRenderer[] = [
  auditdExecutedRowRenderer,
  auditdLoggedInDeprecatedRowRenderer,
  auditdLoggedInRowRenderer,
  auditdWasAuthorizedRowRenderer,
  auditdAcquiredCredentialsRowRenderer,
  auditdEndedFromRowRenderer,
  auditdDisposedCredentialsRowRenderer,
  auditdStartedSessionRowRenderer,
  auditdConnectedToRowRenderer,
  auditdOpenedFileRowRenderer,
  auditdChangedFileAttributeOfRowRenderer,
  auditdChangedFilePermissionsOfRowRenderer,
  auditdChangedFileOwnershipOfRowRenderer,
  auditdChangedKernelModuleRowRenderer,
  auditdUnloadedKernelModuleRowRenderer,
  auditdCreatedDirectoryRowRenderer,
  auditdMountedRowRenderer,
  auditdRenamedRowRenderer,
  auditdCheckedMetaDataRowRenderer,
  auditdCheckedFileSystemMetaDataRowRenderer,
  auditdSymLinkedDataRowRenderer,
  auditdUnmountedRowRenderer,
  auditdDeletedRowRenderer,
  auditdChangedTimeStampOfRowRenderer,
  auditdListenForConnectionsRowRenderer,
  auditdBoundSocketRowRenderer,
  auditdReceivedFromRowRenderer,
  auditdSentToRowRenderer,
  auditdKilledPidRowRenderer,
  auditdChangedIdentityRowRenderer,
  auditdChangedSystemTimeRowRenderer,
  auditdMakeDeviceRowRenderer,
  auditdChangedSystemNameRowRenderer,
  auditdAllocatedMemoryRowRenderer,
  auditdSchedulingPolicyRowRenderer,
  auditdAddedUserAccountRowRenderer,
  auditdAddedGroupAccountModeRowRenderer,
  auditdAttemptedExecutionOfForbiddenProgramRowRenderer,
  auditdCausedMacPolicyErrorRowRenderer,
  auditdChangedPromiscuousModeRowRenderer,
  auditdCrashedProgramRowRenderer,
  auditdloadedFirewallRuleErrorRowRenderer,
  auditdLockedAccountModeRowRenderer,
  auditdSuspiciousLinkDeprecatedRowRenderer,
  auditdSuspiciousLinkRowRenderer,
  auditdUnLockedAccountModeRowRenderer,
  auditdFailedLoginDeprecatedTooManyTimesRowRenderer,
  auditdFailedLoginTooManyTimesRowRenderer,
  auditdLoginFromUnusualPlaceToRowRenderer,
  auditdOpenTooManySessionsToRowRenderer,
  auditdLoginFromUnusualDeprecatedPlaceToRowRenderer,
  auditdLoginFromDeprecatedUnusualHourRowRenderer,
  auditdLoginFromUnusualHourRowRenderer,
  auditdTestedFileSystemIntegoryOfRowRenderer,
  auditdViolatedSelinuxPolicyRowRenderer,
  auditdViolatedAppArmorPolicyRowRenderer,
  auditdChangedGropuRowRenderer,
  auditdChangedUserIdRowRenderer,
  auditdChangedAuditConfigurationRowRenderer,
  auditdRefreshedCredentialsRowRenderer,
  auditdNegotiatedCryptoKeyRowRenderer,
  auditdCryptoOfficerLoggednDeprecatedRowRenderer,
  auditdCryptoOfficerLoggednRowRenderer,
  auditdCryptoOfficerLoggedoutDeprecatedRowRenderer,
  auditdCryptoOfficerLoggedoutRowRenderer,
  auditdStartedCryptoSessionRowRenderer,
  auditdAccessResultRowRenderer,
  auditdAbortedAuditDeprecatedStartupRowRenderer,
  auditdAbortedAuditStartupRowRenderer,
  auditdRemoteAuditConnectedRowRenderer,
  auditdRemoteAuditDisconnectedRowRenderer,
  auditdShutdownAuditRowRenderer,
  auditdAuditErrorRowRenderer,
  auditdReconfiguredAuditDeprecatedRowRenderer,
  auditdReconfiguredAuditRowRenderer,
  auditdResumedAuditLoggingRowRenderer,
  auditdRotatedAuditLogsRowRenderer,
  auditdStartedAuditRowRenderer,
  auditdDeletedGroupAccountFromRowRenderer,
  auditdDeletedUserAccountRowRenderer,
  auditdChangedAuditFeatureRowRenderer,
  auditdRelabeledRowRenderer,
  auditdAuthenticatedToGroupRowRenderer,
  auditdChangedGroupPasswordRowRenderer,
  auditdModifiedGroupAccountRowRenderer,
  auditdInitializedAuditSubsystemRowRenderer,
  auditdModifiedLevelOfRowRenderer,
  auditdOverrodeLabelOfRowRenderer,
  auditdChangedLoginIdToRowRenderer,
  auditdMacPermissionRowRenderer,
  auditdChangedSelinuxBooleanRowRenderer,
  auditdLoadedSelinuxPolicyRowRenderer,
  auditdChangedSelinuxEnforcementRowRenderer,
  auditdAssignedUserRoleToRowRenderer,
  auditdModifiedRoleRowRenderer,
  auditdRemovedUserRoleDeprecatedFromRowRenderer,
  auditdRemovedUserRoleFromRowRenderer,
  auditdChangedAuditConfigurationDeprecatedRowRenderer,
  auditdViolatedSeccompPolicyRowRenderer,
  auditdStartedServiceRowRenderer,
  auditdStoppedServiceRowRenderer,
  auditdBootedSystemRowRenderer,
  auditdChangedToRunlevelRowRenderer,
  auditdShutdownSystemRowRenderer,
  auditdSentTestRowRenderer,
  auditdUnknownRowRenderer,
  auditdSentMessageRowRenderer,
  auditdAccessPermissionRowRenderer,
  auditdAuthenticated,
  auditdChangedPasswordRowRenderer,
  auditdRanCommandRowRenderer,
  auditdErrorRowRenderer,
  auditdLoggedOutDeprecatedRowRenderer,
  auditdLoggedOutRowRenderer,
  auditdChangedMacConfigurationRowRenderer,
  auditdLoadedMacPolicyRowRenderer,
  auditdModifiedUserAccountRowRenderer,
  auditdChangedRoleToRowRenderer,
  auditdAccessErrorRowRenderer,
  auditdChangedConfigurationRowRenderer,
  auditdIssuedVmControlRowRenderer,
  auditdCreatedVmImageRowRenderer,
  auditdDeletedVmImageRowRenderer,
  auditdCheckedIntegrityOfRowRenderer,
  auditdAssignedVmIdRowRenderer,
  auditdMigratedVmFromRowRenderer,
  auditdMigratedVmToRowRenderer,
  auditdAssignedVmResourceRowRenderer,
];
