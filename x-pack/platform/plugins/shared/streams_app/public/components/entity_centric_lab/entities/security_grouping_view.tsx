/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Security-approach table view — accordion-style grouping replicating
 * the look and feel of Security's Entity Analytics grouping (powered
 * by `@kbn/grouping`). Uses `EuiAccordion` with the same CSS class
 * names and styles so the result is visually identical, while keeping
 * the implementation simple (no ES aggregation adapter needed).
 *
 * Supports one or two levels of grouping:
 *   - 1 field  → parent accordions, each containing a table
 *   - 2 fields → parent accordions with child accordions inside,
 *                 each child containing a table
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { Entity, EntityCategoryId } from './fake_entities';
import { EntityDataGridSection } from './entities_data_grid';
import type { GroupByFieldDef } from './entity_group_by';
import {
  KUBERNETES_CLUSTER_FILTER_ALL,
  KUBERNETES_SUB_TYPE_ORDER,
  KubernetesClusterFilter,
  filterEntitiesByCluster,
  getKubernetesClusterNames,
} from './kubernetes_cluster_filter';
import {
  CLOUD_PROVIDER_FILTER_ALL,
  CloudProviderFilter,
  filterEntitiesByProvider,
} from './cloud_provider_filter';

// ---------------------------------------------------------------------------
// Bucket model
// ---------------------------------------------------------------------------

interface GroupBucket {
  readonly label: string;
  readonly entities: Entity[];
  readonly alertingCount: number;
  readonly category: EntityCategoryId;
  readonly children: GroupBucket[];
}

const buildBuckets = (
  entities: readonly Entity[],
  primaryField: GroupByFieldDef,
  secondaryField?: GroupByFieldDef
): GroupBucket[] => {
  const map = new Map<string, Entity[]>();
  for (const entity of entities) {
    const label = primaryField.valueOf(entity);
    const list = map.get(label) ?? [];
    list.push(entity);
    map.set(label, list);
  }

  const order = primaryField.canonicalOrder;
  const entries = [...map.entries()];
  if (order) {
    const fallback = order.size;
    entries.sort((a, b) => {
      const posA = order.get(a[0]) ?? fallback;
      const posB = order.get(b[0]) ?? fallback;
      if (posA !== posB) return posA - posB;
      return a[0].localeCompare(b[0]);
    });
  } else {
    entries.sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  }
  return entries.map(([label, groupEntities]) => {
    const category = groupEntities[0]?.category ?? ('kubernetes' as EntityCategoryId);
    // Children are built via recursive `buildBuckets` which already respects
    // `secondaryField.canonicalOrder` (e.g. TYPE_CANONICAL_ORDER for K8s
    // sub-types), so no extra re-sorting is needed.
    const children = secondaryField ? buildBuckets(groupEntities, secondaryField) : [];
    return {
      label,
      entities: groupEntities,
      alertingCount: groupEntities.filter((e) => e.alerts && e.alerts.active > 0).length,
      category,
      children,
    };
  });
};

/**
 * Sort buckets by the canonical Kubernetes sub-type order.
 * Handles both `subType` labels ("Pods") and `entity.type` labels ("K8s pod").
 */
const sortByK8sOrder = (buckets: GroupBucket[]): GroupBucket[] => {
  const subTypeOrder = new Map(KUBERNETES_SUB_TYPE_ORDER.map((label, idx) => [label, idx]));
  const typeOrder = new Map<string, number>([
    ['K8s cluster', 0],
    ['K8s node', 1],
    ['K8s namespace', 2],
    ['K8s deployment', 3],
    ['K8s pod', 4],
    ['K8s container', 5],
  ]);
  const fallback = subTypeOrder.size;
  return [...buckets].sort((a, b) => {
    const posA = subTypeOrder.get(a.label) ?? typeOrder.get(a.label) ?? fallback;
    const posB = subTypeOrder.get(b.label) ?? typeOrder.get(b.label) ?? fallback;
    if (posA !== posB) return posA - posB;
    return a.label.localeCompare(b.label);
  });
};

// ---------------------------------------------------------------------------
// Styles — replicate @kbn/grouping's groupingContainerCss
// ---------------------------------------------------------------------------

const containerCss = (borderThin: string) => css`
  .groupingAccordionForm > .euiAccordion__childWrapper > .euiAccordion__children {
    margin-left: 8px;
    margin-right: 8px;
    border-left: ${borderThin};
    border-right: ${borderThin};
    border-bottom: ${borderThin};
    border-radius: 0 0 6px 6px;
  }
  .groupingAccordionForm > .euiAccordion__triggerWrapper {
    border-bottom: ${borderThin};
    border-left: ${borderThin};
    border-right: ${borderThin};
    border-radius: 6px;
    min-height: 78px;
    padding-left: 16px;
    padding-right: 16px;
  }
  .groupingAccordionForm {
    border-top: ${borderThin};
    border-bottom: none;
    border-radius: 6px;
  }
`;

const childAccordionCss = (borderThin: string) => css`
  border: ${borderThin};
  border-radius: 6px;
  .euiAccordion__triggerWrapper {
    min-height: 52px;
    padding-left: 16px;
    padding-right: 16px;
  }
`;

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

const AccordionBadges = ({
  entityCount,
  alertingCount,
}: {
  entityCount: number;
  alertingCount: number;
}) => (
  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiBadge color="hollow">
        {i18n.translate(
          'xpack.streams.entityCentricLab.securityGrouping.stats.resourceCount',
          {
            defaultMessage: '{count, plural, one {# resource} other {# resources}}',
            values: { count: entityCount },
          }
        )}
      </EuiBadge>
    </EuiFlexItem>
    {alertingCount > 0 ? (
      <EuiFlexItem grow={false}>
        <EuiBadge color="danger">
          {i18n.translate(
            'xpack.streams.entityCentricLab.securityGrouping.stats.alertingCount',
            {
              defaultMessage:
                '{count, plural, one {# resource with active alerts} other {# resources with active alerts}}',
              values: { count: alertingCount },
            }
          )}
        </EuiBadge>
      </EuiFlexItem>
    ) : null}
  </EuiFlexGroup>
);

// ---------------------------------------------------------------------------
// Child (level-2) accordion — e.g. "K8s pod" inside "Kubernetes"
// ---------------------------------------------------------------------------

const ChildAccordion = ({
  bucket,
  parentIndex,
  childIndex,
  onSelectEntity,
  refreshTick,
}: {
  bucket: GroupBucket;
  parentIndex: number;
  childIndex: number;
  onSelectEntity: (entityName: string) => void;
  refreshTick?: number;
}) => {
  const { euiTheme } = useEuiTheme();
  const accordionId = useGeneratedHtmlId({
    prefix: 'securityGroupingChild',
    suffix: `${parentIndex}-${childIndex}`,
  });

  return (
    <EuiAccordion
      id={accordionId}
      initialIsOpen
      buttonContent={
        <EuiTitle size="xxs">
          <h5>{bucket.label}</h5>
        </EuiTitle>
      }
      extraAction={
        <AccordionBadges
          entityCount={bucket.entities.length}
          alertingCount={bucket.alertingCount}
        />
      }
      paddingSize="m"
      css={childAccordionCss(euiTheme.border.thin)}
      data-test-subj={`securityGrouping-child-${parentIndex}-${childIndex}`}
    >
      <EntityDataGridSection
        category={bucket.category}
        nested
        borderless
        rows={bucket.entities}
        onSelectEntity={onSelectEntity}
        refreshTick={refreshTick}
      />
    </EuiAccordion>
  );
};

// ---------------------------------------------------------------------------
// Top-level (level-1) accordion — e.g. "Kubernetes"
// ---------------------------------------------------------------------------

const GroupAccordion = ({
  bucket,
  index,
  onSelectEntity,
  refreshTick,
  categoryScope,
}: {
  bucket: GroupBucket;
  index: number;
  onSelectEntity: (entityName: string) => void;
  refreshTick?: number;
  categoryScope?: EntityCategoryId;
}) => {
  const accordionId = useGeneratedHtmlId({
    prefix: 'securityGrouping',
    suffix: String(index),
  });

  const isK8s = bucket.category === 'kubernetes';
  const isCloud = bucket.category === 'cloud';
  const hasChildren = bucket.children.length > 0;

  // Kubernetes cluster filter — inline, same as the other views.
  const [clusterFilter, setClusterFilter] = useState<string>(KUBERNETES_CLUSTER_FILTER_ALL);
  const clusterNames = useMemo(
    () => (isK8s ? getKubernetesClusterNames(bucket.entities) : []),
    [isK8s, bucket.entities]
  );

  // Cloud provider filter — mirrors the K8s cluster filter.
  const [providerFilter, setProviderFilter] = useState<string>(CLOUD_PROVIDER_FILTER_ALL);

  const visibleEntities = useMemo(() => {
    let result = bucket.entities;
    if (isK8s) {
      result = filterEntitiesByCluster(result, clusterFilter, clusterNames) as Entity[];
    }
    if (isCloud) {
      result = filterEntitiesByProvider(result, providerFilter) as Entity[];
    }
    return result;
  }, [isK8s, isCloud, bucket.entities, clusterFilter, clusterNames, providerFilter]);
  const visibleAlertingCount = useMemo(
    () => visibleEntities.filter((e) => e.alerts && e.alerts.active > 0).length,
    [visibleEntities]
  );

  // When a filter is active, rebuild child buckets from filtered entities.
  const needsChildRebuild =
    (isK8s && clusterFilter !== KUBERNETES_CLUSTER_FILTER_ALL) ||
    (isCloud && providerFilter !== CLOUD_PROVIDER_FILTER_ALL);
  const visibleChildren = useMemo(() => {
    if (!hasChildren) return [];
    if (!needsChildRebuild) return bucket.children;
    const childMap = new Map<string, Entity[]>();
    for (const entity of visibleEntities) {
      const key = entity.subType ?? entity.type;
      const list = childMap.get(key) ?? [];
      list.push(entity);
      childMap.set(key, list);
    }
    const rebuilt = [...childMap.entries()]
      .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
      .map(([label, ents]) => ({
        label,
        entities: ents,
        alertingCount: ents.filter((e) => e.alerts && e.alerts.active > 0).length,
        category: ents[0]?.category ?? ('kubernetes' as EntityCategoryId),
        children: [] as GroupBucket[],
      }));
    // Apply canonical K8s ordering when applicable.
    return isK8s ? sortByK8sOrder(rebuilt) : rebuilt;
  }, [hasChildren, needsChildRebuild, isK8s, bucket.children, visibleEntities]);

  return (
    <EuiAccordion
      id={accordionId}
      initialIsOpen
      className="groupingAccordionForm"
      buttonContent={
        <EuiTitle size="xs">
          <h4>{bucket.label}</h4>
        </EuiTitle>
      }
      extraAction={
        <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
          {isK8s && clusterNames.length > 0 && categoryScope !== 'kubernetes' ? (
            <EuiFlexItem grow={false}>
              <KubernetesClusterFilter
                clusterNames={clusterNames}
                value={clusterFilter}
                onChange={setClusterFilter}
              />
            </EuiFlexItem>
          ) : null}
          {isCloud && categoryScope !== 'cloud' ? (
            <EuiFlexItem grow={false}>
              <CloudProviderFilter value={providerFilter} onChange={setProviderFilter} />
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem grow={false}>
            <AccordionBadges
              entityCount={visibleEntities.length}
              alertingCount={visibleAlertingCount}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      paddingSize="m"
      data-test-subj={`securityGrouping-accordion-${index}`}
    >
      {visibleChildren.length > 0 ? (
        <>
          {visibleChildren.map((child, childIndex) => (
            <React.Fragment key={child.label}>
              {childIndex > 0 ? <EuiSpacer size="m" /> : null}
              <ChildAccordion
                bucket={child}
                parentIndex={index}
                childIndex={childIndex}
                onSelectEntity={onSelectEntity}
                refreshTick={refreshTick}
              />
            </React.Fragment>
          ))}
        </>
      ) : (
        <EntityDataGridSection
          category={bucket.category}
          nested
          rows={visibleEntities}
          onSelectEntity={onSelectEntity}
          refreshTick={refreshTick}
        />
      )}
    </EuiAccordion>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface Props {
  readonly entities: readonly Entity[];
  readonly onSelectEntity: (entityName: string) => void;
  readonly groupByFields: readonly GroupByFieldDef[];
  readonly activeGroupBy: readonly string[];
  readonly refreshTick?: number;
  /** When set, the page is scoped to this category — inline filters for
   *  that category (e.g. K8s cluster picker) are hidden because a
   *  page-level equivalent is already in the toolbar. */
  readonly categoryScope?: EntityCategoryId;
}

export const SecurityGroupingView = ({
  entities,
  onSelectEntity,
  groupByFields,
  activeGroupBy,
  refreshTick,
  categoryScope,
}: Props) => {
  const { euiTheme } = useEuiTheme();
  const isUngrouped = activeGroupBy.length === 0;

  const primaryField = useMemo(
    () =>
      isUngrouped
        ? undefined
        : groupByFields.find((f) => f.id === activeGroupBy[0]) ?? groupByFields[0],
    [groupByFields, activeGroupBy, isUngrouped]
  );

  const secondaryField = useMemo(
    () =>
      activeGroupBy.length > 1
        ? groupByFields.find((f) => f.id === activeGroupBy[1])
        : undefined,
    [groupByFields, activeGroupBy]
  );

  const buckets = useMemo(
    () => (primaryField ? buildBuckets(entities, primaryField, secondaryField) : []),
    [entities, primaryField, secondaryField]
  );

  const handleSelectEntity = useCallback(
    (name: string) => onSelectEntity(name),
    [onSelectEntity]
  );

  // Flat table when no grouping is selected — no section header.
  if (isUngrouped) {
    const category: EntityCategoryId =
      entities.length > 0 ? entities[0].category : 'kubernetes';
    return (
      <EntityDataGridSection
        category={category}
        nested
        rows={entities}
        onSelectEntity={handleSelectEntity}
        refreshTick={refreshTick}
      />
    );
  }

  return (
    <div css={containerCss(euiTheme.border.thin)}>
      {buckets.map((bucket, index) => (
        <React.Fragment key={bucket.label}>
          <GroupAccordion
            bucket={bucket}
            index={index}
            onSelectEntity={handleSelectEntity}
            refreshTick={refreshTick}
            categoryScope={categoryScope}
          />
          {index < buckets.length - 1 ? <EuiSpacer size="s" /> : null}
        </React.Fragment>
      ))}
    </div>
  );
};
