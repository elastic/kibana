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
import { useSelector } from '@xstate5/react';
import React from 'react';
import { ConditionDisplay } from '../../../../shared';
import { CreateStepButton } from '../../../create_step_button';
import type { StepConfigurationProps } from '../../steps_list';
import { BlockDisableOverlay } from '../block_disable_overlay';
import { StepContextMenu } from '../context_menu';

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
