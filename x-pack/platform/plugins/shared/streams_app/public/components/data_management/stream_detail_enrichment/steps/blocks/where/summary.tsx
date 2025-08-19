/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme, EuiFlexGroup, EuiFlexItem, EuiText, EuiBadge } from '@elastic/eui';
import type { StreamlangStepWithUIAttributesWithCustomIdentifier } from '@kbn/streamlang';
import { getFilterOperator, getFilterValue } from '@kbn/streamlang';
import React from 'react';
import { useSelector } from '@xstate5/react';
import { css } from '@emotion/react';
import { AddStepButton } from '../../../add_step_button';
import type { StreamEnrichmentContextType } from '../../../state_management/stream_enrichment_state_machine';
import { StepContextMenu } from '../context_menu';
import type { RootLevelMap } from '../../../state_management/stream_enrichment_state_machine/utils';
import { BlockDisableOverlay } from '../block_disable_overlay';

export const WhereBlockSummary = ({
  stepRef,
  rootLevelMap,
  stepUnderEdit,
}: {
  stepRef: StreamEnrichmentContextType['stepRefs'][number];
  rootLevelMap: RootLevelMap;
  stepUnderEdit?: StreamlangStepWithUIAttributesWithCustomIdentifier;
}) => {
  const { euiTheme } = useEuiTheme();
  const step = useSelector(stepRef, (snapshot) => snapshot.context.step);
  // TODO: Summaries will need to support a fallback for complex syntax editor conditions
  const operator = getFilterOperator(step.where);
  const value = getFilterValue(step.where);
  const field = step.where.field;
  return (
    <EuiFlexGroup
      css={css`
        position: relative;
      `}
    >
      {/* The step under edit is part of the same root level hierarchy,
      and therefore won't be covered by a top level where block overlay */}
      {stepUnderEdit &&
        rootLevelMap.get(stepUnderEdit.customIdentifier) ===
          rootLevelMap.get(step.customIdentifier) && <BlockDisableOverlay />}
      <EuiFlexItem>
        <EuiFlexGroup alignItems="center" gutterSize="xs">
          <EuiFlexItem grow={false}>
            <EuiText
              size="s"
              style={{
                fontWeight: euiTheme.font.weight.bold,
              }}
            >
              {'WHERE'}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{field}</EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{operator}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{value}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs">
          <EuiFlexItem>
            <AddStepButton parentId={stepRef.id} mode="inline" />
          </EuiFlexItem>
          <EuiFlexItem>
            <StepContextMenu stepRef={stepRef} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
