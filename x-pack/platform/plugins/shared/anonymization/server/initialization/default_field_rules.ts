/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldRule } from '@kbn/anonymization-common';

/**
 * Entity class mappings for fields that are anonymized by default.
 * Aligns with the Security Solution's default anonymization field list.
 */
const DEFAULT_ENTITY_CLASSES: Record<string, string> = {
  'cloud.account.name': 'CLOUD_ACCOUNT',
  'entity.name': 'ENTITY_NAME',
  'host.ip': 'IP',
  'host.name': 'HOST_NAME',
  'user.name': 'USER_NAME',
  'user.target.name': 'USER_NAME',
  'resource.name': 'RESOURCE_NAME',
  'resource.id': 'RESOURCE_ID',
};

/**
 * Fields that are allowed by default for the alerts data view profile.
 * Matches the Security Solution's DEFAULT_ALLOW list.
 */
const DEFAULT_ALLOW: string[] = [
  '_id',
  '@timestamp',
  'actions.name',
  'actions.message',
  'actions.status',
  'actions.context',
  'agent.id',
  'asset.criticality',
  'cloud.account.name',
  'cloud.availability_zone',
  'cloud.provider',
  'cloud.region',
  'cloud.service.name',
  'destination.ip',
  'dns.question.name',
  'dns.question.type',
  'entity.id',
  'entity.name',
  'entity.sub_type',
  'entity.type',
  'event.category',
  'event.dataset',
  'event.module',
  'event.outcome',
  'file.Ext.original.path',
  'file.hash.sha256',
  'file.name',
  'file.path',
  'group.id',
  'group.name',
  'host.architecture',
  'host.asset.criticality',
  'host.name',
  'host.os.name',
  'host.os.version',
  'host.risk.calculated_level',
  'host.risk.calculated_score_norm',
  'host.type',
  'kibana.alert.original_time',
  'kibana.alert.risk_score',
  'kibana.alert.rule.description',
  'kibana.alert.rule.name',
  'kibana.alert.rule.references',
  'kibana.alert.rule.threat.framework',
  'kibana.alert.rule.threat.tactic.id',
  'kibana.alert.rule.threat.tactic.name',
  'kibana.alert.rule.threat.tactic.reference',
  'kibana.alert.rule.threat.technique.id',
  'kibana.alert.rule.threat.technique.name',
  'kibana.alert.rule.threat.technique.reference',
  'kibana.alert.rule.threat.technique.subtechnique.id',
  'kibana.alert.rule.threat.technique.subtechnique.name',
  'kibana.alert.rule.threat.technique.subtechnique.reference',
  'kibana.alert.severity',
  'kibana.alert.workflow_status',
  'message',
  'network.protocol',
  'process.args',
  'process.code_signature.exists',
  'process.code_signature.signing_id',
  'process.code_signature.status',
  'process.code_signature.subject_name',
  'process.code_signature.trusted',
  'process.command_line',
  'process.executable',
  'process.exit_code',
  'process.Ext.memory_region.bytes_compressed_present',
  'process.Ext.memory_region.malware_signature.all_names',
  'process.Ext.memory_region.malware_signature.primary.matches',
  'process.Ext.memory_region.malware_signature.primary.signature.name',
  'process.Ext.token.integrity_level_name',
  'process.hash.md5',
  'process.hash.sha1',
  'process.hash.sha256',
  'process.name',
  'process.parent.args',
  'process.parent.args_count',
  'process.parent.code_signature.exists',
  'process.parent.code_signature.status',
  'process.parent.code_signature.subject_name',
  'process.parent.code_signature.trusted',
  'process.parent.command_line',
  'process.parent.executable',
  'process.parent.name',
  'process.pe.original_file_name',
  'process.pid',
  'process.working_directory',
  'Ransomware.feature',
  'Ransomware.files.data',
  'Ransomware.files.entropy',
  'Ransomware.files.extension',
  'Ransomware.files.metrics',
  'Ransomware.files.operation',
  'Ransomware.files.path',
  'Ransomware.files.score',
  'Ransomware.version',
  'resource.id',
  'resource.name',
  'resource.sub_type',
  'resource.type',
  'result.evaluation',
  'rule.description',
  'rule.name',
  'rule.section',
  'rule.tags',
  'rule.benchmark.name',
  'rule.benchmark.id',
  'rule.benchmark.rule_number',
  'rule.benchmark.version',
  'rule.reference',
  'source.ip',
  'threat.framework',
  'threat.tactic.id',
  'threat.tactic.name',
  'threat.tactic.reference',
  'threat.technique.id',
  'threat.technique.name',
  'threat.technique.reference',
  'threat.technique.subtechnique.id',
  'threat.technique.subtechnique.name',
  'threat.technique.subtechnique.reference',
  'user.asset.criticality',
  'user.domain',
  'user.name',
  'user.risk.calculated_level',
  'user.risk.calculated_score_norm',
  'user.target.name',
  'vulnerability.category',
  'vulnerability.classification',
  'vulnerability.description',
  'vulnerability.enumeration',
  'vulnerability.report_id',
  'vulnerability.scanner.vendor',
  'vulnerability.severity',
  'vulnerability.score.base',
  'vulnerability.score.version',
  'vulnerability.id',
  'package.name',
  'package.version',
  'package.fixed_version',
];

/**
 * Fields that are anonymized by default (value replaced with deterministic token).
 * Matches the Security Solution's DEFAULT_ALLOW_REPLACEMENT list.
 */
const DEFAULT_ANONYMIZE: string[] = [
  'cloud.account.name',
  'entity.name',
  'host.ip',
  'host.name',
  'user.name',
  'user.target.name',
  'resource.name',
  'resource.id',
];

/**
 * Builds the default field rules for the alerts data view profile.
 *
 * - All DEFAULT_ALLOW fields are `allowed: true`
 * - Fields in DEFAULT_ANONYMIZE are also `anonymized: true` with an entity class
 * - `host.ip` is added as anonymized even though it's not in DEFAULT_ALLOW
 *   (matches current Security Solution behavior)
 */
export const getDefaultAlertFieldRules = (): FieldRule[] => {
  const allFields = new Set([...DEFAULT_ALLOW, ...DEFAULT_ANONYMIZE]);

  return Array.from(allFields).map((field) => {
    const isAllowed = DEFAULT_ALLOW.includes(field);
    const isAnonymized = DEFAULT_ANONYMIZE.includes(field);

    return {
      field,
      allowed: isAllowed || isAnonymized,
      anonymized: isAnonymized,
      entityClass: isAnonymized ? DEFAULT_ENTITY_CLASSES[field] : undefined,
    };
  });
};
