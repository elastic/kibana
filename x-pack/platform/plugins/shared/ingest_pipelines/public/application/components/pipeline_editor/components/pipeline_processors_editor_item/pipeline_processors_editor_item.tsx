/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { memo, useCallback, useRef } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInlineEditText,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

import type { ProcessorInternal, ProcessorSelector, ContextValueEditor } from '../../types';
import { selectorToDataTestSubject } from '../../utils';
import type { ProcessorsDispatch } from '../../processors_reducer';

import type { ProcessorInfo } from '../processors_tree';
import { PipelineProcessorsItemStatus } from '../pipeline_processors_editor_item_status';
import { useTestPipelineContext } from '../../context';

import { getProcessorDescriptor } from '../shared';

import { ContextMenu } from './context_menu';
import { i18nTexts } from './i18n_texts';
import type { Handlers } from './types';

const useStyles = ({
  isSelected,
  isDimmedStyle,
  shouldHideDescription,
  isCancelButton,
}: {
  isSelected: boolean;
  isDimmedStyle: boolean;
  shouldHideDescription: boolean;
  isCancelButton: boolean;
}) => {
  const { euiTheme } = useEuiTheme();

  return {
    panel: css`
      transition: border-color ${euiTheme.animation.extraSlow} ${euiTheme.animation.resistance};
      min-height: 50px;
      ${isSelected &&
      css`
        border: ${euiTheme.border.thin};
        border-color: ${euiTheme.colors.primary};
      `}
      ${isDimmedStyle &&
      css`
        box-shadow: none;
      `}
    `,
    flexItemMinWidth: css`
      min-width: 0;
    `,
    innerFlexGroup: css`
      width: 100%;
      overflow: hidden;
    `,
    statusContainer: css`
      min-width: 15px;
    `,
    processorText: css`
      line-height: ${euiTheme.size.l};
    `,
    descriptionContainer: css`
      min-width: 0;
      ${shouldHideDescription &&
      css`
        display: none;
      `}
    `,
    moveButton: css`
      &:hover {
        transform: none !important;
      }
      ${isCancelButton &&
      css`
        z-index: ${euiTheme.levels.menu};
      `}
    `,
  };
};

export interface Props {
  processor: ProcessorInternal;
  processorsDispatch: ProcessorsDispatch;
  editor: ContextValueEditor;
  handlers: Handlers;
  selector: ProcessorSelector;
  description?: string;
  movingProcessor?: ProcessorInfo;
  renderOnFailureHandlers?: () => React.ReactNode;
}

export const PipelineProcessorsEditorItem: FunctionComponent<Props> = memo(
  function PipelineProcessorsEditorItem({
    processor,
    description,
    handlers: { onCancelMove, onMove },
    selector,
    movingProcessor,
    renderOnFailureHandlers,
    editor,
    processorsDispatch,
  }) {
    const editButtonRef = useRef<HTMLAnchorElement>(null);
    const contextMenuButtonRef = useRef<HTMLButtonElement>(null);
    const isEditorNotInIdleMode = editor.mode.id !== 'idle';
    const isInMoveMode = Boolean(movingProcessor);
    const isMovingThisProcessor = processor.id === movingProcessor?.id;
    const isEditingThisProcessor =
      editor.mode.id === 'managingProcessor' && processor.id === editor.mode.arg.processor.id;
    const isEditingOtherProcessor =
      editor.mode.id === 'managingProcessor' && !isEditingThisProcessor;
    const isMovingOtherProcessor = editor.mode.id === 'movingProcessor' && !isMovingThisProcessor;
    const isDimmed = isEditingOtherProcessor || isMovingOtherProcessor;

    const processorDescriptor = getProcessorDescriptor(processor.type);

    const { testPipelineData } = useTestPipelineContext();
    const {
      config: { selectedDocumentIndex },
      testOutputPerProcessor,
      isExecutingPipeline,
    } = testPipelineData;

    const processorOutput =
      testOutputPerProcessor && testOutputPerProcessor[selectedDocumentIndex][processor.id];
    const processorStatus = processorOutput?.status ?? 'inactive';

    const defaultDescription = processorDescriptor?.getDefaultDescription(processor.options);
    const hasNoDescription = !defaultDescription && !processor.options.description;

    const styles = useStyles({
      isSelected: isMovingThisProcessor || isEditingThisProcessor,
      isDimmedStyle: isDimmed,
      shouldHideDescription: isInMoveMode && hasNoDescription,
      isCancelButton: isMovingThisProcessor,
    });

    const onDescriptionChange = useCallback(
      (nextDescription: any) => {
        let nextOptions: Record<string, any>;
        if (!nextDescription) {
          const { description: _description, ...restOptions } = processor.options;
          nextOptions = restOptions;
        } else {
          nextOptions = {
            ...processor.options,
            description: nextDescription,
          };
        }
        processorsDispatch({
          type: 'updateProcessor',
          payload: {
            processor: {
              ...processor,
              options: nextOptions,
            },
            selector,
          },
        });
      },
      [processor, processorsDispatch, selector]
    );

    const renderMoveButton = () => {
      const label = !isMovingThisProcessor
        ? i18nTexts.moveButtonLabel
        : i18nTexts.cancelMoveButtonLabel;
      const dataTestSubj = !isMovingThisProcessor ? 'moveItemButton' : 'cancelMoveItemButton';
      const icon = isMovingThisProcessor ? 'cross' : 'sortable';
      const disabled = isEditorNotInIdleMode && !isMovingThisProcessor;
      const moveButton = (
        <EuiButtonIcon
          color={isMovingThisProcessor ? 'primary' : 'text'}
          iconType={icon}
          data-test-subj={dataTestSubj}
          size="s"
          isDisabled={disabled}
          aria-label={label}
          onClick={() => {
            if (isMovingThisProcessor) {
              onCancelMove();
            } else {
              onMove();
            }
          }}
        />
      );
      // Remove the tooltip from the DOM to prevent it from lingering if the mouse leave event
      // did not fire.
      return (
        <div css={styles.moveButton}>
          {!isInMoveMode ? (
            <EuiToolTip content={i18nTexts.moveButtonLabel}>{moveButton}</EuiToolTip>
          ) : (
            moveButton
          )}
        </div>
      );
    };

    return (
      <EuiPanel hasBorder hasShadow={false} paddingSize="s" css={styles.panel}>
        <EuiFlexGroup
          gutterSize="none"
          responsive={false}
          alignItems="center"
          justifyContent="spaceBetween"
          data-test-subj={selectorToDataTestSubject(selector)}
          data-processor-id={processor.id}
        >
          <EuiFlexItem css={styles.flexItemMinWidth}>
            <EuiFlexGroup
              css={styles.innerFlexGroup}
              gutterSize="m"
              alignItems="center"
              responsive={false}
            >
              <EuiFlexItem grow={false}>{renderMoveButton()}</EuiFlexItem>
              <EuiFlexItem grow={false} css={styles.statusContainer}>
                {isExecutingPipeline ? (
                  <EuiLoadingSpinner size="s" />
                ) : (
                  <PipelineProcessorsItemStatus processorStatus={processorStatus} />
                )}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText css={styles.processorText} color={isDimmed ? 'subdued' : undefined}>
                  <EuiLink
                    ref={editButtonRef}
                    tabIndex={isEditorNotInIdleMode ? -1 : 0}
                    disabled={isEditorNotInIdleMode}
                    onClick={() => {
                      editor.setMode({
                        id: 'managingProcessor',
                        arg: { processor, selector, buttonRef: editButtonRef },
                      });
                    }}
                    data-test-subj="manageItemButton"
                  >
                    <b>{processorDescriptor?.label ?? processor.type}</b>
                  </EuiLink>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem
                data-test-subj="pipelineProcessorItemDescriptionContainer"
                css={styles.descriptionContainer}
                grow={false}
              >
                <EuiInlineEditText
                  size="s"
                  defaultValue={description || ''}
                  readModeProps={{ 'data-test-subj': 'inlineTextInputNonEditableText' }}
                  placeholder={defaultDescription ?? i18nTexts.descriptionPlaceholder}
                  inputAriaLabel={i18nTexts.processorTypeLabel({ type: processor.type })}
                  isReadOnly={isEditorNotInIdleMode}
                  onSave={(newTextValue) => {
                    onDescriptionChange(newTextValue);
                  }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ContextMenu
              ref={contextMenuButtonRef}
              data-test-subj="moreMenu"
              disabled={isEditorNotInIdleMode}
              hidden={isInMoveMode}
              showAddOnFailure={!processor.onFailure?.length}
              onAddOnFailure={() => {
                editor.setMode({
                  id: 'creatingProcessor',
                  arg: { selector, buttonRef: contextMenuButtonRef },
                });
              }}
              onDelete={() => {
                editor.setMode({ id: 'removingProcessor', arg: { selector } });
              }}
              onDuplicate={() => {
                processorsDispatch({
                  type: 'duplicateProcessor',
                  payload: {
                    source: selector,
                  },
                });
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        {renderOnFailureHandlers && renderOnFailureHandlers()}
      </EuiPanel>
    );
  }
);
