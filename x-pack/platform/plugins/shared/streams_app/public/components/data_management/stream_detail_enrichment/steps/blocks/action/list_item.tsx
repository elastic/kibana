/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiTextTruncate,
  euiTextTruncate,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { Condition } from '@kbn/streamlang';
import { isActionBlock } from '@kbn/streamlang';
import { useSelector } from '@xstate/react';
import React from 'react';
import type { ActionBlockProps } from '.';
import { useStreamEnrichmentSelector } from '../../../state_management/stream_enrichment_state_machine';
import { selectValidationErrors } from '../../../state_management/stream_enrichment_state_machine/selectors';
import { ConditionDisplay } from '../../../../shared';
import { getStepPanelColour } from '../../../utils';
import { BlockDisableOverlay } from '../block_disable_overlay';
import { StepContextMenu } from '../context_menu';
import { ProcessorMetricBadges } from './processor_metrics';
import { ProcessorStatusIndicator } from './processor_status_indicator';
import { getStepDescription } from './utils';
import { DragHandle } from '../../draggable_step_wrapper';

export const ActionBlockListItem = (props: ActionBlockProps) => {
  const { euiTheme } = useEuiTheme();
  const { stepRef, level, processorMetrics, readOnly = false } = props;

  const step = useSelector(stepRef, (snapshot) => snapshot.context.step);
  const isUnsaved = useSelector(
    stepRef,
    (snapshot) => snapshot.context.isNew || snapshot.context.isUpdated
  );

  const validationErrors = useStreamEnrichmentSelector((state) => {
    const errors = selectValidationErrors(state.context);
    return errors.get(step.customIdentifier) || [];
  });

  const hasValidationErrors = validationErrors.length > 0;

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
      {props.stepUnderEdit &&
        props.rootLevelMap.get(props.stepUnderEdit.customIdentifier) ===
          props.rootLevelMap.get(step.customIdentifier) && <BlockDisableOverlay />}
      {/* Or this is a top level action block, and therefore also needs to be covered. */}
      {props.stepUnderEdit && !step.parentId && <BlockDisableOverlay />}
      <EuiFlexGroup gutterSize="s" responsive={false} direction="column">
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            {!readOnly && (
              <EuiFlexItem grow={false}>
                <DragHandle />
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <ProcessorStatusIndicator
                stepRef={stepRef}
                stepsProcessingSummaryMap={props.stepsProcessingSummaryMap}
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
            {(processorMetrics || hasValidationErrors || isUnsaved || !readOnly) && (
              <EuiFlexItem grow={false}>
                <EuiFlexGroup alignItems="center" gutterSize="xs">
                  {processorMetrics && (
                    <EuiFlexItem>
                      <ProcessorMetricBadges {...processorMetrics} />
                    </EuiFlexItem>
                  )}
                  {hasValidationErrors && (
                    <EuiFlexItem>
                      <EuiToolTip
                        content={
                          <div>
                            {validationErrors.map((error, idx) => (
                              <div key={idx}>{error.message}</div>
                            ))}
                          </div>
                        }
                      >
                        <EuiBadge color="danger" iconType="warning">
                          {i18n.translate(
                            'xpack.streams.streamDetailView.managementTab.enrichment.validationErrorBadge',
                            {
                              defaultMessage: '{count, plural, one {# error} other {# errors}}',
                              values: { count: validationErrors.length },
                            }
                          )}
                        </EuiBadge>
                      </EuiToolTip>
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
                  {!readOnly && (
                    <EuiFlexItem>
                      <StepContextMenu
                        stepRef={stepRef}
                        stepUnderEdit={props.stepUnderEdit}
                        isFirstStepInLevel={props.isFirstStepInLevel}
                        isLastStepInLevel={props.isLastStepInLevel}
                      />
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              </EuiFlexItem>
            )}
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
            {step.action === 'drop_document' ? (
              <ConditionDisplay
                condition={step.where as Condition}
                showKeyword
                prefix={i18n.translate(
                  'xpack.streams.streamDetailView.managementTab.enrichment.dropProcessorDescription',
                  {
                    defaultMessage: 'Drops documents',
                  }
                )}
              />
            ) : (
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
            )}
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
