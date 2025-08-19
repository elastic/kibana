/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTimelineItem } from '@elastic/eui';
import { css } from '@emotion/react';
import { useSelector } from '@xstate5/react';
import type { StepConfigurationProps } from './processors';
import { ActionConfiguration } from './processors';
import { ProcessorStatusIndicator } from './processor_status_indicator';
import { useStreamEnrichmentSelector } from './state_management/stream_enrichment_state_machine';
import { WhereBlock } from './conditions';

export const StepsListItem = (props: StepConfigurationProps) => {
  const step = useSelector(props.stepRef, (snapshot) => snapshot.context.step);

  const childSteps = useStreamEnrichmentSelector((state) =>
    state.context.stepRefs.filter(
      (ref) => ref.getSnapshot().context.step.parentId === step.customIdentifier
    )
  );
  const isWhereBlock = 'where' in step && !('action' in step);

  // TODO: Only do status indicator for processors
  return (
    <EuiTimelineItem
      verticalAlign="top"
      icon={<ProcessorStatusIndicator stepRef={props.stepRef} />}
      css={css`
        [class*='euiTimelineItemEvent'] {
          min-width: 0;
        }
        [class*='euiTimelineItemIcon-top'] {
          translate: 0 9px; // (50px - 32px) / 2 => Height of the block minus the avatar size to center the item
        }
      `}
    >
      {isWhereBlock ? (
        <WhereBlock stepRef={props.stepRef} childSteps={childSteps} />
      ) : (
        <ActionConfiguration {...props} />
      )}
    </EuiTimelineItem>
  );
};
