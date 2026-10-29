/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
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
import { DragHandle, useDragHandle } from '../draggable_steps';
import { ProcessorContextMenu } from './processor_context_menu';
import { summarizeProcessor } from './processor_summary';
import type { ProcessingDiagnostic } from '../../services/unit_diagnostics';
import type { ProcessingStep } from './state_management/processing_flyout_machine';

interface ProcessorCardProps {
  step: ProcessingStep;
  displayName: string;
  diagnostics: readonly ProcessingDiagnostic[];
  editable: boolean;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

/** A configured processor in the list, laid out like the processing tab's action block. */
export function ProcessorCard({
  step,
  displayName,
  diagnostics,
  editable,
  isFirst,
  isLast,
  onEdit,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
}: ProcessorCardProps) {
  const { euiTheme } = useEuiTheme();
  const isDragEnabled = useDragHandle() !== null;
  const title = displayName.toUpperCase();
  const description = step.processor.description ?? summarizeProcessor(step.processor);

  return (
    <EuiFlexGroup gutterSize="s" responsive={false} direction="column">
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          {isDragEnabled ? (
            <EuiFlexItem grow={false}>
              <DragHandle />
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem
            css={css`
              min-width: 0;
              margin-right: ${euiTheme.size.s};
            `}
          >
            <div>
              <EuiToolTip
                position="top"
                content={
                  <>
                    <p>
                      <strong>{title}</strong>
                    </p>
                    <p>
                      {i18n.translate('xpack.streams.processingFlyout.card.editTooltip', {
                        defaultMessage: 'Edit {processor} processor',
                        values: { processor: displayName },
                      })}
                    </p>
                  </>
                }
              >
                <EuiButtonEmpty
                  onClick={onEdit}
                  isDisabled={!editable}
                  color="text"
                  size="xs"
                  aria-label={i18n.translate('xpack.streams.processingFlyout.card.editLabel', {
                    defaultMessage: 'Edit processor',
                  })}
                  data-test-subj="streamsProcessingFlyoutStepTitle"
                  css={css`
                    max-width: 100%;
                  `}
                >
                  <EuiText
                    size="s"
                    component="span"
                    css={css`
                      display: block;
                      font-weight: ${euiTheme.font.weight.bold};
                      ${euiTextTruncate()}
                    `}
                  >
                    {title}
                  </EuiText>
                </EuiButtonEmpty>
              </EuiToolTip>
            </div>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
              {diagnostics.length > 0 ? (
                <EuiFlexItem grow={false}>
                  <EuiToolTip
                    content={
                      <div>
                        {diagnostics.map(({ message }, index) => (
                          <div key={index}>{message}</div>
                        ))}
                      </div>
                    }
                  >
                    <EuiBadge
                      color="danger"
                      iconType="warning"
                      tabIndex={0}
                      data-test-subj="streamsProcessingFlyoutStepErrors"
                    >
                      {i18n.translate('xpack.streams.processingFlyout.card.errors', {
                        defaultMessage: '{count, plural, one {# error} other {# errors}}',
                        values: { count: diagnostics.length },
                      })}
                    </EuiBadge>
                  </EuiToolTip>
                </EuiFlexItem>
              ) : null}
              {step.status !== 'saved' ? (
                <EuiFlexItem grow={false}>
                  <EuiBadge data-test-subj="streamsProcessingFlyoutStepUnsaved">
                    {i18n.translate('xpack.streams.processingFlyout.card.unsaved', {
                      defaultMessage: 'Unsaved',
                    })}
                  </EuiBadge>
                </EuiFlexItem>
              ) : null}
              <EuiFlexItem grow={false}>
                <ProcessorContextMenu
                  isDisabled={!editable}
                  isFirst={isFirst}
                  isLast={isLast}
                  onMoveUp={onMoveUp}
                  onMoveDown={onMoveDown}
                  onEdit={onEdit}
                  onDuplicate={onDuplicate}
                  onDelete={onDelete}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel
          hasShadow={false}
          css={css`
            padding: ${euiTheme.size.xs} ${euiTheme.size.s};
          `}
        >
          <EuiText
            size="xs"
            color="subdued"
            title={description}
            css={css`
              font-style: italic;
              font-family: ${euiTheme.font.familyCode};
              ${euiTextTruncate()}
            `}
            data-test-subj="streamsProcessingFlyoutStepSummary"
          >
            {description}
          </EuiText>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
