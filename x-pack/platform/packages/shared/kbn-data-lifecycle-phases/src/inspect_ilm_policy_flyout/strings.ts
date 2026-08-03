/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const inspectIlmPolicyFlyoutStrings = {
  enabledLabel: i18n.translate('xpack.dataLifecyclePhases.inspectFlyout.enabledLabel', {
    defaultMessage: 'Enabled',
  }),
  disabledLabel: i18n.translate('xpack.dataLifecyclePhases.inspectFlyout.disabledLabel', {
    defaultMessage: 'Disabled',
  }),
  summaryTabLabel: i18n.translate('xpack.dataLifecyclePhases.inspectFlyout.summaryTabLabel', {
    defaultMessage: 'Summary',
  }),
  jsonTabLabel: i18n.translate('xpack.dataLifecyclePhases.inspectFlyout.jsonTabLabel', {
    defaultMessage: 'JSON',
  }),
  tabsAriaLabel: i18n.translate('xpack.dataLifecyclePhases.inspectFlyout.tabsAriaLabel', {
    defaultMessage: 'Inspect ILM policy tabs',
  }),
  title: (policyName: string) =>
    i18n.translate('xpack.dataLifecyclePhases.inspectFlyout.title', {
      defaultMessage: "Inspecting ''{policyName}''",
      values: { policyName },
    }),
  backButton: i18n.translate('xpack.dataLifecyclePhases.inspectFlyout.backButton', {
    defaultMessage: 'Back',
  }),
  editPolicyButton: i18n.translate('xpack.dataLifecyclePhases.inspectFlyout.editPolicyButton', {
    defaultMessage: 'Edit policy',
  }),
  copyRequestAriaLabel: i18n.translate(
    'xpack.dataLifecyclePhases.inspectFlyout.copyRequestAriaLabel',
    {
      defaultMessage: 'Copy request',
    }
  ),
  shrinkSection: i18n.translate('xpack.dataLifecyclePhases.inspectFlyout.shrinkSection', {
    defaultMessage: 'Shrink',
  }),
  shrinkBy: i18n.translate('xpack.dataLifecyclePhases.inspectFlyout.shrinkBy', {
    defaultMessage: 'Shrink by',
  }),
  shrinkBySize: i18n.translate('xpack.dataLifecyclePhases.inspectFlyout.shrinkBySize', {
    defaultMessage: 'Primary shard size',
  }),
  shrinkByShardCount: i18n.translate('xpack.dataLifecyclePhases.inspectFlyout.shrinkByShardCount', {
    defaultMessage: 'Shard count',
  }),
  primaryShardSize: i18n.translate('xpack.dataLifecyclePhases.inspectFlyout.primaryShardSize', {
    defaultMessage: 'Primary shard size',
  }),
  primaryShardCount: i18n.translate('xpack.dataLifecyclePhases.inspectFlyout.primaryShardCount', {
    defaultMessage: 'Primary shard count',
  }),
  writeAfterShrink: i18n.translate('xpack.dataLifecyclePhases.inspectFlyout.writeAfterShrink', {
    defaultMessage: 'Write after shrink',
  }),
  forcemergeSection: i18n.translate('xpack.dataLifecyclePhases.inspectFlyout.forcemergeSection', {
    defaultMessage: 'Force merge',
  }),
  numberOfSegments: i18n.translate('xpack.dataLifecyclePhases.inspectFlyout.numberOfSegments', {
    defaultMessage: 'Number of segments',
  }),
  compressStoredField: i18n.translate(
    'xpack.dataLifecyclePhases.inspectFlyout.compressStoredField',
    {
      defaultMessage: 'Compress stored field',
    }
  ),
  searchableSnapshotSection: i18n.translate(
    'xpack.dataLifecyclePhases.inspectFlyout.searchableSnapshotSection',
    {
      defaultMessage: 'Searchable snapshot',
    }
  ),
  repository: i18n.translate('xpack.dataLifecyclePhases.inspectFlyout.repository', {
    defaultMessage: 'Repository',
  }),
  forceMergeIndex: i18n.translate('xpack.dataLifecyclePhases.inspectFlyout.forceMergeIndex', {
    defaultMessage: 'Force merge before snapshot',
  }),
  forceMergeOnClone: i18n.translate('xpack.dataLifecyclePhases.inspectFlyout.forceMergeOnClone', {
    defaultMessage: 'Force merge on clone',
  }),
  recoveryPrioritySection: i18n.translate(
    'xpack.dataLifecyclePhases.inspectFlyout.recoveryPrioritySection',
    {
      defaultMessage: 'Recovery priority',
    }
  ),
  indexPriority: i18n.translate('xpack.dataLifecyclePhases.inspectFlyout.indexPriority', {
    defaultMessage: 'Index priority',
  }),
  indexPriorityDefault: i18n.translate(
    'xpack.dataLifecyclePhases.inspectFlyout.indexPriorityDefault',
    {
      defaultMessage: 'Default',
    }
  ),
  replicasSection: i18n.translate('xpack.dataLifecyclePhases.inspectFlyout.replicasSection', {
    defaultMessage: 'Replicas',
  }),
  numberOfReplicas: i18n.translate('xpack.dataLifecyclePhases.inspectFlyout.numberOfReplicas', {
    defaultMessage: 'Number of replicas',
  }),
  allocateInclude: i18n.translate('xpack.dataLifecyclePhases.inspectFlyout.allocateInclude', {
    defaultMessage: 'Include',
  }),
  allocateExclude: i18n.translate('xpack.dataLifecyclePhases.inspectFlyout.allocateExclude', {
    defaultMessage: 'Exclude',
  }),
  allocateRequire: i18n.translate('xpack.dataLifecyclePhases.inspectFlyout.allocateRequire', {
    defaultMessage: 'Require',
  }),
  nodeAttributesSection: i18n.translate(
    'xpack.dataLifecyclePhases.inspectFlyout.nodeAttributesSection',
    {
      defaultMessage: 'Node attributes',
    }
  ),
  dataAllocationSection: i18n.translate(
    'xpack.dataLifecyclePhases.inspectFlyout.dataAllocationSection',
    {
      defaultMessage: 'Data allocation',
    }
  ),
  moveData: i18n.translate('xpack.dataLifecyclePhases.inspectFlyout.moveData', {
    defaultMessage: 'Move data',
  }),
  rolloverTriggerSection: i18n.translate(
    'xpack.dataLifecyclePhases.inspectFlyout.rolloverTriggerSection',
    {
      defaultMessage: 'Trigger rollover',
    }
  ),
  rolloverRestrictSection: i18n.translate(
    'xpack.dataLifecyclePhases.inspectFlyout.rolloverRestrictSection',
    {
      defaultMessage: 'Restrict rollover',
    }
  ),
  rolloverAge: i18n.translate('xpack.dataLifecyclePhases.inspectFlyout.rolloverAge', {
    defaultMessage: 'Age',
  }),
  rolloverDocs: i18n.translate('xpack.dataLifecyclePhases.inspectFlyout.rolloverDocs', {
    defaultMessage: 'Documents',
  }),
  rolloverPrimaryShardSize: i18n.translate(
    'xpack.dataLifecyclePhases.inspectFlyout.rolloverPrimaryShardSize',
    {
      defaultMessage: 'Primary shard size',
    }
  ),
  rolloverPrimaryShardDocs: i18n.translate(
    'xpack.dataLifecyclePhases.inspectFlyout.rolloverPrimaryShardDocs',
    {
      defaultMessage: 'Primary shard documents',
    }
  ),
  rolloverIndexSize: i18n.translate('xpack.dataLifecyclePhases.inspectFlyout.rolloverIndexSize', {
    defaultMessage: 'Index size',
  }),
  useColdNodes: i18n.translate('xpack.dataLifecyclePhases.inspectFlyout.useColdNodes', {
    defaultMessage: 'Use cold nodes',
  }),
  useWarmNodes: i18n.translate('xpack.dataLifecyclePhases.inspectFlyout.useWarmNodes', {
    defaultMessage: 'Use warm nodes',
  }),
  noDataTierMigration: i18n.translate(
    'xpack.dataLifecyclePhases.inspectFlyout.noDataTierMigration',
    {
      defaultMessage: 'No data tier migration',
    }
  ),
  downsampleSection: i18n.translate('xpack.dataLifecyclePhases.inspectFlyout.downsampleSection', {
    defaultMessage: 'Downsample',
  }),
  downsampleFixedInterval: i18n.translate(
    'xpack.dataLifecyclePhases.inspectFlyout.downsampleFixedInterval',
    {
      defaultMessage: 'Fixed interval',
    }
  ),
  freeze: i18n.translate('xpack.dataLifecyclePhases.inspectFlyout.freeze', {
    defaultMessage: 'Freeze',
  }),
  readOnly: i18n.translate('xpack.dataLifecyclePhases.inspectFlyout.readOnly', {
    defaultMessage: 'Read-only',
  }),
  deleteSnapshot: i18n.translate('xpack.dataLifecyclePhases.inspectFlyout.deleteSnapshot', {
    defaultMessage: 'Delete snapshot',
  }),
  waitForPolicySnapshotSection: i18n.translate(
    'xpack.dataLifecyclePhases.inspectFlyout.waitForPolicySnapshotSection',
    {
      defaultMessage: 'Wait for policy snapshot',
    }
  ),
  policyName: i18n.translate('xpack.dataLifecyclePhases.inspectFlyout.policyName', {
    defaultMessage: 'Policy name',
  }),
};
