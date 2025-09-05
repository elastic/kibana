/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiSpacer, useEuiTheme } from '@elastic/eui';
import React, { useEffect, useRef } from 'react';
import { useSelector } from '@xstate5/react';
import { useFirstMountState } from 'react-use/lib/useFirstMountState';
import type { StreamlangStepWithUIAttributesWithCustomIdentifier } from '@kbn/streamlang';
import { css } from '@emotion/react';
import type { StreamEnrichmentContextType } from '../../../state_management/stream_enrichment_state_machine';
import { useStreamEnrichmentSelector } from '../../../state_management/stream_enrichment_state_machine';
import { getStepPanelColour } from '../../../utils';
import { StepsListItem } from '../../steps_list';
import { WhereBlockConfiguration } from './configuration';
import { WhereBlockSummary } from './summary';
import { ConnectedNodesList } from './connected_nodes_list';
import { isRootStep } from '../../../state_management/steps_state_machine';
import type { RootLevelMap } from '../../../state_management/stream_enrichment_state_machine/utils';
import { BlockDisableOverlay } from '../block_disable_overlay';

export const WhereBlock = ({
  stepRef,
  level,
  stepUnderEdit,
  rootLevelMap,
}: {
  stepRef: StreamEnrichmentContextType['stepRefs'][number];
  level: number;
  rootLevelMap: RootLevelMap;
  stepUnderEdit?: StreamlangStepWithUIAttributesWithCustomIdentifier;
}) => {
  const { euiTheme } = useEuiTheme();
  const isFirstMount = useFirstMountState();
  const freshBlockRef = useRef<HTMLDivElement>(null);
  const isDraft = useSelector(stepRef, (snapshot) => snapshot.matches('draft'));
  const isEditing = useSelector(stepRef, (snapshot) => snapshot.matches({ configured: 'editing' }));
  const panelColour = getStepPanelColour(level);
  const isRootStepValue = useSelector(stepRef, (snapshot) => isRootStep(snapshot));

  const step = useSelector(stepRef, (snapshot) => snapshot.context.step);

  const childSteps = useStreamEnrichmentSelector((state) =>
    state.context.stepRefs.filter(
      (ref) => ref.getSnapshot().context.step.parentId === step.customIdentifier
    )
  );

  useEffect(() => {
    if (isFirstMount && (isDraft || isEditing) && freshBlockRef.current) {
      freshBlockRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
      });
    }
  }, [isDraft, isEditing, isFirstMount]);

  return (
    <>
      <EuiPanel
        paddingSize="m"
        hasShadow={false}
        color={(isDraft || isEditing) && isRootStepValue ? undefined : panelColour}
        css={
          isDraft || isEditing
            ? css`
                border: 1px solid ${euiTheme.colors.borderStrongPrimary};
              `
            : undefined
        }
      >
        {stepUnderEdit &&
          rootLevelMap.get(step.customIdentifier) !==
            rootLevelMap.get(stepUnderEdit.customIdentifier) && <BlockDisableOverlay />}
        {isDraft || isEditing ? (
          <WhereBlockConfiguration stepRef={stepRef} ref={freshBlockRef} />
        ) : (
          <WhereBlockSummary
            stepRef={stepRef}
            stepUnderEdit={stepUnderEdit}
            rootLevelMap={rootLevelMap}
          />
        )}
        {childSteps.length > 0 && (
          <>
            <EuiSpacer size="m" />
            <ConnectedNodesList>
              {childSteps.map((childStep) => (
                <li key={childStep.id}>
                  <StepsListItem
                    stepRef={childStep}
                    level={level + 1}
                    stepUnderEdit={stepUnderEdit}
                    rootLevelMap={rootLevelMap}
                  />
                </li>
              ))}
            </ConnectedNodesList>
            <EuiSpacer size="m" />
          </>
        )}
      </EuiPanel>
    </>
  );
};
