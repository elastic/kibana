/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import React, { useEffect, useRef } from 'react';
import { useSelector } from '@xstate5/react';
import { useFirstMountState } from 'react-use/lib/useFirstMountState';
import { css } from '@emotion/react';
import useToggle from 'react-use/lib/useToggle';
import type { StreamlangStepWithUIAttributes } from '@kbn/streamlang';
import type { StreamEnrichmentContextType } from '../../../state_management/stream_enrichment_state_machine';
import { useStreamEnrichmentSelector } from '../../../state_management/stream_enrichment_state_machine';
import { getStepPanelColour } from '../../../utils';
import { StepsListItem } from '../../steps_list';
import { WhereBlockConfiguration } from './configuration';
import { WhereBlockSummary } from './summary';
import { ConnectedNodesList } from './connected_nodes_list';
import { isRootStep, isStepUnderEdit } from '../../../state_management/steps_state_machine';
import {
  collectDescendantIds,
  type RootLevelMap,
} from '../../../state_management/stream_enrichment_state_machine/utils';
import { BlockDisableOverlay } from '../block_disable_overlay';
import type { StepsProcessingSummaryMap } from '../../../state_management/use_steps_processing_summary';
import { NestedChildrenProcessingSummary } from './nested_children_processing_summary';

export const WhereBlock = ({
  stepRef,
  level,
  stepUnderEdit,
  rootLevelMap,
  stepsProcessingSummaryMap,
}: {
  stepRef: StreamEnrichmentContextType['stepRefs'][number];
  level: number;
  rootLevelMap: RootLevelMap;
  stepUnderEdit?: StreamlangStepWithUIAttributes;
  stepsProcessingSummaryMap?: StepsProcessingSummaryMap;
}) => {
  const { euiTheme } = useEuiTheme();
  const stepRefs = useStreamEnrichmentSelector((state) => state.context.stepRefs);
  const isFirstMount = useFirstMountState();
  const freshBlockRef = useRef<HTMLDivElement>(null);
  const isUnderEdit = useSelector(stepRef, (snapshot) => isStepUnderEdit(snapshot));

  const panelColour = getStepPanelColour(level);

  // Invert again
  const nestedSummaryPanelColour = getStepPanelColour(level + 1);
  const isRootStepValue = useSelector(stepRef, (snapshot) => isRootStep(snapshot));
  const [isExpanded, toggle] = useToggle(true);

  const step = useSelector(stepRef, (snapshot) => snapshot.context.step);

  const childSteps = useStreamEnrichmentSelector((state) =>
    state.context.stepRefs.filter(
      (ref) => ref.getSnapshot().context.step.parentId === step.customIdentifier
    )
  );

  const hasChildren = childSteps.length > 0;

  // Only gather these for the summary if the block is collapsed
  const descendantIds = !isExpanded
    ? collectDescendantIds(step.customIdentifier, stepRefs)
    : undefined;

  useEffect(() => {
    if (isFirstMount && isUnderEdit && freshBlockRef.current) {
      freshBlockRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
      });
    }
  }, [isFirstMount, isUnderEdit]);

  return (
    <>
      <EuiPanel
        data-test-subj="streamsAppConditionBlock"
        paddingSize="m"
        hasShadow={false}
        color={isUnderEdit && isRootStepValue ? undefined : panelColour}
        css={
          isUnderEdit
            ? css`
                border: 1px solid ${euiTheme.colors.borderStrongPrimary};
                box-sizing: border-box;
              `
            : css`
                border: ${euiTheme.border.thin};
              `
        }
      >
        {/* The step under edit isn't part of the same root level hierarchy,
         so we'll cover this item and all children */}
        {stepUnderEdit &&
          rootLevelMap.get(step.customIdentifier) !==
            rootLevelMap.get(stepUnderEdit.customIdentifier) && <BlockDisableOverlay />}
        {isUnderEdit ? (
          <WhereBlockConfiguration stepRef={stepRef} ref={freshBlockRef} />
        ) : (
          <EuiFlexGroup direction="column">
            <EuiFlexItem>
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem
                  grow={false}
                  css={
                    hasChildren
                      ? css`
                          margin-left: -${euiTheme.size.m};
                        `
                      : undefined
                  }
                >
                  {hasChildren ? (
                    <EuiButtonIcon
                      iconType={isExpanded ? 'arrowDown' : 'arrowRight'}
                      onClick={toggle}
                    />
                  ) : null}
                </EuiFlexItem>
                <EuiFlexItem>
                  <WhereBlockSummary
                    stepRef={stepRef}
                    stepUnderEdit={stepUnderEdit}
                    rootLevelMap={rootLevelMap}
                    level={level}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            {hasChildren && !isExpanded && (
              <EuiFlexItem>
                <EuiPanel color={nestedSummaryPanelColour} hasShadow={false} paddingSize="m">
                  <NestedChildrenProcessingSummary
                    childIds={descendantIds!}
                    stepsProcessingSummaryMap={stepsProcessingSummaryMap}
                  />
                </EuiPanel>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        )}
        {hasChildren && isExpanded && (
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
                    stepsProcessingSummaryMap={stepsProcessingSummaryMap}
                  />
                </li>
              ))}
            </ConnectedNodesList>
          </>
        )}
      </EuiPanel>
    </>
  );
};
