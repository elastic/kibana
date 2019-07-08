/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

// Note for translators and programmers
// Examples of these strings are all of the form
// Session {session.id} {primary} as {secondary}@{hostname} in {folder} was authorized to use {executable} with result {result.success/failure}
// E.x. Session 5 Frank as root@server-1 in /root was authorized to use wget with result success

// However, the strings can be dropped depending on the circumstances of the variables. For example, with no data at all
// Session 10
// Example with just a user name and hostname
// Session 20 frank@server-1
// Example with user name, hostname, but no result
// Session 20 frank@server-1 acquired credentials to curl

export const SESSION = i18n.translate('xpack.siem.auditd.sessionDescription', {
  defaultMessage: 'Session',
});

export const WAS_AUTHORIZED_TO_USE = i18n.translate(
  'xpack.siem.auditd.wasAuthorizedToUseDescription',
  {
    defaultMessage: 'was authorized to use',
  }
);

export const ACQUIRED_CREDENTIALS_TO = i18n.translate(
  'xpack.siem.auditd.acquiredCredentialsDescription',
  {
    defaultMessage: 'acquired credentials to',
  }
);

export const ENDED_FROM = i18n.translate('xpack.siem.auditd.endedFromDescription', {
  defaultMessage: 'ended from',
});

export const STARTED = i18n.translate('xpack.siem.auditd.startedAtDescription', {
  defaultMessage: 'started',
});

export const DISPOSED_CREDENTIALS_TO = i18n.translate(
  'xpack.siem.auditd.disposedCredentialsDescription',
  {
    defaultMessage: 'disposed credentials to',
  }
);

export const ATTEMPTED_LOGIN = i18n.translate('xpack.siem.auditd.attemptedLoginDescription', {
  defaultMessage: 'attempted a login via',
});

export const WITH_RESULT = i18n.translate('xpack.siem.auditd.withResultDescription', {
  defaultMessage: 'with result',
});

export const EXECUTED = i18n.translate('xpack.siem.auditd.executedDescription', {
  defaultMessage: 'executed',
});

export const AS = i18n.translate('xpack.siem.auditd.asDescription', {
  defaultMessage: 'as',
});

export const CONNECTED_USING = i18n.translate('xpack.siem.auditd.connectedUsingDescription', {
  defaultMessage: 'connected using',
});

export const USING = i18n.translate('xpack.siem.auditd.usingDescription', {
  defaultMessage: 'using',
});

export const OPENED_FILE = i18n.translate('xpack.siem.auditd.OpenedFileDescription', {
  defaultMessage: 'opened file',
});

export const CHANGED_FILE_ATTRIBUTES_OF = i18n.translate(
  'xpack.siem.auditd.ChangedFileAttributesOfDescription',
  {
    defaultMessage: 'changed file attributes of',
  }
);

export const CHANGED_FILE_PERMISSIONS_OF = i18n.translate(
  'xpack.siem.auditd.changedFilePermissionOfDescription',
  {
    defaultMessage: 'changed file permissions of',
  }
);

export const CHANGED_FILE_OWNERSHIP_OF = i18n.translate(
  'xpack.siem.auditd.changeidleOwernshipOfDescription',
  {
    defaultMessage: 'changed file ownership of',
  }
);

export const LOADED_KERNEL_MODULE = i18n.translate(
  'xpack.siem.auditd.loaedKernelModuleOfDescription',
  {
    defaultMessage: 'loaded kernel module of',
  }
);

export const UNLOADED_KERNEL_MODULE_OF = i18n.translate(
  'xpack.siem.auditd.unloadedKernelModuleOfDescription',
  {
    defaultMessage: 'unloaded kernel module of',
  }
);

export const CREATED_DIRECTORY = i18n.translate('xpack.siem.auditd.createdDirectoryDescription', {
  defaultMessage: 'created directory',
});

export const MOUNTED = i18n.translate('xpack.siem.auditd.mountedDescription', {
  defaultMessage: 'mounted',
});

export const RENAMED = i18n.translate('xpack.siem.auditd.renamedDescription', {
  defaultMessage: 'renamed',
});

export const CHECKED_METADATA_OF = i18n.translate(
  'xpack.siem.auditd.chedckedMetaDataOfDescription',
  {
    defaultMessage: 'checked metadata of',
  }
);

export const CHECKED_FILE_SYSTEM_METADATA_OF = i18n.translate(
  'xpack.siem.auditd.checkedFileSystemMetadataOfDescription',
  {
    defaultMessage: 'checked filesystem metadata of',
  }
);

export const SYMLINKED = i18n.translate('xpack.siem.auditd.symLinkedDescription', {
  defaultMessage: 'symbolically linked',
});

export const UNMOUNTED = i18n.translate('xpack.siem.auditd.unmountedDescription', {
  defaultMessage: 'unmounted',
});

export const DELETED = i18n.translate('xpack.siem.auditd.deletedDescription', {
  defaultMessage: 'deleted',
});

export const CHANGED_TIME_STAMP_OF = i18n.translate(
  'xpack.siem.auditd.changedTimeStampOfDescription',
  {
    defaultMessage: 'changed time stamp of',
  }
);

export const LISTEN_FOR_CONNECTIONS = i18n.translate(
  'xpack.siem.auditd.ListeningForConnectionsUsingDescription',
  {
    defaultMessage: 'listening for connections using',
  }
);

export const BOUND_SOCKET_FROM = i18n.translate('xpack.siem.auditd.boundSocketFromDescription', {
  defaultMessage: 'bound socket from',
});

export const RECEIVED_FROM = i18n.translate('xpack.siem.auditd.receivedFromDescription', {
  defaultMessage: 'received from',
});

export const SENT_TO = i18n.translate('xpack.siem.auditd.sentToDescription', {
  defaultMessage: 'sent to',
});

export const KILLED_PROCESS_ID_OF = i18n.translate('xpack.siem.auditd.killedProcessIdDescription', {
  defaultMessage: 'killed process id of',
});

export const CHANGED_IDENTITY_USING = i18n.translate(
  'xpack.siem.auditd.changedIdentityUsingDescription',
  {
    defaultMessage: 'changed identity using',
  }
);

export const CHANGED_SYSTEM_TIME_WITH = i18n.translate(
  'xpack.siem.auditd.changedSystemTimeWithDescription',
  {
    defaultMessage: 'changed system time with',
  }
);

export const MADE_DEVICE_WITH = i18n.translate('xpack.siem.auditd.madeDeviceWithDescription', {
  defaultMessage: 'made device with',
});

export const CHANGED_SYSTEM_NAME = i18n.translate(
  'xpack.siem.auditd.changedSystemNameDescription',
  {
    defaultMessage: 'changed system name',
  }
);

export const ALLOCATED_MEMORY_FOR = i18n.translate(
  'xpack.siem.auditd.allocatedMemoryForDescription',
  {
    defaultMessage: 'allocated memory for',
  }
);

export const SCHEDULED_POLICY_OF = i18n.translate(
  'xpack.siem.auditd.scheduledPolicyOFDescription',
  {
    defaultMessage: 'scheduled policy of',
  }
);

export const ADDED_USER_ACCOUNT = i18n.translate('xpack.siem.auditd.addedUserAccountDescription', {
  defaultMessage: 'added user account',
});

export const CAUSED_MAC_POLICY_ERROR = i18n.translate(
  'xpack.siem.auditd.causedMacPolicyErrorDescription',
  {
    defaultMessage: 'caused mac policy error',
  }
);

export const LOADED_FIREWALL_RULE = i18n.translate(
  'xpack.siem.auditd.loadedFirewallRuleDescription',
  {
    defaultMessage: 'loaded firewall rule',
  }
);

export const CHANGED_PROMISCUOUS_MODE = i18n.translate(
  'xpack.siem.auditd.promiscuousModeDescription',
  {
    defaultMessage: 'changed promiscuous mode on the device using',
  }
);

export const LOCKED_ACCOUNT = i18n.translate('xpack.siem.auditd.lockedAccountDescription', {
  defaultMessage: 'locked account',
});

export const UNLOCKED_ACCOUNT = i18n.translate('xpack.siem.auditd.unlockedAccountDescription', {
  defaultMessage: 'unlocked account',
});

export const ADDED_GROUP_ACCOUNT_USING = i18n.translate(
  'xpack.siem.auditd.adddedGroupAccountUsingDescription',
  {
    defaultMessage: 'added group account using',
  }
);

export const CRASHED_PROGRAM = i18n.translate('xpack.siem.auditd.crashedProgramDescription', {
  defaultMessage: 'crashed program',
});

export const EXECUTION_OF_FORBIDDEN_PROGRAM = i18n.translate(
  'xpack.siem.auditd.executionOfForbiddenProgramDescription',
  {
    defaultMessage: 'execution of forbidden program',
  }
);

export const USED_SUSPICIOUS_PROGRAM = i18n.translate(
  'xpack.siem.auditd.suspiciousProgramDescription',
  {
    defaultMessage: 'used suspicious program',
  }
);

export const FAILED_LOGIN_TOO_MANY_TIMES = i18n.translate(
  'xpack.siem.auditd.failedLoginTooManyTimesDescription',
  {
    defaultMessage: 'failed login due to logging in too many times',
  }
);

export const ATTEMPTED_LOGIN_FROM_UNUSUAL_PLACE = i18n.translate(
  'xpack.siem.auditd.attemptedLoginFromUnusalPlaceDescription',
  {
    defaultMessage: 'attempted login from unusual place',
  }
);

export const OPENED_TOO_MANY_SESSIONS = i18n.translate(
  'xpack.siem.auditd.openedTooManySessionsDescription',
  {
    defaultMessage: 'opened too many sessions',
  }
);

export const ATTEMPTED_LOGIN_FROM_UNUSUAL_HOUR = i18n.translate(
  'xpack.siem.auditd.attemptedLoginFromUnusualHourDescription',
  {
    defaultMessage: 'attempted login from unusual hour',
  }
);

export const TESTED_FILE_SYSTEM_INTEGRITY = i18n.translate(
  'xpack.siem.auditd.testedFileSystemIntegrityDescription',
  {
    defaultMessage: 'tested file system integrity',
  }
);

export const VIOLATED_SELINUX_POLICY = i18n.translate(
  'xpack.siem.auditd.violatedSeLinuxPolicyDescription',
  {
    defaultMessage: 'violated selinux policy',
  }
);

export const VIOLATED_APP_ARMOR_POLICY_FROM = i18n.translate(
  'xpack.siem.auditd.violatedAppArmorPolicyFromDescription',
  {
    defaultMessage: 'violated app armor policy from',
  }
);

export const CHANGED_GROUP = i18n.translate('xpack.siem.auditd.changedGroupDescription', {
  defaultMessage: 'changed group',
});

export const CHANGED_USER_ID = i18n.translate('xpack.siem.auditd.changedUserIdDescription', {
  defaultMessage: 'changed user id',
});

export const CHANGED_AUDIT_CONFIGURATION = i18n.translate(
  'xpack.siem.auditd.changedAuditConfigurationDescription',
  {
    defaultMessage: 'changed audit configuration',
  }
);

export const REFRESHED_CREDENTIALS_FOR = i18n.translate(
  'xpack.siem.auditd.refreshedCredentialsForDescription',
  {
    defaultMessage: 'refreshed credentials for',
  }
);

export const NEGOTIATED_CRYPTO_KEY = i18n.translate(
  'xpack.siem.auditd.negotiatedCryptoKeyDescription',
  {
    defaultMessage: 'negotiated crypto key',
  }
);

export const CRYPTO_OFFICER_LOGGED_IN = i18n.translate(
  'xpack.siem.auditd.cryptoOfficerLoggedInDescription',
  {
    defaultMessage: 'crypto officer logged in',
  }
);

export const CRYPTO_OFFICER_LOGGED_OUT = i18n.translate(
  'xpack.siem.auditd.cryptoOfficerLoggedOutDescription',
  {
    defaultMessage: 'crypto officer logged out',
  }
);

export const STARTED_CRYPTO_SESSION = i18n.translate(
  'xpack.siem.auditd.startedCryptoSessionDescription',
  {
    defaultMessage: 'started crypto session',
  }
);

export const ACCESS_RESULT = i18n.translate('xpack.siem.auditd.accessResultDescription', {
  defaultMessage: 'access result',
});

export const ABORTED_AUDIT_STARTUP = i18n.translate(
  'xpack.siem.auditd.abortedAuditStartupDescription',
  {
    defaultMessage: 'aborted audit startup',
  }
);

export const REMOTE_AUDIT_CONNECTED = i18n.translate(
  'xpack.siem.auditd.remoteAuditConnectedDescription',
  {
    defaultMessage: 'remote audit connected',
  }
);

export const REMOTE_AUDIT_DISCONNECTED = i18n.translate(
  'xpack.siem.auditd.remoteAuditDisconnectedDescription',
  {
    defaultMessage: 'remote audit disconnected',
  }
);

export const SHUTDOWN_AUDIT = i18n.translate('xpack.siem.auditd.shutDownAuditDescription', {
  defaultMessage: 'shutdown audit',
});

export const AUDIT_ERROR = i18n.translate('xpack.siem.auditd.auditErrorDescription', {
  defaultMessage: 'audit error',
});

export const RECONFIGURED_AUDIT = i18n.translate('xpack.siem.auditd.reconfiguredAuditDescription', {
  defaultMessage: 'reconfigured audit',
});

export const RESUMED_AUDIT_LOGGING = i18n.translate(
  'xpack.siem.auditd.resumedAuditLoggingDescription',
  {
    defaultMessage: 'resumed audit logging',
  }
);

export const ROTATED_AUDIT_LOGS = i18n.translate('xpack.siem.auditd.rotatedAuditLogsDescription', {
  defaultMessage: 'rotated-audit-logs',
});

export const STARTED_AUDIT = i18n.translate('xpack.siem.auditd.startedAuditDescription', {
  defaultMessage: 'started audit',
});

export const DELETED_GROUP_ACCOUNT_USING = i18n.translate(
  'xpack.siem.auditd.deletedGroupAccountUsingDescription',
  {
    defaultMessage: 'deleted group account using',
  }
);

export const DELETED_USER_ACCOUNT_USING = i18n.translate(
  'xpack.siem.auditd.deletedUserAccountUsingDescription',
  {
    defaultMessage: 'deleted user account using',
  }
);

export const CHANGED_AUDIT_FEATURE = i18n.translate(
  'xpack.siem.auditd.changedAuditFeatureDescription',
  {
    defaultMessage: 'changed audit feature',
  }
);

export const RELABELED_FILESYSTEM = i18n.translate(
  'xpack.siem.auditd.relabeledFileSystemDescription',
  {
    defaultMessage: 'relabeled filesystem',
  }
);

export const AUTHENTICATED_TO_GROUP = i18n.translate(
  'xpack.siem.auditd.authenticatedToGroupDescription',
  {
    defaultMessage: 'authenticated to group',
  }
);

export const CHANGED_GROUP_PASSWORD = i18n.translate(
  'xpack.siem.auditd.changedGroupPasswordDescription',
  {
    defaultMessage: 'changed group password',
  }
);

export const MODIFIED_GROUP_ACCOUNT = i18n.translate(
  'xpack.siem.auditd.modifiedGroupAccountDescription',
  {
    defaultMessage: 'modified group account',
  }
);

export const INITIALIZED_AUDIT_SUBSYSTEM = i18n.translate(
  'xpack.siem.auditd.initializedAuditSubsystemDescription',
  {
    defaultMessage: 'initialized audit subsystem',
  }
);

export const MODIFIED_LEVEL_OF = i18n.translate('xpack.siem.auditd.modifiedLevelOfDescription', {
  defaultMessage: 'modified level of',
});

export const OVERRODE_LABEL_OF = i18n.translate('xpack.siem.auditd.overrodeLabelOfDescription', {
  defaultMessage: 'overrode label of',
});

export const CHANGED_LOGIN_ID_TO = i18n.translate('xpack.siem.auditd.changedLoginIdToDescription', {
  defaultMessage: 'changed login id to',
});

export const MAC_PERMISSION = i18n.translate('xpack.siem.auditd.macPermissionDescription', {
  defaultMessage: 'mac permission',
});

export const CHANGED_SELINUX_BOOLEAN = i18n.translate(
  'xpack.siem.auditd.changedSeLinuxBooleanDescription',
  {
    defaultMessage: 'changed selinux boolean',
  }
);

export const LOADED_SELINUX_POLICY = i18n.translate(
  'xpack.siem.auditd.loadedSeLinuxPolicyDescription',
  {
    defaultMessage: 'loaded selinux policy',
  }
);

export const CHANGED_SELINUX_ENFORCEMENT = i18n.translate(
  'xpack.siem.auditd.changedSelinuxEnforcementDescription',
  {
    defaultMessage: 'changed selinux enforcement',
  }
);

export const ASSIGNED_USER_ROLE_TO = i18n.translate(
  'xpack.siem.auditd.assignedUserRoleToDescription',
  {
    defaultMessage: 'assigned user role to',
  }
);

export const MODIFIED_ROLE = i18n.translate('xpack.siem.auditd.modifiedRoleDescription', {
  defaultMessage: 'modified role',
});

export const REMOVED_USER_ROLE_FROM = i18n.translate(
  'xpack.siem.auditd.removedUserRoleFromDescription',
  {
    defaultMessage: 'removed user role from',
  }
);

export const VIOLATED_SECCOMP_POLICY_WITH = i18n.translate(
  'xpack.siem.auditd.violatedSeccompPolicyWithDescription',
  {
    defaultMessage: 'violated seccomp policy with',
  }
);

export const STARTED_SERVICE = i18n.translate('xpack.siem.auditd.startedServiceDescription', {
  defaultMessage: 'started service',
});

export const STOPPED_SERVICE = i18n.translate('xpack.siem.auditd.stoppedServiceDescription', {
  defaultMessage: 'stopped service',
});

export const BOOTED_SYSTEM = i18n.translate('xpack.siem.auditd.bootedSystemDescription', {
  defaultMessage: 'booted system',
});

export const CHANGED_TO_RUN_LEVEL_WITH = i18n.translate(
  'xpack.siem.auditd.changedToRunLevelWithDescription',
  {
    defaultMessage: 'changed to run level with',
  }
);

export const SHUTDOWN_SYSTEM = i18n.translate('xpack.siem.auditd.shutdownSystemDescription', {
  defaultMessage: 'shutdown system',
});

export const SENT_TEST = i18n.translate('xpack.siem.auditd.sentTestDescription', {
  defaultMessage: 'sent test',
});

export const UNKNOWN = i18n.translate('xpack.siem.auditd.unknownDescription', {
  defaultMessage: 'unknown',
});

export const SENT_MESSAGE = i18n.translate('xpack.siem.auditd.sentMessageDescription', {
  defaultMessage: 'sent message',
});

export const ACCESS_PERMISSION = i18n.translate('xpack.siem.auditd.accessPermissionDescription', {
  defaultMessage: 'access permission',
});

export const AUTHENTICATED_USING = i18n.translate(
  'xpack.siem.auditd.authenticatedUsingDescription',
  {
    defaultMessage: 'authenticated using',
  }
);

export const CHANGED_PASSWORD_WITH = i18n.translate(
  'xpack.siem.auditd.changedPasswordWithDescription',
  {
    defaultMessage: 'changed password with',
  }
);

export const RAN_COMMAND = i18n.translate('xpack.siem.auditd.ranCommandDescription', {
  defaultMessage: 'ran command',
});

export const ERROR_FROM = i18n.translate('xpack.siem.auditd.errorFromDescription', {
  defaultMessage: 'error from',
});

export const LOGGED_OUT = i18n.translate('xpack.siem.auditd.loggedOutDescription', {
  defaultMessage: 'logged out',
});

export const CHANGED_MAC_CONFIGURATION = i18n.translate(
  'xpack.siem.auditd.changedMacConfigurationDescription',
  {
    defaultMessage: 'changed mac configuration',
  }
);

export const LOADED_MAC_POLICY = i18n.translate('xpack.siem.auditd.loadedMacPolicyDescription', {
  defaultMessage: 'loaded mac policy',
});

export const MODIFIED_USER_ACCOUNT = i18n.translate(
  'xpack.siem.auditd.modifiedUserAccountDescription',
  {
    defaultMessage: 'modified user account',
  }
);
export const CHANGED_ROLE_USING = i18n.translate('xpack.siem.auditd.changedRoleUsingDescription', {
  defaultMessage: 'changed role using',
});

export const ACCESS_ERROR = i18n.translate('xpack.siem.auditd.accessErrorDescription', {
  defaultMessage: 'access error',
});

export const CHANGED_CONFIGURATION_WITH = i18n.translate(
  'xpack.siem.auditd.changedConfigurationWIthDescription',
  {
    defaultMessage: 'changed configuration with',
  }
);

export const ISSUED_VM_CONTROL = i18n.translate('xpack.siem.auditd.issuedVmControlDescription', {
  defaultMessage: 'issued vm control',
});

export const CREATED_VM_IMAGE = i18n.translate('xpack.siem.auditd.createdVmImageDescription', {
  defaultMessage: 'created vm image',
});

export const DELETED_VM_IMAGE = i18n.translate('xpack.siem.auditd.deletedVmImageDescription', {
  defaultMessage: 'deleted vm image',
});

export const CHECKED_INTEGRITY_OF = i18n.translate(
  'xpack.siem.auditd.checkedIntegrityOfDescription',
  {
    defaultMessage: 'checked integrity of',
  }
);

export const ASSIGNED_VM_ID = i18n.translate('xpack.siem.auditd.assignedVmIdDescription', {
  defaultMessage: 'assigned vm id',
});

export const MIGRATED_VM_FROM = i18n.translate('xpack.siem.auditd.migratedVmFromDescription', {
  defaultMessage: 'migrated vm from',
});

export const MIGRATED_VM_TO = i18n.translate('xpack.siem.auditd.migratedVmToDescription', {
  defaultMessage: 'migrated vm to',
});

export const ASSIGNED_VM_RESOURCE = i18n.translate(
  'xpack.siem.auditd.assignedVMResourceDescription',
  {
    defaultMessage: 'assigned vm resource',
  }
);
