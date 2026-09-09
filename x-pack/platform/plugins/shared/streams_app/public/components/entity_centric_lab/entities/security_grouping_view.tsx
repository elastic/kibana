/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  useGeneratedHtmlId,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { Entity, EntityCategoryId } from './fake_entities';
import { getCategoryDescriptor } from './fake_entities';
import { EntityDataGridSection } from './entities_data_grid';
import type { GroupByFieldDef } from './entity_group_by';

// ---------------------------------------------------------------------------
// Group a flat entity list into labelled buckets
// ---------------------------------------------------------------------------

interface GroupBucket {
  readonly label: string;
  readonly entities: Entity[];
  readonly alertingCount: number;
  readonly children: GroupBucket[];
}

const buildBuckets = (
  entities: readonly Entity[],
  groupField: GroupByFieldDef,
  subField?: GroupByFieldDef
): GroupBucket[] => {
  const map = new Map<string, Entity[]>();
  for (const entity of entities) {
    const label = groupField.valueOf(entity);
    const list = map.get(label) ?? [];
    list.push(entity);
    map.set(label, list);
  }

  return [...map.entries()]
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .map(([label, groupEntities]) => ({
      label,
      entities: groupEntities,
      alertingCount: groupEntities.filter((e) => e.alerts && e.alerts.active > 0).length,
      children: subField ? buildBuckets(groupEntities, subField) : [],
    }));
};

// ---------------------------------------------------------------------------
// Badges shared between parent and child accordions
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
                '{count, plural, one {# resource with firing alerts} other {# resources with firing alerts}}',
              values: { count: alertingCount },
            }
          )}
        </EuiBadge>
      </EuiFlexItem>
    ) : null}
  </EuiFlexGroup>
);

// ---------------------------------------------------------------------------
// CSS — minimal styling with subtle dividers only
// ---------------------------------------------------------------------------

const groupAccordionCss = (borderThin: string) => css`
  border: ${borderThin};
  border-radius: 6px;
  padding: 16px;

  .euiAccordion__triggerWrapper {
    padding: 0;
    padding-bottom: 12px;
    margin-bottom: 12px;
    border-bottom: ${borderThin};
  }
`;

const childAccordionCss = css`
  .euiAccordion__triggerWrapper {
    padding: 8px 0;
  }
`;

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
  const accordionId = useGeneratedHtmlId({
    prefix: 'securityGroupingChild',
    suffix: `${parentIndex}-${childIndex}`,
  });
  const { euiTheme } = useEuiTheme();

  const category: EntityCategoryId = useMemo(() => {
    if (bucket.entities.length === 0) return 'kubernetes';
    const first = bucket.entities[0];
    return (getCategoryDescriptor(first.type)?.categoryId ?? first.type) as EntityCategoryId;
  }, [bucket.entities]);

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
      css={childAccordionCss}
      data-test-subj={`securityGrouping-child-${parentIndex}-${childIndex}`}
    >
      <EntityDataGridSection
        category={category}
        nested
        rows={bucket.entities}
        onSelectEntity={onSelectEntity}
        refreshTick={refreshTick}
        borderless
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
}: {
  bucket: GroupBucket;
  index: number;
  onSelectEntity: (entityName: string) => void;
  refreshTick?: number;
}) => {
  const accordionId = useGeneratedHtmlId({
    prefix: 'securityGrouping',
    suffix: String(index),
  });
  const { euiTheme } = useEuiTheme();

  const category: EntityCategoryId = useMemo(() => {
    if (bucket.entities.length === 0) return 'kubernetes';
    const first = bucket.entities[0];
    return (getCategoryDescriptor(first.type)?.categoryId ?? first.type) as EntityCategoryId;
  }, [bucket.entities]);

  const hasChildren = bucket.children.length > 0;

  return (
    <EuiAccordion
      id={accordionId}
      initialIsOpen
      buttonContent={
        <EuiTitle size="s">
          <h3>{bucket.label}</h3>
        </EuiTitle>
      }
      extraAction={
        <AccordionBadges
          entityCount={bucket.entities.length}
          alertingCount={bucket.alertingCount}
        />
      }
      paddingSize="m"
      css={groupAccordionCss(euiTheme.border.thin)}
      data-test-subj={`securityGrouping-accordion-${index}`}
    >
      {hasChildren ? (
        <>
          {bucket.children.map((child, childIndex) => (
            <React.Fragment key={child.label}>
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
          category={category}
          nested
          rows={bucket.entities}
          onSelectEntity={onSelectEntity}
          refreshTick={refreshTick}
          borderless
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
}

export const SecurityGroupingView = ({
  entities,
  onSelectEntity,
  groupByFields,
  activeGroupBy,
  refreshTick,
}: Props) => {
  const primaryField = useMemo(
    () => groupByFields.find((f) => f.id === activeGroupBy[0]) ?? groupByFields[0],
    [groupByFields, activeGroupBy]
  );

  const secondaryField = useMemo(
    () =>
      activeGroupBy.length > 1
        ? groupByFields.find((f) => f.id === activeGroupBy[1])
        : undefined,
    [groupByFields, activeGroupBy]
  );

  const buckets = useMemo(
    () => buildBuckets(entities, primaryField, secondaryField),
    [entities, primaryField, secondaryField]
  );

  const handleSelectEntity = useCallback(
    (name: string) => onSelectEntity(name),
    [onSelectEntity]
  );

  return (
    <div>
      {buckets.map((bucket, index) => (
        <React.Fragment key={bucket.label}>
          <GroupAccordion
            bucket={bucket}
            index={index}
            onSelectEntity={handleSelectEntity}
            refreshTick={refreshTick}
          />
          {index < buckets.length - 1 ? <EuiSpacer size="s" /> : null}
        </React.Fragment>
      ))}
    </div>
  );
};
