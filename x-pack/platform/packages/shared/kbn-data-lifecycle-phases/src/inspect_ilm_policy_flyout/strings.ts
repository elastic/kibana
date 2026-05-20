/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

const PREFIX = 'xpack.dataLifecyclePhases.inspectFlyout';

export const inspectIlmPolicyFlyoutStrings = {
  enabledLabel: i18n.translate(`${PREFIX}.enabledLabel`, { defaultMessage: 'Enabled' }),
  disabledLabel: i18n.translate(`${PREFIX}.disabledLabel`, { defaultMessage: 'Disabled' }),
  summaryTabLabel: i18n.translate(`${PREFIX}.summaryTabLabel`, { defaultMessage: 'Summary' }),
  jsonTabLabel: i18n.translate(`${PREFIX}.jsonTabLabel`, { defaultMessage: 'JSON' }),
  tabsAriaLabel: i18n.translate(`${PREFIX}.tabsAriaLabel`, {
    defaultMessage: 'Inspect ILM policy tabs',
  }),
  title: (policyName: string) =>
    i18n.translate(`${PREFIX}.title`, {
      defaultMessage: "Inspecting ''{policyName}''",
      values: { policyName },
    }),
  backButton: i18n.translate(`${PREFIX}.backButton`, { defaultMessage: 'Back' }),
  editPolicyButton: i18n.translate(`${PREFIX}.editPolicyButton`, { defaultMessage: 'Edit policy' }),
  selectAndApplyButton: i18n.translate(`${PREFIX}.selectAndApplyButton`, {
    defaultMessage: 'Select policy and apply',
  }),
  copyRequestAriaLabel: i18n.translate(`${PREFIX}.copyRequestAriaLabel`, {
    defaultMessage: 'Copy request',
  }),
  shrinkSection: i18n.translate(`${PREFIX}.shrinkSection`, { defaultMessage: 'Shrink' }),
  shrinkBy: i18n.translate(`${PREFIX}.shrinkBy`, { defaultMessage: 'Shrink by' }),
  shrinkBySize: i18n.translate(`${PREFIX}.shrinkBySize`, { defaultMessage: 'Primary shard size' }),
  shrinkByShardCount: i18n.translate(`${PREFIX}.shrinkByShardCount`, {
    defaultMessage: 'Shard count',
  }),
  primaryShardSize: i18n.translate(`${PREFIX}.primaryShardSize`, {
    defaultMessage: 'Primary shard size',
  }),
  primaryShardCount: i18n.translate(`${PREFIX}.primaryShardCount`, {
    defaultMessage: 'Primary shard count',
  }),
  writeAfterShrink: i18n.translate(`${PREFIX}.writeAfterShrink`, {
    defaultMessage: 'Write after shrink',
  }),
  forcemergeSection: i18n.translate(`${PREFIX}.forcemergeSection`, {
    defaultMessage: 'Force merge',
  }),
  numberOfSegments: i18n.translate(`${PREFIX}.numberOfSegments`, {
    defaultMessage: 'Number of segments',
  }),
  compressStoredField: i18n.translate(`${PREFIX}.compressStoredField`, {
    defaultMessage: 'Compress stored field',
  }),
  searchableSnapshotSection: i18n.translate(`${PREFIX}.searchableSnapshotSection`, {
    defaultMessage: 'Searchable snapshot',
  }),
  repository: i18n.translate(`${PREFIX}.repository`, { defaultMessage: 'Repository' }),
  forceMergeIndex: i18n.translate(`${PREFIX}.forceMergeIndex`, {
    defaultMessage: 'Force merge before snapshot',
  }),
  forceMergeOnClone: i18n.translate(`${PREFIX}.forceMergeOnClone`, {
    defaultMessage: 'Force merge on clone',
  }),
  recoveryPrioritySection: i18n.translate(`${PREFIX}.recoveryPrioritySection`, {
    defaultMessage: 'Recovery priority',
  }),
  indexPriority: i18n.translate(`${PREFIX}.indexPriority`, { defaultMessage: 'Index priority' }),
  indexPriorityDefault: i18n.translate(`${PREFIX}.indexPriorityDefault`, {
    defaultMessage: 'Default',
  }),
  replicasSection: i18n.translate(`${PREFIX}.replicasSection`, { defaultMessage: 'Replicas' }),
  numberOfReplicas: i18n.translate(`${PREFIX}.numberOfReplicas`, {
    defaultMessage: 'Number of replicas',
  }),
  allocateInclude: i18n.translate(`${PREFIX}.allocateInclude`, { defaultMessage: 'Include' }),
  allocateExclude: i18n.translate(`${PREFIX}.allocateExclude`, { defaultMessage: 'Exclude' }),
  allocateRequire: i18n.translate(`${PREFIX}.allocateRequire`, { defaultMessage: 'Require' }),
  nodeAttributesSection: i18n.translate(`${PREFIX}.nodeAttributesSection`, {
    defaultMessage: 'Node attributes',
  }),
  dataAllocationSection: i18n.translate(`${PREFIX}.dataAllocationSection`, {
    defaultMessage: 'Data allocation',
  }),
  moveData: i18n.translate(`${PREFIX}.moveData`, { defaultMessage: 'Move data' }),
  rolloverTriggerSection: i18n.translate(`${PREFIX}.rolloverTriggerSection`, {
    defaultMessage: 'Trigger rollover',
  }),
  rolloverRestrictSection: i18n.translate(`${PREFIX}.rolloverRestrictSection`, {
    defaultMessage: 'Restrict rollover',
  }),
  rolloverAge: i18n.translate(`${PREFIX}.rolloverAge`, { defaultMessage: 'Age' }),
  rolloverDocs: i18n.translate(`${PREFIX}.rolloverDocs`, {
    defaultMessage: 'Documents',
  }),
  rolloverPrimaryShardSize: i18n.translate(`${PREFIX}.rolloverPrimaryShardSize`, {
    defaultMessage: 'Primary shard size',
  }),
  rolloverPrimaryShardDocs: i18n.translate(`${PREFIX}.rolloverPrimaryShardDocs`, {
    defaultMessage: 'Primary shard documents',
  }),
  rolloverIndexSize: i18n.translate(`${PREFIX}.rolloverIndexSize`, {
    defaultMessage: 'Index size',
  }),
  useColdNodes: i18n.translate(`${PREFIX}.useColdNodes`, { defaultMessage: 'Use cold nodes' }),
  useWarmNodes: i18n.translate(`${PREFIX}.useWarmNodes`, { defaultMessage: 'Use warm nodes' }),
  noDataTierMigration: i18n.translate(`${PREFIX}.noDataTierMigration`, {
    defaultMessage: 'No data tier migration',
  }),
  downsampleSection: i18n.translate(`${PREFIX}.downsampleSection`, {
    defaultMessage: 'Downsample',
  }),
  downsampleFixedInterval: i18n.translate(`${PREFIX}.downsampleFixedInterval`, {
    defaultMessage: 'Fixed interval',
  }),
  freeze: i18n.translate(`${PREFIX}.freeze`, { defaultMessage: 'Freeze' }),
  readOnly: i18n.translate(`${PREFIX}.readOnly`, { defaultMessage: 'Read-only' }),
  deleteSnapshot: i18n.translate(`${PREFIX}.deleteSnapshot`, { defaultMessage: 'Delete snapshot' }),
  waitForPolicySnapshotSection: i18n.translate(`${PREFIX}.waitForPolicySnapshotSection`, {
    defaultMessage: 'Wait for policy snapshot',
  }),
  policyName: i18n.translate(`${PREFIX}.policyName`, { defaultMessage: 'Policy name' }),
};
