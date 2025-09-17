/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme, EuiFlexGroup, EuiFlexItem, EuiText, EuiBadge } from '@elastic/eui';
import type { Condition, FilterCondition, StreamlangStepWithUIAttributes } from '@kbn/streamlang';
import {
  getFilterOperator,
  getFilterValue,
  isFilterConditionObject,
  isWhereBlock,
  operatorToHumanReadableNameMap,
} from '@kbn/streamlang';
import React from 'react';
import { useSelector } from '@xstate5/react';
import { css } from '@emotion/react';
import { CreateStepButton } from '../../../create_step_button';
import type { StreamEnrichmentContextType } from '../../../state_management/stream_enrichment_state_machine';
import { StepContextMenu } from '../context_menu';
import type { RootLevelMap } from '../../../state_management/stream_enrichment_state_machine/utils';
import { BlockDisableOverlay } from '../block_disable_overlay';

export const WhereBlockSummary = ({
  stepRef,
  rootLevelMap,
  stepUnderEdit,
  level,
}: {
  stepRef: StreamEnrichmentContextType['stepRefs'][number];
  rootLevelMap: RootLevelMap;
  stepUnderEdit?: StreamlangStepWithUIAttributes;
  level: number;
}) => {
  const step = useSelector(stepRef, (snapshot) => snapshot.context.step);
  const { euiTheme } = useEuiTheme();

  if (!isWhereBlock(step)) return null;

  const isFilterCondition = isFilterConditionObject(step.where);

  return (
    <EuiFlexGroup
      gutterSize="s"
      css={css`
        position: relative;
      `}
      alignItems="center"
    >
      {/* The step under edit is part of the same root level hierarchy,
      and therefore won't be covered by a top level where block overlay */}
      {stepUnderEdit &&
        rootLevelMap.get(stepUnderEdit.customIdentifier) ===
          rootLevelMap.get(step.customIdentifier) && <BlockDisableOverlay />}
      <EuiFlexItem
        css={css`
          // Facilitates text truncation
          overflow: hidden;
        `}
      >
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem
            grow={false}
            css={css`
              // Facilitates text truncation for the condition summary
              flex-shrink: 0;
            `}
          >
            <EuiText
              size="s"
              style={{
                fontWeight: euiTheme.font.weight.bold,
              }}
            >
              {'WHERE'}
            </EuiText>
          </EuiFlexItem>
          {isFilterCondition ? (
            <FilterSummary condition={step.where as FilterCondition} />
          ) : (
            <ComplexSummary condition={step.where} />
          )}
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem
        grow={false}
        css={css`
          // Facilitates text truncation for the condition summary
          flex-shrink: 0;
        `}
      >
        <EuiFlexGroup gutterSize="xs">
          <EuiFlexItem>
            <CreateStepButton parentId={stepRef.id} mode="inline" nestingDisabled={level >= 2} />
          </EuiFlexItem>
          <EuiFlexItem>
            <StepContextMenu stepRef={stepRef} stepUnderEdit={stepUnderEdit} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const FilterSummary = ({ condition }: { condition: FilterCondition }) => {
  const operator = getFilterOperator(condition);
  const value = getFilterValue(condition);
  const field = condition.field;

  return (
    <>
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow">{field}</EuiBadge>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {operatorToHumanReadableNameMap[operator as keyof typeof operatorToHumanReadableNameMap]}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow">{value?.toString()}</EuiBadge>
      </EuiFlexItem>
    </>
  );
};

const ComplexSummary = ({ condition }: { condition: Condition }) => {
  const summary = JSON.stringify(condition);
  return (
    <EuiFlexItem
      css={css`
        // Facilitates text truncation
        overflow: hidden;
      `}
    >
      <span className="eui-textTruncate">{summary}</span>
    </EuiFlexItem>
  );
};
