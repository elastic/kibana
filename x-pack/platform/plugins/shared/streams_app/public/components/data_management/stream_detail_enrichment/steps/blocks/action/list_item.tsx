/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiText,
  EuiFlexItem,
  EuiBadge,
  EuiPanel,
  EuiTextTruncate,
  useEuiTheme,
  euiTextTruncate,
  EuiButtonEmpty,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isActionBlock } from '@kbn/streamlang';
import React from 'react';
import { css } from '@emotion/react';
import { useSelector } from '@xstate5/react';
import { ProcessorMetricBadges } from './processor_metrics';
import { getStepDescription } from './utils';
import type { ActionBlockProps } from '.';
import { ProcessorStatusIndicator } from './processor_status_indicator';
import { getStepPanelColour } from '../../../utils';
import { StepContextMenu } from '../context_menu';
import { BlockDisableOverlay } from '../block_disable_overlay';

export const ActionBlockListItem = ({
  processorMetrics,
  stepRef,
  level,
  stepUnderEdit,
  rootLevelMap,
  stepsProcessingSummaryMap,
  isFirstStepInLevel,
  isLastStepInLevel,
}: ActionBlockProps) => {
  const step = useSelector(stepRef, (snapshot) => snapshot.context.step);
  const { euiTheme } = useEuiTheme();

  const isUnsaved = useSelector(
    stepRef,
    (snapshot) => snapshot.context.isNew || snapshot.context.isUpdated
  );

  // For the inner description we once again invert the colours
  const descriptionPanelColour = getStepPanelColour(level + 1);

  if (!isActionBlock(step)) return null;

  const stepDescription = getStepDescription(step);

  const handleTitleClick = () => {
    stepRef.send({ type: 'step.edit' });
  };

  return (
    <>
      {/* The step under edit is part of the same root level hierarchy,
      and therefore won't be covered by a top level where block overlay. */}
      {stepUnderEdit &&
        rootLevelMap.get(stepUnderEdit.customIdentifier) ===
          rootLevelMap.get(step.customIdentifier) && <BlockDisableOverlay />}
      {/* Or this is a top level action block, and therefore also needs to be covered. */}
      {stepUnderEdit && !step.parentId && <BlockDisableOverlay />}
      <EuiFlexGroup gutterSize="s" responsive={false} direction="column">
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            <EuiFlexItem grow={false}>
              <ProcessorStatusIndicator
                stepRef={stepRef}
                stepsProcessingSummaryMap={stepsProcessingSummaryMap}
              />
            </EuiFlexItem>
            <EuiFlexItem
              grow={true}
              css={css`
                min-width: 0;
                margin-right: ${euiTheme.size.s};
              `}
            >
              <EuiFlexGroup alignItems="center" gutterSize="xs">
                <EuiToolTip
                  position="top"
                  content={
                    <p>
                      {i18n.translate(
                        'xpack.streams.actionBlockListItem.tooltip.editProcessorLabel',
                        {
                          defaultMessage: 'Edit {stepAction} processor',
                          values: {
                            stepAction: step.action,
                          },
                        }
                      )}
                    </p>
                  }
                >
                  <EuiButtonEmpty
                    onClick={handleTitleClick}
                    color="text"
                    aria-label={i18n.translate(
                      'xpack.streams.actionBlockListItem.euiButtonEmpty.editProcessorLabel',
                      { defaultMessage: 'Edit processor' }
                    )}
                    size="xs"
                    data-test-subj="streamsAppProcessorTitleEditButton"
                  >
                    <EuiText
                      size="s"
                      style={{ fontWeight: euiTheme.font.weight.bold }}
                      css={css`
                        display: block;
                        ${euiTextTruncate()}
                      `}
                    >
                      {step.action.toUpperCase()}
                    </EuiText>
                  </EuiButtonEmpty>
                </EuiToolTip>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" gutterSize="xs">
                {processorMetrics && (
                  <EuiFlexItem>
                    <ProcessorMetricBadges {...processorMetrics} />
                  </EuiFlexItem>
                )}
                {isUnsaved && (
                  <EuiFlexItem>
                    <EuiBadge>
                      {i18n.translate(
                        'xpack.streams.streamDetailView.managementTab.enrichment.ProcessorConfiguration.unsavedBadge',
                        { defaultMessage: 'Unsaved' }
                      )}
                    </EuiBadge>
                  </EuiFlexItem>
                )}
                <EuiFlexItem>
                  <StepContextMenu
                    stepRef={stepRef}
                    stepUnderEdit={stepUnderEdit}
                    isFirstStepInLevel={isFirstStepInLevel}
                    isLastStepInLevel={isLastStepInLevel}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel
            hasShadow={false}
            color={descriptionPanelColour}
            css={css`
              padding: ${euiTheme.size.xs} ${euiTheme.size.s};
            `}
          >
            <EuiTextTruncate
              text={stepDescription}
              truncation="end"
              children={() => (
                <EuiText
                  size="xs"
                  color="subdued"
                  css={css`
                    font-family: ${euiTheme.font.familyCode};
                  `}
                >
                  {stepDescription}
                </EuiText>
              )}
            />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
