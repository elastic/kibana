/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiFlexItemProps } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSkeletonRectangle,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { capitalize } from 'lodash';
import { getTimeSizeAndUnitLabel } from '../../helpers/format_size_units';

export interface LifecyclePhase {
  color?: string;
  label?: string;
  size?: string;
  grow: EuiFlexItemProps['grow'];
  isDelete?: boolean;
  timelineValue?: string;
}

interface DataLifecycleSummaryProps {
  phases: LifecyclePhase[];
  loading?: boolean;
}

export const DataLifecycleSummary = ({ phases, loading = false }: DataLifecycleSummaryProps) => {
  const isRetentionInfinite = !phases.some((p) => p.isDelete);

  const phasesWithPosition = phases.map((phase, index) => ({
    ...phase,
    isFirst: index === 0,
    isLast: isRetentionInfinite ? index === phases.length - 1 : phase.isDelete,
    hasNextPhase: index < phases.length - 1,
  }));

  const showSkeleton = loading && phases.length === 0;

  return (
    <EuiPanel hasShadow={false} hasBorder grow>
      <EuiFlexGroup
        direction="column"
        gutterSize="s"
        justifyContent="spaceBetween"
        css={{ height: '100%' }}
      >
        <EuiPanel hasShadow={false} hasBorder={false} paddingSize="s">
          <EuiText>
            <h5 data-test-subj="dataLifecycleSummary-title">
              {i18n.translate('xpack.streams.streamDetailLifecycle.dataLifecycle', {
                defaultMessage: 'Data lifecycle',
              })}
            </h5>
          </EuiText>
        </EuiPanel>

        <EuiPanel grow hasShadow={false} hasBorder={false} paddingSize="s">
          {showSkeleton ? (
            <EuiSkeletonRectangle
              width="100%"
              height={50}
              borderRadius="s"
              css={{ marginBottom: 35 }}
              data-test-subj="dataLifecycleSummary-skeleton"
            />
          ) : (
            <EuiFlexGroup direction="row" gutterSize="none" responsive={false}>
              {phasesWithPosition.map((phase, index) => (
                <EuiFlexItem key={index} grow={phase.grow}>
                  <LifecyclePhaseBar
                    color={phase.color}
                    label={phase.label}
                    size={phase.size}
                    isDelete={phase.isDelete}
                    isFirst={phase.isFirst}
                    isLast={phase.isLast}
                    timelineValue={phase.timelineValue}
                    hasNextPhase={phase.hasNextPhase}
                  />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          )}
        </EuiPanel>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

const LifecyclePhaseBar = ({
  color,
  label,
  size,
  isDelete = false,
  isFirst = false,
  isLast = false,
  timelineValue,
  hasNextPhase = false,
}: {
  color?: string;
  label?: string;
  size?: string;
  isDelete?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  timelineValue?: string;
  hasNextPhase?: boolean;
}) => {
  const { euiTheme } = useEuiTheme();

  const phaseColor = isDelete ? euiTheme.colors.borderBasePlain : color;

  const getBorderRadius = () => {
    if (isDelete) {
      return hasNextPhase ? '0px' : '0px 4px 4px 0px';
    }
    if (isFirst && isLast) {
      return '4px';
    }
    if (isFirst) {
      return '4px 0px 0px 4px';
    }
    if (isLast || !hasNextPhase) {
      return '0px 4px 4px 0px';
    }
    return '0px';
  };

  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiPanel
          paddingSize="s"
          hasBorder={false}
          hasShadow={false}
          css={{
            backgroundColor: phaseColor,
            margin: '0',
            borderRadius: getBorderRadius(),
            borderRight:
              !isDelete && hasNextPhase
                ? `1px solid ${euiTheme.colors.backgroundBasePlain}`
                : undefined,
            minHeight: '50px',
            ...(isDelete && {
              minWidth: '50px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }),
          }}
          grow={false}
        >
          {isDelete ? (
            <EuiIcon size="m" type="trash" data-test-subj="dataLifecycle-delete-icon" />
          ) : (
            <EuiFlexGroup direction="column" gutterSize="none" alignItems="flexStart">
              <EuiText
                size="xs"
                color={euiTheme.colors.plainDark}
                data-test-subj={`lifecyclePhase-${label}-name`}
              >
                <b>{capitalize(label)}</b>
              </EuiText>
              {size && (
                <EuiText
                  size="xs"
                  color={euiTheme.colors.plainDark}
                  data-test-subj={`lifecyclePhase-${label}-size`}
                >
                  {size}
                </EuiText>
              )}
            </EuiFlexGroup>
          )}
        </EuiPanel>
        <EuiPanel
          paddingSize="s"
          borderRadius="none"
          hasBorder={false}
          hasShadow={false}
          grow={false}
          css={{
            paddingBottom: '5px',
            ...(!isDelete && {
              borderRight: `1px solid ${euiTheme.colors.darkShade}`,
            }),
          }}
        />
      </EuiFlexGroup>

      {!isDelete && (
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiPanel
            paddingSize="xs"
            css={{
              marginRight: timelineValue ? '-40px' : '-10px',
              width: timelineValue ? '80px' : '20px',
            }}
            grow={false}
            hasBorder={false}
            hasShadow={false}
          >
            <EuiText textAlign="center" size="xs" color="subdued">
              {timelineValue ? getTimeSizeAndUnitLabel(timelineValue) : '∞'}
            </EuiText>
          </EuiPanel>
        </EuiFlexGroup>
      )}
    </>
  );
};

const DELETE_PHASE: LifecyclePhase = {
  grow: false,
  isDelete: true,
};

export function buildLifecyclePhases({
  label,
  color,
  size,
  retentionPeriod,
}: {
  label: string;
  color: string;
  size?: string;
  retentionPeriod?: string;
}): LifecyclePhase[] {
  const phases: LifecyclePhase[] = [
    {
      color,
      label,
      size,
      grow: true,
      timelineValue: retentionPeriod,
    },
  ];

  // Only add delete phase if retention is not infinite
  if (retentionPeriod !== undefined) {
    phases.push(DELETE_PHASE);
  }

  return phases;
}
