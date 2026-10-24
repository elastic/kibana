/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout, KbnInfoCallout } from '@kbn/ui-callout';
import { useSelector } from '@xstate/react';
import { useDiscardConfirm } from '../../hooks/use_discard_confirm';
import { useComponentCatalogue } from '../../services/component_catalogue';
import type { DraftProcessor } from '../../services/unit_processing';
import type { ComponentReferenceOption } from '../component_definition_form';
import {
  useCanvasEvents,
  useCanvasUnitDefinition,
  type CanvasProcessingFlyout,
} from '../stream_management/data_management/stream_detail_canvas/state_management';
import { NoProcessorsPrompt } from './empty_states';
import { ProcessorList } from './processor_list';
import {
  deleteAllProcessorsPromptOptions,
  discardProcessingChangesPromptOptions,
} from './prompt_options';

const deleteAllLabel = i18n.translate('xpack.streams.processingFlyout.deleteAll', {
  defaultMessage: 'Delete all processors',
});

const noop = () => {};

const closeLabel = i18n.translate('xpack.streams.processingFlyout.close', {
  defaultMessage: 'Close',
});

export function ProcessingFlyout({ flyout }: { flyout: CanvasProcessingFlyout }) {
  const { euiTheme } = useEuiTheme();
  const headerId = useGeneratedHtmlId();
  const { closeProcessingFlyout } = useCanvasEvents();
  const unit = useCanvasUnitDefinition();
  const { catalogue, loading, error, refresh } = useComponentCatalogue();

  const { ref } = flyout;
  const steps = useSelector(ref, (state) => state.context.steps);
  const editingKey = useSelector(ref, (state) => state.context.editingKey);
  const isEditing = useSelector(ref, (state) => state.matches('editing'));
  const createPosition = useSelector(ref, (state) => state.context.createPosition);
  const isSaving = useSelector(ref, (state) => state.matches('saving'));
  const hasChanges = useSelector(ref, (state) => state.context.hasChanges);
  const editable = useSelector(ref, (state) => state.context.editable);
  const telemetry = useSelector(ref, (state) => state.context.telemetry);
  const diagnostics = useSelector(ref, (state) => state.context.diagnostics);
  const saveError = useSelector(ref, (state) => state.context.saveError);

  const componentRefs = useMemo<ComponentReferenceOption[]>(
    () => [
      ...(unit.unit.processors ?? []).map(({ id }) => ({ id, kind: 'processor' as const })),
      ...unit.unit.destinations.map(({ id }) => ({ id, kind: 'destination' as const })),
    ],
    [unit]
  );

  const createStep = useCallback(() => ref.send({ type: 'step.create' }), [ref]);
  const editStep = useCallback((key: string) => ref.send({ type: 'step.edit', key }), [ref]);
  const deleteStep = useCallback((key: string) => ref.send({ type: 'step.delete', key }), [ref]);
  const duplicateStep = useCallback(
    (key: string) => ref.send({ type: 'step.duplicate', key }),
    [ref]
  );
  const changeDescription = useCallback(
    (key: string, description: string) =>
      ref.send({ type: 'step.changeDescription', key, description }),
    [ref]
  );
  const moveStep = useCallback(
    (from: number, to: number) => ref.send({ type: 'step.reorder', from, to }),
    [ref]
  );
  const commitStep = useCallback(
    (processor: DraftProcessor) => ref.send({ type: 'step.commit', processor }),
    [ref]
  );
  const cancelStep = useCallback(() => ref.send({ type: 'step.cancel' }), [ref]);

  const confirmClose = useDiscardConfirm(closeProcessingFlyout, {
    enabled: hasChanges || isEditing,
    ...discardProcessingChangesPromptOptions,
  });
  // Closing does not cancel a save in flight, so the flyout stays open until it settles.
  const requestClose = isSaving ? noop : confirmClose;
  const requestDeleteAll = useDiscardConfirm(
    () => ref.send({ type: 'step.deleteAll' }),
    deleteAllProcessorsPromptOptions
  );

  const unmatchedDiagnostics = diagnostics.filter(({ stepIndex }) => stepIndex === undefined);

  const renderProcessors = () => {
    if (loading && !catalogue) {
      return <EuiLoadingSpinner size="l" data-test-subj="streamsProcessingFlyoutLoading" />;
    }
    if (!catalogue) {
      return (
        <KbnDangerCallout
          announceOnMount
          title={i18n.translate('xpack.streams.processingFlyout.catalogueErrorTitle', {
            defaultMessage: 'Unable to load the available processors',
          })}
          text={error?.message}
          actionProps={{
            primary: {
              children: i18n.translate('xpack.streams.processingFlyout.catalogueRetry', {
                defaultMessage: 'Try again',
              }),
              onClick: refresh,
            },
          }}
        />
      );
    }
    if (steps.length === 0 && !isEditing) {
      return <NoProcessorsPrompt canAdd={editable} onAddProcessor={createStep} />;
    }
    return (
      <ProcessorList
        catalogue={catalogue}
        steps={steps}
        editingKey={editingKey}
        isEditing={isEditing}
        newStepPosition={createPosition}
        editable={editable && !isSaving}
        telemetry={telemetry}
        diagnostics={diagnostics}
        componentRefs={componentRefs}
        onCreate={createStep}
        onEdit={editStep}
        onDelete={deleteStep}
        onDuplicate={duplicateStep}
        onChangeDescription={changeDescription}
        onMove={moveStep}
        onCommit={commitStep}
        onCancel={cancelStep}
      />
    );
  };

  return (
    <EuiFlyout
      size="m"
      aria-labelledby={headerId}
      onClose={requestClose}
      data-test-subj="streamsProcessingFlyout"
      paddingSize="none"
      hideCloseButton
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup
          alignItems="center"
          gutterSize="s"
          responsive={false}
          css={css`
            padding: ${euiTheme.size.m} ${euiTheme.size.l};
          `}
        >
          <EuiFlexItem grow={false}>
            <EuiTitle size="s" data-test-subj="streamsCanvasFlyoutTitle">
              <h1 id={headerId}>
                {i18n.translate('xpack.streams.processingFlyout.title', {
                  defaultMessage: 'Processing',
                })}
              </h1>
            </EuiTitle>
          </EuiFlexItem>
          {!editable ? (
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">
                {i18n.translate('xpack.streams.processingFlyout.readOnlyBadge', {
                  defaultMessage: 'Read only',
                })}
              </EuiBadge>
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem />
          {editable && steps.length > 0 ? (
            <EuiFlexItem grow={false}>
              <EuiToolTip content={deleteAllLabel} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="trash"
                  color="danger"
                  aria-label={deleteAllLabel}
                  isDisabled={isSaving}
                  onClick={requestDeleteAll}
                  data-test-subj="streamsProcessingFlyoutDeleteAll"
                />
              </EuiToolTip>
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem grow={false}>
            <EuiToolTip content={closeLabel} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="cross"
                color="text"
                aria-label={closeLabel}
                isDisabled={isSaving}
                onClick={requestClose}
                data-test-subj="streamsProcessingFlyoutClose"
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <div
          css={css`
            padding: ${euiTheme.size.l};
          `}
        >
          {!editable ? (
            <>
              <KbnInfoCallout
                announceOnMount
                size="s"
                title={i18n.translate('xpack.streams.processingFlyout.readOnlyCallout', {
                  defaultMessage:
                    'This processing uses telemetry-specific processor lists. Edit it in the YAML configuration.',
                })}
              />
              <EuiSpacer size="m" />
            </>
          ) : null}
          {saveError ? (
            <>
              <KbnDangerCallout
                announceOnMount
                title={i18n.translate('xpack.streams.processingFlyout.saveErrorTitle', {
                  defaultMessage: 'Unable to save processing',
                })}
                data-test-subj="streamsProcessingFlyoutSaveError"
                text={
                  <>
                    <p>{saveError}</p>
                    {unmatchedDiagnostics.length > 0 ? (
                      <ul>
                        {unmatchedDiagnostics.map(({ code, message }, index) => (
                          <li key={`${code}-${index}`}>
                            {code ? <strong>{code}: </strong> : null}
                            {message}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </>
                }
              />
              <EuiSpacer size="m" />
            </>
          ) : null}
          {renderProcessors()}
        </div>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              isDisabled={isSaving}
              onClick={requestClose}
              data-test-subj="streamsProcessingFlyoutCancel"
            >
              {i18n.translate('xpack.streams.processingFlyout.cancel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              isLoading={isSaving}
              isDisabled={!editable || !hasChanges || isEditing}
              onClick={() => ref.send({ type: 'flyout.save' })}
              data-test-subj="streamsProcessingFlyoutSave"
            >
              {i18n.translate('xpack.streams.processingFlyout.save', {
                defaultMessage: 'Save and apply',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
