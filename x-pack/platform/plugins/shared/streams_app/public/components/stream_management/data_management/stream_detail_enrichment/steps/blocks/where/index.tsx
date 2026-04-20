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
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useSelector } from '@xstate/react';
import React, { useEffect, useRef } from 'react';
import { useFirstMountState } from 'react-use/lib/useFirstMountState';
import useToggle from 'react-use/lib/useToggle';
import { useConditionFilteringEnabled } from '../../../hooks/use_condition_filtering_enabled';
import { isRootStep, isStepUnderEdit } from '../../../state_management/steps_state_machine';
import {
  useInteractiveModeSelector,
  useSimulatorSelector,
  useStreamEnrichmentEvents,
} from '../../../state_management/stream_enrichment_state_machine';
import { collectDescendantStepIds } from '../../../state_management/utils';
import { getStepPanelColour } from '../../../utils';
import type { StepConfigurationProps } from '../../steps_list';
import { StepsListItem } from '../../steps_list';
import { BlockDisableOverlay } from '../block_disable_overlay';
import { CreateStepButton } from '../../../create_step_button';
import { EmptyBranchDropTarget } from '../../empty_branch_drop_target';
import { WhereBlockConfiguration } from './configuration';
import { ConnectedNodesList } from './connected_nodes_list';
import { NestedChildrenProcessingSummary } from './nested_children_processing_summary';
import { WhereBlockSummary } from './summary';

// Maximum condition nesting depth allowed in interactive mode (matches validate_structural check).
// Level is 0-indexed, so level >= 2 means a child condition would reach depth 3.
export const MAX_INTERACTIVE_NESTING_LEVEL = 2;

export const WhereBlock = (props: StepConfigurationProps) => {
  const { stepRef, stepUnderEdit, rootLevelMap, stepsProcessingSummaryMap, level } = props;
  const { euiTheme } = useEuiTheme();
  const stepRefs = useInteractiveModeSelector((state) => state.context.stepRefs);
  const isFirstMount = useFirstMountState();
  const freshBlockRef = useRef<HTMLDivElement>(null);
  const isUnderEdit = useSelector(stepRef, (snapshot) => isStepUnderEdit(snapshot));
  const step = useSelector(stepRef, (snapshot) => snapshot.context.step);
  const isSelected = useSimulatorSelector((state) => {
    return state.context.selectedConditionId === step.customIdentifier;
  });

  const panelColour = getStepPanelColour(level);

  // Invert again
  const nestedSummaryPanelColour = getStepPanelColour(level + 1);
  const isRootStepValue = useSelector(stepRef, (snapshot) => isRootStep(snapshot));
  const [isExpanded, toggle] = useToggle(true);

  const { childSteps, ifBranchSteps, elseBranchSteps } = useInteractiveModeSelector((state) => {
    const allChildren = state.context.stepRefs.filter(
      (ref) => ref.getSnapshot().context.step.parentId === step.customIdentifier
    );
    return {
      childSteps: allChildren,
      ifBranchSteps: allChildren.filter((ref) => ref.getSnapshot().context.step.branch !== 'else'),
      elseBranchSteps: allChildren.filter(
        (ref) => ref.getSnapshot().context.step.branch === 'else'
      ),
    };
  });
  const { filterSimulationByCondition, clearSimulationConditionFilter, reorderStepByDragDrop } =
    useStreamEnrichmentEvents();
  const hasChildren = childSteps.length > 0;
  const hasElseBranch = elseBranchSteps.length > 0;

  const filteringEnabled = useConditionFilteringEnabled(step.customIdentifier);

  const onClick = filteringEnabled
    ? () => {
        if (isSelected) {
          clearSimulationConditionFilter();
        } else {
          filterSimulationByCondition(step.customIdentifier);
        }
      }
    : undefined;

  // Only gather these for the summary if the block is collapsed
  const descendantIds = !isExpanded
    ? collectDescendantStepIds(
        stepRefs.map((ref) => ref.getSnapshot().context.step),
        step.customIdentifier
      )
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
        hasShadow={false}
        color={isUnderEdit && isRootStepValue ? undefined : panelColour}
        css={
          isUnderEdit
            ? css`
                position: relative;
                border: 1px solid ${euiTheme.colors.borderStrongPrimary};
                box-sizing: border-box;
              `
            : css`
                position: relative;
                border: ${isSelected
                  ? `1px solid ${euiTheme.colors.primary}`
                  : euiTheme.border.thin};
                background-color: ${isSelected ? euiTheme.colors.backgroundBasePrimary : 'inherit'};
                border-radius: ${euiTheme.size.s};
              `
        }
      >
        {/* The button that catches clicks on the empty
        space around the condition content in order to toggle
        filtering by the condition */}
        {filteringEnabled && !isUnderEdit && (
          <button
            onClick={onClick}
            css={css`
              position: absolute;
              top: 0;
              left: 0;
              height: 100%;
              width: 100%;
              cursor: pointer;
              border-radius: calc(${euiTheme.border.radius.medium} * 2);

              &:hover {
                background-color: ${!isSelected
                  ? euiTheme.colors.backgroundBaseSubdued
                  : 'inherit'};
                transition: background-color 50ms ease-in-out;
              }
            `}
          />
        )}
        {/* The step under edit isn't part of the same root level hierarchy,
         so we'll cover this item and all children */}
        {stepUnderEdit &&
          rootLevelMap.get(step.customIdentifier) !==
            rootLevelMap.get(stepUnderEdit.customIdentifier) && <BlockDisableOverlay />}
        {isUnderEdit ? (
          <WhereBlockConfiguration stepRef={stepRef} ref={freshBlockRef} />
        ) : (
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem>
              <EuiFlexGroup alignItems="center" gutterSize="s">
                {hasChildren ? (
                  <EuiFlexItem
                    grow={false}
                    css={css`
                      margin-left: -${euiTheme.size.xxs};
                    `}
                  >
                    <EuiButtonIcon
                      iconType={isExpanded ? 'chevronSingleDown' : 'chevronSingleRight'}
                      onClick={toggle}
                      aria-label={i18n.translate(
                        'xpack.streams.streamDetailView.managementTab.enrichment.toggleNestedStepsButtonAriaLabel',
                        {
                          defaultMessage: 'Toggle nested steps',
                        }
                      )}
                    />
                  </EuiFlexItem>
                ) : null}
                <EuiFlexItem
                  // Overflow is here to faciliate text truncation of long conditions in the summary
                  css={css`
                    overflow: hidden;
                  `}
                >
                  <WhereBlockSummary {...props} onClick={onClick} />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            {hasChildren && !isExpanded && (
              <EuiFlexItem>
                <EuiPanel color={nestedSummaryPanelColour} hasShadow={false} paddingSize="s">
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
            <EuiSpacer size="s" />
            {ifBranchSteps.length > 0 && (
              <ConnectedNodesList>
                {ifBranchSteps.map((childStep, index) => (
                  <li key={childStep.id}>
                    <StepsListItem
                      stepRef={childStep}
                      level={level + 1}
                      stepUnderEdit={stepUnderEdit}
                      rootLevelMap={rootLevelMap}
                      stepsProcessingSummaryMap={stepsProcessingSummaryMap}
                      isFirstStepInLevel={index === 0}
                      isLastStepInLevel={index === ifBranchSteps.length - 1}
                      readOnly={props.readOnly}
                    />
                  </li>
                ))}
              </ConnectedNodesList>
            )}
            {(hasElseBranch || !props.readOnly) && (
              <>
                <EuiSpacer size="s" />
                <EuiFlexGroup
                  gutterSize="s"
                  alignItems="center"
                  css={css`
                    position: relative;
                    z-index: 1;
                  `}
                >
                  <EuiFlexItem
                    grow={false}
                    css={css`
                      width: ${euiTheme.size.l};
                    `}
                  >
                    <EuiHorizontalRule margin="none" />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText
                      size="s"
                      css={css`
                        font-weight: ${euiTheme.font.weight.bold};
                      `}
                    >
                      {i18n.translate(
                        'xpack.streams.streamDetailView.managementTab.enrichment.elseBranchLabel',
                        { defaultMessage: 'ELSE' }
                      )}
                    </EuiText>
                  </EuiFlexItem>
                  {!props.readOnly && (
                    <EuiFlexItem grow={false}>
                      <CreateStepButton
                        parentId={step.customIdentifier}
                        branch="else"
                        mode="inline"
                        nestingDisabled={level >= MAX_INTERACTIVE_NESTING_LEVEL}
                      />
                    </EuiFlexItem>
                  )}
                  <EuiFlexItem>
                    <EuiHorizontalRule margin="none" />
                  </EuiFlexItem>
                </EuiFlexGroup>
                {hasElseBranch ? (
                  <>
                    <EuiSpacer size="s" />
                    <ConnectedNodesList>
                      {elseBranchSteps.map((childStep, index) => (
                        <li key={childStep.id}>
                          <StepsListItem
                            stepRef={childStep}
                            level={level + 1}
                            stepUnderEdit={stepUnderEdit}
                            rootLevelMap={rootLevelMap}
                            stepsProcessingSummaryMap={stepsProcessingSummaryMap}
                            isFirstStepInLevel={index === 0}
                            isLastStepInLevel={index === elseBranchSteps.length - 1}
                            readOnly={props.readOnly}
                          />
                        </li>
                      ))}
                    </ConnectedNodesList>
                  </>
                ) : (
                  !props.readOnly && (
                    <>
                      <EuiSpacer size="s" />
                      <EmptyBranchDropTarget
                        parentId={step.customIdentifier}
                        branch="else"
                        onDrop={reorderStepByDragDrop}
                      />
                    </>
                  )
                )}
              </>
            )}
          </>
        )}
      </EuiPanel>
    </>
  );
};
