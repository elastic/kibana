/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Local mock data shapes powering the Edit entity type wizard.
 *
 * Everything is hard-coded; nothing here is meant to roundtrip through any
 * backend. The shape mirrors the design closely enough that swapping the
 * builder for a real API call later should be mechanical.
 */

import type { FakeEntityType } from '../fake_entity_types';

export type OwnershipType = 'operational' | 'dev' | 'infrastructure' | 'security' | 'business';

export interface GeneralFields {
  readonly name: string;
  readonly dataStream: string;
  readonly identifierField: string;
  readonly category: string;
  readonly description: string;
}

export interface HealthSignals {
  readonly activeAlertsSeverity: boolean;
  readonly availableSignals: boolean;
  readonly securitySignals: boolean;
}

export interface OwnerMapping {
  readonly id: string;
  readonly resolverValue: string;
  readonly ownerName: string;
  readonly email: string;
  readonly slack: string;
  readonly ownershipType: OwnershipType;
}

export interface OwnershipConfig {
  readonly resolverField: string;
  readonly owners: readonly OwnerMapping[];
}

export interface UnmatchedResolverValue {
  readonly value: string;
  readonly unmatchedEntities: number;
}

export interface CoveragePreview {
  readonly resolvedPercent: number;
  readonly resolvedCount: number;
  readonly totalCount: number;
  readonly unmatched: readonly UnmatchedResolverValue[];
}

export type FlyoutTabId =
  | 'overview'
  | 'metrics'
  | 'logs'
  | 'alerts'
  | 'security'
  | 'relationships'
  | 'custom'
  | 'profiling';

export interface FlyoutTabConfig {
  readonly id: FlyoutTabId;
  readonly label: string;
  readonly description: string;
  readonly enabled: boolean;
}

export type FilterOperator = 'equals' | 'notEquals' | 'contains' | 'exists';

export interface FilterCondition {
  readonly id: string;
  readonly field: string;
  readonly operator: FilterOperator;
  readonly value: string;
}

export interface SubsetDraft {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly enabled: boolean;
  readonly filter: readonly FilterCondition[];
  readonly healthOverride: {
    readonly enabled: boolean;
    readonly signals: HealthSignals;
  };
  readonly ownershipOverride: {
    readonly enabled: boolean;
    readonly ownership: OwnershipConfig;
    readonly coveragePreview: CoveragePreview;
  };
  readonly contentOverride: {
    readonly enabled: boolean;
    readonly flyoutTabs: readonly FlyoutTabConfig[];
  };
}

export interface EntityTypeDraft {
  readonly entityType: FakeEntityType;
  readonly general: GeneralFields;
  readonly health: HealthSignals;
  readonly ownership: OwnershipConfig;
  readonly coveragePreview: CoveragePreview;
  readonly flyoutTabs: readonly FlyoutTabConfig[];
  readonly subsets: readonly SubsetDraft[];
}

const defaultHealth = (): HealthSignals => ({
  activeAlertsSeverity: true,
  availableSignals: true,
  securitySignals: true,
});

const defaultCoveragePreview = (): CoveragePreview => ({
  resolvedPercent: 0,
  resolvedCount: 0,
  totalCount: 0,
  unmatched: [],
});

const defaultFlyoutTabs = (): FlyoutTabConfig[] => [
  {
    id: 'overview',
    label: 'Overview',
    description: 'AI summary, metadata, instant golden signals, ownership',
    enabled: true,
  },
  {
    id: 'metrics',
    label: 'Metrics',
    description: 'Charts for key signals',
    enabled: true,
  },
  {
    id: 'logs',
    label: 'Logs',
    description: 'Filtered log stream for this entity',
    enabled: true,
  },
  {
    id: 'alerts',
    label: 'Alerts',
    description: 'Active and historical alerts for this entity',
    enabled: true,
  },
  {
    id: 'security',
    label: 'Security',
    description: 'Key security signals',
    enabled: true,
  },
  {
    id: 'relationships',
    label: 'Relationships',
    description: 'Related entities: upstream, downstream',
    enabled: true,
  },
  {
    id: 'custom',
    label: 'Custom',
    description: 'Explanations below',
    enabled: false,
  },
  {
    id: 'profiling',
    label: 'Profiling',
    description: 'Requires you to enable Profiling from {link}',
    enabled: false,
  },
];

interface PresetSeed {
  readonly dataStream: string;
  readonly identifierField: string;
  readonly description: string;
  readonly resolverField: string;
  readonly owners: readonly OwnerMapping[];
  readonly coverage: CoveragePreview;
  readonly subsets: readonly SubsetDraft[];
}

const PRESETS: Readonly<Record<string, PresetSeed>> = {
  'k8s-cluster': {
    dataStream: 'metrics-kubernetes.state_node-*',
    identifierField: 'cluster.name',
    description:
      'A Kubernetes cluster identified by cluster.name, detected from node-level state metrics collected by the Kubernetes integration',
    resolverField: 'cluster.labels.team',
    owners: [
      {
        id: 'owner-1',
        resolverValue: 'checkout',
        ownerName: 'checkout-team',
        email: 'checkout-team@com',
        slack: '#checkout-team',
        ownershipType: 'operational',
      },
    ],
    coverage: {
      resolvedPercent: 78,
      resolvedCount: 622,
      totalCount: 847,
      unmatched: [
        { value: 'payment-2', unmatchedEntities: 210 },
        { value: 'data-eng', unmatchedEntities: 67 },
        { value: 'field value', unmatchedEntities: 33 },
      ],
    },
    subsets: [
      {
        id: 'subset-1',
        name: 'Checkout clusters',
        description:
          'Overrides health and ownership for K8s clusters running the checkout service.',
        enabled: true,
        filter: [
          {
            id: 'cond-1',
            field: 'service.name',
            operator: 'equals',
            value: 'myService',
          },
        ],
        healthOverride: {
          enabled: true,
          signals: { activeAlertsSeverity: true, availableSignals: true, securitySignals: false },
        },
        ownershipOverride: {
          enabled: true,
          ownership: {
            resolverField: 'cluster.labels.team',
            owners: [
              {
                id: 'owner-subset-1',
                resolverValue: 'checkout',
                ownerName: 'checkout-oncall',
                email: 'checkout-oncall@example.com',
                slack: '#checkout-oncall',
                ownershipType: 'operational',
              },
            ],
          },
          coveragePreview: {
            resolvedPercent: 92,
            resolvedCount: 23,
            totalCount: 25,
            unmatched: [{ value: 'checkout-beta', unmatchedEntities: 2 }],
          },
        },
        contentOverride: { enabled: false, flyoutTabs: defaultFlyoutTabs() },
      },
      {
        id: 'subset-2',
        name: 'Edge clusters',
        description: 'Surfaces a profiling tab for edge clusters.',
        enabled: true,
        filter: [],
        healthOverride: { enabled: false, signals: defaultHealth() },
        ownershipOverride: {
          enabled: false,
          ownership: { resolverField: 'cluster.labels.team', owners: [] },
          coveragePreview: defaultCoveragePreview(),
        },
        contentOverride: {
          enabled: true,
          flyoutTabs: defaultFlyoutTabs().map((tab) =>
            tab.id === 'profiling' ? { ...tab, enabled: true } : tab
          ),
        },
      },
    ],
  },
  'apm-service': {
    dataStream: 'metrics-apm.service_summary-*',
    identifierField: 'service.name',
    description: 'An APM service identified by service.name, collected by APM agents.',
    resolverField: 'service.labels.team',
    owners: [
      {
        id: 'owner-1',
        resolverValue: 'checkout',
        ownerName: 'checkout-platform',
        email: 'checkout-platform@example.com',
        slack: '#checkout-platform',
        ownershipType: 'operational',
      },
    ],
    coverage: {
      resolvedPercent: 64,
      resolvedCount: 30,
      totalCount: 47,
      unmatched: [
        { value: 'frontend', unmatchedEntities: 12 },
        { value: 'mobile', unmatchedEntities: 4 },
        { value: 'ml-team', unmatchedEntities: 1 },
      ],
    },
    subsets: [],
  },
  'aws-ec2': {
    dataStream: 'metrics-aws.ec2_metrics-*',
    identifierField: 'aws.ec2.instance.id',
    description:
      'An AWS EC2 instance identified by aws.ec2.instance.id, collected by the AWS integration.',
    resolverField: 'aws.tags.Team',
    owners: [
      {
        id: 'owner-1',
        resolverValue: 'platform',
        ownerName: 'platform-team',
        email: 'platform@example.com',
        slack: '#platform-team',
        ownershipType: 'infrastructure',
      },
      {
        id: 'owner-2',
        resolverValue: 'sre',
        ownerName: 'sre-team',
        email: 'sre@example.com',
        slack: '#sre',
        ownershipType: 'operational',
      },
    ],
    coverage: {
      resolvedPercent: 41,
      resolvedCount: 83,
      totalCount: 203,
      unmatched: [
        { value: 'untagged', unmatchedEntities: 92 },
        { value: 'legacy', unmatchedEntities: 18 },
        { value: 'spike-2026-q1', unmatchedEntities: 10 },
      ],
    },
    subsets: [],
  },
};

const defaultPreset = (entityType: FakeEntityType): PresetSeed => ({
  dataStream: `metrics-${entityType.id}-*`,
  identifierField: `${entityType.id}.name`,
  description: `Auto-generated description for ${entityType.name}.`,
  resolverField: `${entityType.id}.labels.team`,
  owners: [],
  coverage: {
    resolvedPercent: 0,
    resolvedCount: 0,
    totalCount: Number.parseInt(entityType.entitiesCount.replace(/,/g, ''), 10) || 0,
    unmatched: [],
  },
  subsets: [],
});

/**
 * Build a draft for a given entity-type row in the table. The shape is the
 * single source of truth for every step of the wizard.
 */
export const buildFakeEntityTypeDraft = (entityType: FakeEntityType): EntityTypeDraft => {
  const preset: PresetSeed = PRESETS[entityType.id] ?? defaultPreset(entityType);

  return {
    entityType,
    general: {
      name: entityType.name,
      dataStream: preset.dataStream,
      identifierField: preset.identifierField,
      category: entityType.category,
      description: preset.description,
    },
    health: defaultHealth(),
    ownership: {
      resolverField: preset.resolverField,
      owners: preset.owners,
    },
    coveragePreview: preset.coverage,
    flyoutTabs: defaultFlyoutTabs(),
    subsets: preset.subsets,
  };
};

/**
 * Builder for a brand-new subset draft when the user clicks "Add a subset".
 * Seeds the override payloads from the parent entity-type draft so that
 * flipping the override toggle on shows the current parent values as the
 * starting point (the user then tweaks from there).
 */
export const buildBlankSubsetDraft = (parent: EntityTypeDraft): SubsetDraft => ({
  id: `subset-${Date.now()}`,
  name: '',
  description: '',
  enabled: true,
  filter: [
    {
      id: `cond-${Date.now()}`,
      field: '',
      operator: 'equals',
      value: '',
    },
  ],
  healthOverride: { enabled: false, signals: { ...parent.health } },
  ownershipOverride: {
    enabled: false,
    ownership: {
      resolverField: parent.ownership.resolverField,
      owners: parent.ownership.owners.map((owner) => ({ ...owner })),
    },
    coveragePreview: {
      ...parent.coveragePreview,
      unmatched: parent.coveragePreview.unmatched.map((unmatched) => ({ ...unmatched })),
    },
  },
  contentOverride: {
    enabled: false,
    flyoutTabs: parent.flyoutTabs.map((tab) => ({ ...tab })),
  },
});

export const buildBlankOwnerMapping = (): OwnerMapping => ({
  id: `owner-${Date.now()}`,
  resolverValue: '',
  ownerName: '',
  email: '',
  slack: '',
  ownershipType: 'operational',
});

export const buildBlankFilterCondition = (): FilterCondition => ({
  id: `cond-${Date.now()}`,
  field: '',
  operator: 'equals',
  value: '',
});
