/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { StreamlangStepWithUIAttributes } from '@kbn/streamlang';
import { isWhereBlock } from '@kbn/streamlang';
import React from 'react';
import { useSelector } from '@xstate5/react';
import { css } from '@emotion/react';
import { CreateStepButton } from '../../../create_step_button';
import type { StreamEnrichmentContextType } from '../../../state_management/stream_enrichment_state_machine';
import { StepContextMenu } from '../context_menu';
import type { RootLevelMap } from '../../../state_management/stream_enrichment_state_machine/utils';
import { BlockDisableOverlay } from '../block_disable_overlay';
import { ConditionDisplay } from '../../../../shared';

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

  if (!isWhereBlock(step)) return null;

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
        <ConditionDisplay condition={step.where} showKeyword={true} keyword="WHERE" />
      </EuiFlexItem>

      <EuiFlexItem
        grow={false}
        css={css`
          // Facilitates text truncation for the condition summary
          flex-shrink: 0;
        `}
      >
        <EuiFlexGroup gutterSize="none">
          <CreateStepButton parentId={stepRef.id} mode="inline" nestingDisabled={level >= 2} />
          <StepContextMenu stepRef={stepRef} stepUnderEdit={stepUnderEdit} />
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
