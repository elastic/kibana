/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  euiTextTruncate,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { Condition } from '@kbn/streamlang';
import { isActionBlock } from '@kbn/streamlang';
import { useSelector } from '@xstate/react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ActionBlockProps } from '.';
import {
  useInteractiveModeSelector,
  useStreamEnrichmentSelector,
} from '../../../state_management/stream_enrichment_state_machine';
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

  const canEdit = useInteractiveModeSelector((snapshot) => snapshot.can({ type: 'step.edit' }));
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // For the inner description we once again invert the colours
  const descriptionPanelColour = getStepPanelColour(level + 1);

  useEffect(() => {
    if (isEditingDescription && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingDescription]);

  const saveDescription = useCallback(() => {
    if (!isActionBlock(step)) return;
    const trimmed = editValue.trim();
    stepRef.send({ type: 'step.changeDescription', description: trimmed });
    setIsEditingDescription(false);
  }, [editValue, step, stepRef]);

  if (!isActionBlock(step)) return null;

  const stepDescription = getStepDescription(step);
  const actionDisplayName = step.action.toUpperCase();

  const handleTitleClick = () => {
    stepRef.send({ type: 'step.edit' });
  };

  const handleDescriptionClick = () => {
    if (!readOnly && canEdit) {
      const initialValue =
        step.description && step.description.trim().length > 0
          ? step.description
          : getStepDescription({ ...step, description: undefined });
      setEditValue(initialValue);
      setIsEditingDescription(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveDescription();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsEditingDescription(false);
    }
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
              <EuiFlexGroup
                alignItems="center"
                gutterSize="xs"
                css={css`
                  min-width: 0;
                `}
              >
                <EuiFlexItem
                  grow={false}
                  css={css`
                    min-width: 0;
                    max-width: 100%;
                  `}
                >
                  <EuiToolTip
                    position="top"
                    content={
                      <>
                        <p>
                          <strong>{actionDisplayName}</strong>
                        </p>
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
                      </>
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
                      css={css`
                        max-width: 100%;
                      `}
                    >
                      <EuiText
                        size="s"
                        component="span"
                        style={{ fontWeight: euiTheme.font.weight.bold }}
                        css={css`
                          display: block;
                          ${euiTextTruncate()}
                        `}
                      >
                        {actionDisplayName}
                      </EuiText>
                    </EuiButtonEmpty>
                  </EuiToolTip>
                </EuiFlexItem>
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
            ) : isEditingDescription ? (
              <EuiFieldText
                inputRef={inputRef}
                fullWidth
                compressed
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={saveDescription}
                onKeyDown={handleKeyDown}
                data-test-subj="streamsAppProcessorDescriptionInlineEdit"
                aria-label={i18n.translate(
                  'xpack.streams.actionBlockListItem.descriptionInlineEdit.ariaLabel',
                  { defaultMessage: 'Edit processor description' }
                )}
                css={css`
                  font-family: ${euiTheme.font.familyCode};
                  font-size: ${euiTheme.size.m};
                `}
              />
            ) : (
              <EuiToolTip content={stepDescription} display="block">
                <EuiText
                  size="xs"
                  color="subdued"
                  tabIndex={0}
                  role={!readOnly && canEdit ? 'button' : undefined}
                  onClick={handleDescriptionClick}
                  data-test-subj="streamsAppProcessorDescription"
                  css={css`
                    font-family: ${euiTheme.font.familyCode};
                    font-style: italic;
                    ${euiTextTruncate()}
                    ${!readOnly && canEdit
                      ? `cursor: pointer;
                      &:hover {
                        text-decoration: underline;
                      }`
                      : ''}
                  `}
                >
                  {stepDescription}
                </EuiText>
              </EuiToolTip>
            )}
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
