/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
  type EuiComboBoxOptionOption,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { isEqual } from 'lodash';
import type {
  CatalogueComponentStatus,
  CatalogueComponentSummary,
  ComponentCatalogue,
  ComponentValidationRequest,
} from '@kbn/streams-schema';
import { useDiscardConfirm } from '../../hooks/use_discard_confirm';
import { BlockDisableOverlay } from '../draggable_steps';
import type { ComponentChecker } from '../../services/component_catalogue';
import { allocateComponentId, type UnitSignal } from '../../services/unit_pipeline';
import type { DraftProcessor } from '../../services/unit_processing';
import {
  ComponentDefinitionForm,
  SignalPicker,
  toFieldErrors,
  type ComponentReferenceOption,
} from '../component_definition_form';
import { CheckOutcomeCallout, type CheckOutcome } from './check_outcome_callout';
import {
  deleteProcessorPromptOptions,
  discardProcessorChangesPromptOptions,
} from './prompt_options';
import type { ProcessingStep } from './state_management/processing_flyout_machine';
import { useComponentCheck } from './use_component_check';
import { useProcessorForm } from './use_processor_form';

const STATUS_COLORS: Record<CatalogueComponentStatus, string> = {
  stable: 'success',
  beta: 'hollow',
  experimental: 'warning',
  deprecated: 'danger',
};

const processorLabel = i18n.translate('xpack.streams.processingFlyout.editor.processorLabel', {
  defaultMessage: 'Processor',
});

const signalsLabel = i18n.translate('xpack.streams.processingFlyout.editor.signalsLabel', {
  defaultMessage: 'Signals',
});

const toOption = (component: CatalogueComponentSummary): EuiComboBoxOptionOption<string> => ({
  label: component.display_name,
  value: component.type,
  append:
    component.status && component.status !== 'stable' ? (
      <EuiBadge color={STATUS_COLORS[component.status]}>{component.status}</EuiBadge>
    ) : undefined,
});

interface ProcessorEditorProps {
  catalogue: ComponentCatalogue;
  /** The step being edited; `undefined` when creating a processor. */
  step?: ProcessingStep;
  /** Whether other processing slots also apply the processor being edited. */
  isShared?: boolean;
  telemetry: readonly UnitSignal[];
  componentRefs: readonly ComponentReferenceOption[];
  /** Checks a submitted processor with the configuration service before it commits. */
  checkComponent: ComponentChecker;
  /** Ids used in the unit, so a new processor is checked under the id it would get. */
  componentIds: ReadonlySet<string>;
  /** `unchecked` when the configuration service could not be reached to check the processor. */
  onCommit: (processor: DraftProcessor, options?: { unchecked?: boolean }) => void;
  onCancel: () => void;
  /** Deletes the step being edited; omitted when creating a processor. */
  onDelete?: () => void;
}

const formOverlayStyles = css`
  position: relative;
`;

// A disabled fieldset also stops keyboard input, which the overlay alone does not.
const disabledFormStyles = css`
  border: 0;
  margin: 0;
  min-width: 0;
  padding: 0;
`;

/** The processor as a unit entry, under the id it has or would be given when the unit is saved. */
const toCheckRequest = (
  { id, type, name, description, supported_telemetry: telemetry, config }: DraftProcessor,
  componentIds: ReadonlySet<string>
): ComponentValidationRequest => ({
  kind: 'processor',
  component: {
    id: id ?? allocateComponentId(type, new Set(componentIds)),
    type,
    ...(name ? { name } : {}),
    ...(description ? { description } : {}),
    supported_telemetry: [...telemetry],
    ...(config.length > 0 ? { config } : {}),
  },
});

export function ProcessorEditor({
  catalogue,
  step,
  isShared = false,
  telemetry,
  componentRefs,
  checkComponent,
  componentIds,
  onCommit,
  onCancel,
  onDelete,
}: ProcessorEditorProps) {
  const form = useProcessorForm({ catalogue, step, telemetry });
  const { type, component, definition, signals, doesNotFit } = form;
  const check = useComponentCheck(checkComponent);
  const [outcome, setOutcome] = useState<CheckOutcome>();
  // The processor the warnings were about; "Continue anyway" commits exactly that.
  const [warnedProcessor, setWarnedProcessor] = useState<DraftProcessor>();
  const clearWarnings = () => {
    if (warnedProcessor) {
      setWarnedProcessor(undefined);
      setOutcome(undefined);
    }
  };

  const confirmCancel = useDiscardConfirm(onCancel, {
    enabled: form.isDirty,
    ...discardProcessorChangesPromptOptions,
  });
  const confirmDelete = useDiscardConfirm(() => onDelete?.(), deleteProcessorPromptOptions);
  // The check stops first, so it cannot commit the processor while the prompt is open.
  const handleCancel = () => {
    check.stop();
    confirmCancel();
  };
  const handleDelete = () => {
    check.stop();
    confirmDelete();
  };

  const options = useMemo(() => form.processors.map(toOption), [form.processors]);
  const [isSelectionCleared, setIsSelectionCleared] = useState(false);
  const selectedOptions = isSelectionCleared ? [] : options.filter(({ value }) => value === type);

  const submit = async () => {
    if (check.isChecking) {
      return;
    }
    const processor = form.validate();
    if (!processor) {
      return;
    }
    setOutcome(undefined);
    setWarnedProcessor(undefined);
    // A processor saved as it was opened was already checked when it was last committed, and the
    // unit save checks everything again, so no round trip is spent on it.
    if (step && isEqual(processor, step.processor)) {
      onCommit(processor);
      return;
    }
    const result = await check.run(toCheckRequest(processor, componentIds));
    if (!result) {
      return;
    }

    switch (result.status) {
      case 'valid':
        // Warnings do not block, but the user sees them before the processor is committed.
        if (result.diagnostics.length > 0) {
          setWarnedProcessor(processor);
          setOutcome({ kind: 'warned', diagnostics: result.diagnostics });
          return;
        }
        onCommit(processor);
        return;
      case 'unchecked':
        onCommit(processor, { unchecked: true });
        return;
      case 'invalid': {
        // Diagnostics that point at a field show on it; editing the field clears them again.
        const { errors, unmatched } = toFieldErrors(
          result.diagnostics,
          processor.config,
          new Set(definition?.fields.map(({ name }) => name))
        );
        form.addErrors(errors);
        setOutcome({ kind: 'rejected', unmatched, highlightedCount: Object.keys(errors).length });
        return;
      }
      case 'failed':
        setOutcome({ kind: 'failed', message: result.message });
        return;
    }
  };

  const isNew = step === undefined;
  const title = (
    definition?.display_name ??
    component?.display_name ??
    processorLabel
  ).toUpperCase();

  return (
    <div data-test-subj="streamsProcessingFlyoutEditor">
      <EuiFlexGroup gutterSize="s" direction="column">
        <strong>{title}</strong>
        <EuiFlexItem>
          {isShared ? (
            <>
              <KbnWarningCallout
                size="s"
                title={i18n.translate('xpack.streams.processingFlyout.editor.sharedTitle', {
                  defaultMessage: 'This processor is also used by other processing nodes',
                })}
                text={i18n.translate('xpack.streams.processingFlyout.editor.sharedBody', {
                  defaultMessage: 'Changes to it apply everywhere it is used.',
                })}
                data-test-subj="streamsProcessingFlyoutSharedProcessor"
              />
              <EuiSpacer size="m" />
            </>
          ) : null}
          <div css={formOverlayStyles}>
            {check.isChecking ? <BlockDisableOverlay /> : null}
            <fieldset disabled={check.isChecking} css={disabledFormStyles}>
              <EuiForm fullWidth>
                <EuiFormRow
                  fullWidth
                  label={processorLabel}
                  helpText={definition?.help?.summary ?? definition?.description}
                >
                  <EuiComboBox
                    aria-label={processorLabel}
                    fullWidth
                    compressed
                    isDisabled={!isNew}
                    singleSelection={{ asPlainText: true }}
                    options={options}
                    selectedOptions={selectedOptions}
                    onChange={([selected]) => {
                      setIsSelectionCleared(selected?.value === undefined);
                      if (selected?.value !== undefined && selected.value !== type) {
                        clearWarnings();
                        form.changeType(selected.value);
                      }
                    }}
                    placeholder={i18n.translate(
                      'xpack.streams.processingFlyout.editor.processorPlaceholder',
                      { defaultMessage: 'Select a processor' }
                    )}
                    data-test-subj="streamsProcessingFlyoutProcessorType"
                  />
                </EuiFormRow>
                <EuiSpacer size="m" />
                {type && !definition ? (
                  <KbnWarningCallout
                    announceOnMount
                    size="s"
                    title={i18n.translate(
                      'xpack.streams.processingFlyout.editor.unknownTypeTitle',
                      {
                        defaultMessage: 'This processor type is not available to configure here',
                      }
                    )}
                    data-test-subj="streamsProcessingFlyoutUnknownType"
                    text={i18n.translate('xpack.streams.processingFlyout.editor.unknownTypeBody', {
                      defaultMessage:
                        'Its configuration is kept as it is. Edit it in the YAML configuration instead.',
                    })}
                  />
                ) : null}
                {definition && doesNotFit ? (
                  <KbnWarningCallout
                    announceOnMount
                    size="s"
                    title={i18n.translate(
                      'xpack.streams.processingFlyout.editor.noTelemetryTitle',
                      {
                        defaultMessage: '{processor} does not support the signals that flow here',
                        values: { processor: definition.display_name },
                      }
                    )}
                  />
                ) : null}
                {definition && form.canChooseSignals ? (
                  <>
                    <SignalPicker
                      label={signalsLabel}
                      helpText={
                        definition.max_selected_telemetry !== undefined
                          ? i18n.translate(
                              'xpack.streams.processingFlyout.editor.signalsLimitHelp',
                              {
                                defaultMessage:
                                  'Choose up to {limit, plural, one {# signal} other {# signals}} for this processor to apply to.',
                                values: { limit: definition.max_selected_telemetry },
                              }
                            )
                          : i18n.translate('xpack.streams.processingFlyout.editor.signalsHelp', {
                              defaultMessage: 'The signals this processor applies to.',
                            })
                      }
                      options={form.signalOptions}
                      selected={signals}
                      error={form.signalsError}
                      onChange={(next) => {
                        clearWarnings();
                        form.setSignals(
                          form.signalOptions.filter((signal) => next.includes(signal))
                        );
                      }}
                      dataTestSubj="streamsProcessingFlyoutEditorSignals"
                    />
                    <EuiSpacer size="m" />
                  </>
                ) : null}
                {definition?.telemetry_selection === 'fixed' && !doesNotFit ? (
                  <>
                    <EuiText
                      size="xs"
                      color="subdued"
                      data-test-subj="streamsProcessingFlyoutFixedSignals"
                    >
                      {i18n.translate('xpack.streams.processingFlyout.editor.fixedSignals', {
                        defaultMessage: 'Applies to every signal it supports: {signals}.',
                        values: { signals: signals.join(', ') },
                      })}
                    </EuiText>
                    <EuiSpacer size="m" />
                  </>
                ) : null}
                {definition && !doesNotFit ? (
                  <ComponentDefinitionForm
                    definition={definition}
                    metadata={catalogue.metadata}
                    telemetry={signals}
                    values={form.values}
                    errors={form.errors}
                    componentRefs={componentRefs}
                    onChange={(values) => {
                      clearWarnings();
                      form.setValues(values);
                    }}
                    onUnparsedInputChange={form.setHasUnparsedInput}
                  />
                ) : null}
              </EuiForm>
            </fieldset>
          </div>
          <CheckOutcomeCallout
            outcome={outcome}
            onCommitAnyway={() => {
              if (warnedProcessor) {
                onCommit(warnedProcessor);
              }
            }}
          />
          <EuiHorizontalRule margin="m" />
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              {onDelete ? (
                <EuiButton
                  size="s"
                  color="danger"
                  onClick={handleDelete}
                  data-test-subj="streamsProcessingFlyoutEditorDelete"
                >
                  {i18n.translate('xpack.streams.processingFlyout.editor.delete', {
                    defaultMessage: 'Delete processor',
                  })}
                </EuiButton>
              ) : null}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    size="s"
                    onClick={handleCancel}
                    data-test-subj="streamsProcessingFlyoutEditorCancel"
                  >
                    {i18n.translate('xpack.streams.processingFlyout.editor.cancel', {
                      defaultMessage: 'Cancel',
                    })}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    size="s"
                    fill
                    isLoading={check.isChecking}
                    isDisabled={!form.canSubmit || check.isChecking}
                    onClick={submit}
                    data-test-subj="streamsProcessingFlyoutEditorSubmit"
                  >
                    {isNew
                      ? i18n.translate('xpack.streams.processingFlyout.editor.create', {
                          defaultMessage: 'Create',
                        })
                      : i18n.translate('xpack.streams.processingFlyout.editor.update', {
                          defaultMessage: 'Update',
                        })}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}
