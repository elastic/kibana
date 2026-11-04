/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiBadge, EuiIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Entity } from './fake_entities';
import { entityAlertBadgePresentation } from './entity_alert_badge';
import {
  findK8sInventoryEntityByContext,
  getK8sPopoverContext,
  type K8sContextKey,
  type K8sPopoverContextEntry,
} from './kubernetes_hierarchy';

interface HexTileK8sContextActionsProps {
  readonly entity: Entity;
  readonly inventory: readonly Entity[];
  readonly onOpenEntity: (entityName: string) => void;
  readonly textColor: string;
  readonly borderColor: string;
  readonly borderWidth: string;
}

const seeContextActionLabel = (key: K8sContextKey): string => {
  switch (key) {
    case 'cluster':
      return i18n.translate(
        'xpack.streams.entityCentricLab.entities.tileTooltip.contextAction.seeCluster',
        { defaultMessage: 'See cluster' }
      );
    case 'namespace':
      return i18n.translate(
        'xpack.streams.entityCentricLab.entities.tileTooltip.contextAction.seeNamespace',
        { defaultMessage: 'See namespace' }
      );
    case 'node':
      return i18n.translate(
        'xpack.streams.entityCentricLab.entities.tileTooltip.contextAction.seeNode',
        { defaultMessage: 'See node' }
      );
    case 'deployment':
      return i18n.translate(
        'xpack.streams.entityCentricLab.entities.tileTooltip.contextAction.seeDeployment',
        { defaultMessage: 'See deployment' }
      );
    case 'pod':
      return i18n.translate(
        'xpack.streams.entityCentricLab.entities.tileTooltip.contextAction.seePod',
        { defaultMessage: 'See pod' }
      );
    default:
      return i18n.translate(
        'xpack.streams.entityCentricLab.entities.tileTooltip.contextAction.seeResource',
        { defaultMessage: 'See resource' }
      );
  }
};

const ContextActionRow = ({
  entry,
  targetEntity,
  onOpenEntity,
  textColor,
  borderColor,
  borderWidth,
  showTopBorder,
}: {
  readonly entry: K8sPopoverContextEntry;
  readonly targetEntity: Entity;
  readonly onOpenEntity: (entityName: string) => void;
  readonly textColor: string;
  readonly borderColor: string;
  readonly borderWidth: string;
  readonly showTopBorder: boolean;
}) => {
  const { color, tooltip } = entityAlertBadgePresentation(targetEntity);
  const actionLabel = seeContextActionLabel(entry.key);

  return (
    <button
      type="button"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        padding: '10px 14px',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        color: textColor,
        fontSize: 13,
        lineHeight: 1.3,
        textAlign: 'left',
        boxSizing: 'border-box',
        justifyContent: 'space-between',
        borderTop: showTopBorder ? `${borderWidth} solid ${borderColor}` : undefined,
      }}
      onClick={(event) => {
        event.stopPropagation();
        onOpenEntity(targetEntity.name);
      }}
      data-test-subj={`entityCentricLabHealthTileTooltipContext-${entry.key}`}
      aria-label={i18n.translate(
        'xpack.streams.entityCentricLab.entities.tileTooltip.contextAction.ariaLabel',
        {
          defaultMessage: '{action}, {name}, {alertHint}',
          values: {
            action: actionLabel,
            name: entry.value,
            alertHint: tooltip,
          },
        }
      )}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
        <EuiIcon type="arrowRight" size="m" color="text" aria-hidden />
        <span style={{ flex: 1, minWidth: 0 }}>{actionLabel}</span>
      </span>
      <EuiToolTip content={tooltip} disableScreenReaderOutput>
        <EuiBadge color={color}>{entry.value}</EuiBadge>
      </EuiToolTip>
    </button>
  );
};

export const HexTileK8sContextActions = ({
  entity,
  inventory,
  onOpenEntity,
  textColor,
  borderColor,
  borderWidth,
}: HexTileK8sContextActionsProps) => {
  const rows = useMemo(() => {
    return getK8sPopoverContext(entity).flatMap((entry) => {
      const targetEntity = findK8sInventoryEntityByContext(
        inventory,
        entry.key,
        entry.value,
        entity
      );
      return targetEntity ? [{ entry, targetEntity }] : [];
    });
  }, [entity, inventory]);

  if (rows.length === 0) {
    return null;
  }

  return (
    <div data-test-subj="entityCentricLabHealthTileTooltipContextActions">
      {rows.map(({ entry, targetEntity }, index) => (
        <ContextActionRow
          key={entry.key}
          entry={entry}
          targetEntity={targetEntity}
          onOpenEntity={onOpenEntity}
          textColor={textColor}
          borderColor={borderColor}
          borderWidth={borderWidth}
          showTopBorder={index > 0}
        />
      ))}
    </div>
  );
};
