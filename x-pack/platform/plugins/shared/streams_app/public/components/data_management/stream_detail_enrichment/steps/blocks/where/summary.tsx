/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { isConditionBlock } from '@kbn/streamlang';
import { useSelector } from '@xstate/react';
import React from 'react';
import { ConditionDisplay } from '../../../../shared';
import { CreateStepButton } from '../../../create_step_button';
import type { StepConfigurationProps } from '../../steps_list';
import { BlockDisableOverlay } from '../block_disable_overlay';
import { StepContextMenu } from '../context_menu';
import { DragHandle } from '../../draggable_step_wrapper';

interface WhereBlockSummaryProps extends StepConfigurationProps {
  onClick?: () => void;
}

export const WhereBlockSummary = ({
  stepRef,
  rootLevelMap,
  stepUnderEdit,
  level,
  isFirstStepInLevel,
  isLastStepInLevel,
  readOnly = false,
  onClick,
}: WhereBlockSummaryProps) => {
  const step = useSelector(stepRef, (snapshot) => snapshot.context.step);

  const handleTitleClick = (event?: React.MouseEvent) => {
    event?.stopPropagation();
    stepRef.send({ type: 'step.edit' });
  };

  if (!isConditionBlock(step)) return null;

  return (
    <EuiFlexGroup
      gutterSize="s"
      css={css`
        position: relative;
        // Pointer events are disabled in order to "pass-through" hover events
        // and let the background condition container handle them.
        // Pointer events are selectively re-enabled on child elements
        // that require interaction.
        pointer-events: none;
      `}
      alignItems="center"
    >
      {/* The step under edit is part of the same root level hierarchy,
      and therefore won't be covered by a top level where block overlay */}
      {stepUnderEdit &&
        rootLevelMap.get(stepUnderEdit.customIdentifier) ===
          rootLevelMap.get(step.customIdentifier) && <BlockDisableOverlay />}
      {!readOnly && (
        <EuiFlexItem
          grow={false}
          css={css`
            pointer-events: all;
          `}
        >
          <DragHandle />
        </EuiFlexItem>
      )}
      <EuiFlexItem
        css={css`
          // Facilitates text truncation
          overflow: hidden;
        `}
        onClick={onClick}
      >
        <ConditionDisplay
          condition={step.condition}
          showKeyword={true}
          keyword="WHERE"
          keywordWrapper={(children) => (
            <EuiToolTip
              position="top"
              content={i18n.translate(
                'xpack.streams.streamDetailEnrichment.whereBlockSummary.editConditionTooltip',
                {
                  defaultMessage: 'Edit condition',
                }
              )}
            >
              <EuiButtonEmpty
                css={css`
                  pointer-events: all;
                `}
                onClick={handleTitleClick}
                color="text"
                size="xs"
                aria-label={i18n.translate(
                  'xpack.streams.streamDetailEnrichment.whereBlockSummary.editConditionLabel',
                  {
                    defaultMessage: 'Edit condition',
                  }
                )}
                data-test-subj="streamsAppDetailEnrichmentConditionTitleEditButton"
              >
                {children}
              </EuiButtonEmpty>
            </EuiToolTip>
          )}
        />
      </EuiFlexItem>

      {!readOnly && (
        <EuiFlexItem
          grow={false}
          css={css`
            // Facilitates text truncation for the condition summary
            flex-shrink: 0;
            pointer-events: all;
          `}
        >
          <EuiFlexGroup gutterSize="none">
            <CreateStepButton parentId={stepRef.id} mode="inline" nestingDisabled={level >= 2} />
            <StepContextMenu
              stepRef={stepRef}
              stepUnderEdit={stepUnderEdit}
              isFirstStepInLevel={isFirstStepInLevel}
              isLastStepInLevel={isLastStepInLevel}
            />
          </EuiFlexGroup>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
