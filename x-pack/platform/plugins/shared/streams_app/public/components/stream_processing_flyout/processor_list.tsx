/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { ComponentCatalogue } from '@kbn/streams-schema';
import { getDefinition } from '../../services/component_catalogue';
import { SLOT_POSITION } from '../../services/unit_graph';
import type { UnitSignal } from '../../services/unit_pipeline';
import type { DraftProcessor } from '../../services/unit_processing';
import type { ComponentReferenceOption } from '../component_definition_form';
import {
  BlockDisableOverlay,
  DraggableStepWrapper,
  useListReorderMonitor,
} from '../draggable_steps';
import { CreateProcessorButton } from './create_processor_button';
import { ProcessorCard } from './processor_card';
import { ProcessorEditor } from './processor_editor';
import type { ProcessingDiagnostic } from '../../services/unit_diagnostics';
import type {
  ProcessingStep,
  ProcessingStepPosition,
} from './state_management/processing_flyout_machine';

function ProcessorBlock({
  isUnderEdit,
  isCovered,
  dataTestSubj,
  children,
}: {
  isUnderEdit: boolean;
  isCovered: boolean;
  dataTestSubj: string;
  children: React.ReactNode;
}) {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiPanel
      hasShadow={false}
      color={isUnderEdit ? 'plain' : 'subdued'}
      css={
        isUnderEdit
          ? css`
              position: relative;
              border: 1px solid ${euiTheme.colors.borderStrongPrimary};
              box-sizing: border-box;
              padding: ${euiTheme.size.m};
            `
          : css`
              position: relative;
              border: ${euiTheme.border.thin};
              border-radius: ${euiTheme.size.s};
              padding: ${euiTheme.size.m};
            `
      }
      data-test-subj={dataTestSubj}
    >
      {isCovered ? <BlockDisableOverlay /> : null}
      {children}
    </EuiPanel>
  );
}

interface ProcessorListProps {
  catalogue: ComponentCatalogue;
  steps: readonly ProcessingStep[];
  editingKey?: string;
  isEditing: boolean;
  /** Where the editor for a processor being created is shown. */
  newStepPosition: ProcessingStepPosition;
  editable: boolean;
  telemetry: readonly UnitSignal[];
  diagnostics: readonly ProcessingDiagnostic[];
  componentRefs: readonly ComponentReferenceOption[];
  onCreate: () => void;
  onEdit: (key: string) => void;
  onDelete: (key: string) => void;
  onDuplicate: (key: string) => void;
  onChangeDescription: (key: string, description: string) => void;
  onMove: (from: number, to: number) => void;
  onCommit: (processor: DraftProcessor) => void;
  onCancel: () => void;
}

/** The processing steps in order, reordered by dragging like the processing tab's steps. */
export function ProcessorList({
  catalogue,
  steps,
  editingKey,
  isEditing,
  newStepPosition,
  editable,
  telemetry,
  diagnostics,
  componentRefs,
  onCreate,
  onEdit,
  onDelete,
  onDuplicate,
  onChangeDescription,
  onMove,
  onCommit,
  onCancel,
}: ProcessorListProps) {
  const keys = useMemo(() => steps.map(({ key }) => key), [steps]);
  useListReorderMonitor(keys, onMove);

  const isCreating = isEditing && !steps.some(({ key }) => key === editingKey);
  const isDragEnabled = editable && !isEditing && steps.length > 1;
  const newStepEditor = isCreating ? (
    <EuiFlexItem grow={false}>
      <ProcessorBlock isUnderEdit isCovered={false} dataTestSubj="streamsProcessingFlyoutNewStep">
        <ProcessorEditor
          catalogue={catalogue}
          telemetry={telemetry}
          componentRefs={componentRefs}
          onCommit={onCommit}
          onCancel={onCancel}
        />
      </ProcessorBlock>
    </EuiFlexItem>
  ) : null;

  return (
    <EuiFlexGroup direction="column" gutterSize="s" data-test-subj="streamsProcessingFlyoutSteps">
      {newStepPosition === SLOT_POSITION.start ? newStepEditor : null}
      {steps.map((step, index) => {
        const isUnderEdit = isEditing && step.key === editingKey;
        const displayName =
          getDefinition(catalogue, 'processor', step.processor.type)?.display_name ??
          step.processor.type;
        return (
          <EuiFlexItem key={step.key} grow={false}>
            <DraggableStepWrapper
              stepId={step.key}
              index={index}
              level={0}
              isBlocked
              isDragEnabled={isDragEnabled}
            >
              <ProcessorBlock
                isUnderEdit={isUnderEdit}
                isCovered={isEditing && !isUnderEdit}
                dataTestSubj={`streamsProcessingFlyoutStep-${index}`}
              >
                {isUnderEdit ? (
                  <ProcessorEditor
                    catalogue={catalogue}
                    step={step}
                    telemetry={telemetry}
                    componentRefs={componentRefs}
                    onCommit={onCommit}
                    onCancel={onCancel}
                    onDelete={() => onDelete(step.key)}
                  />
                ) : (
                  <ProcessorCard
                    step={step}
                    displayName={displayName}
                    diagnostics={diagnostics.filter(({ stepIndex }) => stepIndex === index)}
                    editable={editable && !isEditing}
                    isFirst={index === 0}
                    isLast={index === steps.length - 1}
                    onEdit={() => onEdit(step.key)}
                    onDelete={() => onDelete(step.key)}
                    onDuplicate={() => onDuplicate(step.key)}
                    onMoveUp={() => onMove(index, index - 1)}
                    onMoveDown={() => onMove(index, index + 1)}
                    onChangeDescription={(description) =>
                      onChangeDescription(step.key, description)
                    }
                  />
                )}
              </ProcessorBlock>
            </DraggableStepWrapper>
          </EuiFlexItem>
        );
      })}
      {newStepPosition === SLOT_POSITION.end ? newStepEditor : null}
      <EuiFlexItem grow={false}>
        <EuiFlexGroup justifyContent="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <CreateProcessorButton
              isDisabled={!editable || isEditing}
              onClick={onCreate}
              dataTestSubj="streamsProcessingFlyoutAddProcessor"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
