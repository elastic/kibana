/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const INITIAL_AGENT_FIELDS_TO_EXPORT = [
  {
    field: 'agent.id',
    description: i18n.translate('xpack.fleet.exportCSV.agentIdField', {
      defaultMessage: 'Agent ID',
    }),
  },
  {
    field: 'status',
    description: i18n.translate('xpack.fleet.exportCSV.statusField', { defaultMessage: 'Status' }),
  },
  {
    field: 'local_metadata.host.hostname',
    description: i18n.translate('xpack.fleet.exportCSV.hostnameField', {
      defaultMessage: 'Host Name',
    }),
  },
  {
    field: 'policy_id',
    description: i18n.translate('xpack.fleet.exportCSV.policyIdField', {
      defaultMessage: 'Policy ID',
    }),
  }, // policy name would need to be enriched
  {
    field: 'last_checkin',
    description: i18n.translate('xpack.fleet.exportCSV.lastCheckinField', {
      defaultMessage: 'Last Checkin Time',
    }),
  },
  {
    field: 'local_metadata.elastic.agent.version',
    description: i18n.translate('xpack.fleet.exportCSV.agentVersionField', {
      defaultMessage: 'Agent Version',
    }),
  },
];

export const AGENT_FIELDS_TO_EXPORT = [
  {
    field: 'active',
    description: i18n.translate('xpack.fleet.exportCSV.activeField', { defaultMessage: 'Active' }),
  },
  {
    field: 'audit_unenrolled_reason',
    description: i18n.translate('xpack.fleet.exportCSV.auditUnenrolledReasonField', {
      defaultMessage: 'Audit Unenrolled Reason',
    }),
  },
  {
    field: 'audit_unenrolled_time',
    description: i18n.translate('xpack.fleet.exportCSV.auditUnenrolledTimeField', {
      defaultMessage: 'Audit Unenrolled Time',
    }),
  },
  {
    field: 'enrolled_at',
    description: i18n.translate('xpack.fleet.exportCSV.enrolledAtField', {
      defaultMessage: 'Enrolled At',
    }),
  },
  {
    field: 'last_checkin_message',
    description: i18n.translate('xpack.fleet.exportCSV.lastCheckinMessageField', {
      defaultMessage: 'Last Checkin Message',
    }),
  },
  {
    field: 'last_checkin_status',
    description: i18n.translate('xpack.fleet.exportCSV.lastCheckinStatusField', {
      defaultMessage: 'Last Checkin Status',
    }),
  },
  {
    field: 'last_updated',
    description: i18n.translate('xpack.fleet.exportCSV.lastUpdatedField', {
      defaultMessage: 'Last Updated Time',
    }),
  },
  {
    field: 'local_metadata.elastic.agent.build.original',
    description: i18n.translate('xpack.fleet.exportCSV.agentBuildOriginalField', {
      defaultMessage: 'Agent Build Original',
    }),
  },
  {
    field: 'local_metadata.elastic.agent.log_level',
    description: i18n.translate('xpack.fleet.exportCSV.logLevelField', {
      defaultMessage: 'Agent Log Level',
    }),
  },
  {
    field: 'local_metadata.elastic.agent.snapshot',
    description: i18n.translate('xpack.fleet.exportCSV.agentSnapshotField', {
      defaultMessage: 'Agent Snapshot',
    }),
  },
  {
    field: 'local_metadata.elastic.agent.unprivileged',
    description: i18n.translate('xpack.fleet.exportCSV.agentUnprivilegedField', {
      defaultMessage: 'Agent Unprivileged',
    }),
  },
  {
    field: 'local_metadata.elastic.agent.upgradeable',
    description: i18n.translate('xpack.fleet.exportCSV.agentUpgradeableField', {
      defaultMessage: 'Agent Upgradeable',
    }),
  },
  {
    field: 'local_metadata.host.architecture',
    description: i18n.translate('xpack.fleet.exportCSV.hostArchitectureField', {
      defaultMessage: 'Host Architecture',
    }),
  },
  {
    field: 'local_metadata.host.id',
    description: i18n.translate('xpack.fleet.exportCSV.hostIdField', { defaultMessage: 'Host ID' }),
  },
  {
    field: 'local_metadata.host.ip',
    description: i18n.translate('xpack.fleet.exportCSV.hostIpField', { defaultMessage: 'Host IP' }),
  },
  {
    field: 'local_metadata.host.mac',
    description: i18n.translate('xpack.fleet.exportCSV.hostMacField', {
      defaultMessage: 'Host Mac',
    }),
  },
  {
    field: 'local_metadata.host.name',
    description: i18n.translate('xpack.fleet.exportCSV.hostNameField', {
      defaultMessage: 'Host Name',
    }),
  },
  {
    field: 'local_metadata.os.family',
    description: i18n.translate('xpack.fleet.exportCSV.osFamilyField', {
      defaultMessage: 'OS Family',
    }),
  },
  {
    field: 'local_metadata.os.full',
    description: i18n.translate('xpack.fleet.exportCSV.osFullField', { defaultMessage: 'OS Full' }),
  },
  {
    field: 'local_metadata.os.kernel',
    description: i18n.translate('xpack.fleet.exportCSV.osKernelField', {
      defaultMessage: 'OS Kernel',
    }),
  },
  {
    field: 'local_metadata.os.name',
    description: i18n.translate('xpack.fleet.exportCSV.osNameField', { defaultMessage: 'OS Name' }),
  },
  {
    field: 'local_metadata.os.platform',
    description: i18n.translate('xpack.fleet.exportCSV.osPlatformField', {
      defaultMessage: 'OS Platform',
    }),
  },
  {
    field: 'local_metadata.os.version',
    description: i18n.translate('xpack.fleet.exportCSV.osVersionField', {
      defaultMessage: 'OS Version',
    }),
  },
  {
    field: 'tags',
    description: i18n.translate('xpack.fleet.exportCSV.tagsField', { defaultMessage: 'Tags' }),
  },
  {
    field: 'unenrolled_at',
    description: i18n.translate('xpack.fleet.exportCSV.unenrolledAtField', {
      defaultMessage: 'Unenrolled At',
    }),
  },
  {
    field: 'unenrolled_reason',
    description: i18n.translate('xpack.fleet.exportCSV.unenrolledReasonField', {
      defaultMessage: 'Unenrolled Reason',
    }),
  },
  {
    field: 'unenrollment_started_at',
    description: i18n.translate('xpack.fleet.exportCSV.unenrolledStartedAtField', {
      defaultMessage: 'Unenrolled Started At',
    }),
  },
  {
    field: 'unhealthy_reason',
    description: i18n.translate('xpack.fleet.exportCSV.unhealthyReasonField', {
      defaultMessage: 'Unhealthy Reason',
    }),
  },
  {
    field: 'updated_at',
    description: i18n.translate('xpack.fleet.exportCSV.updatedAtField', {
      defaultMessage: 'Updated At',
    }),
  },
  {
    field: 'upgrade_started_at',
    description: i18n.translate('xpack.fleet.exportCSV.upgradeStartedAtField', {
      defaultMessage: 'Upgrade Started At',
    }),
  },
  {
    field: 'upgrade_status',
    description: i18n.translate('xpack.fleet.exportCSV.upgradeStatusField', {
      defaultMessage: 'Upgrade Status',
    }),
  },
  {
    field: 'upgraded_at',
    description: i18n.translate('xpack.fleet.exportCSV.upgradedAtField', {
      defaultMessage: 'Upgraded At',
    }),
  },
  {
    field: 'user_provided_metadata',
    description: i18n.translate('xpack.fleet.exportCSV.userProvidedMetadataField', {
      defaultMessage: 'User Provided Metadata',
    }),
  },
];
