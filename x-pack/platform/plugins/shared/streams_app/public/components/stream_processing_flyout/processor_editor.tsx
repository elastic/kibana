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
  type EuiComboBoxOptionOption,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnWarningCallout } from '@kbn/ui-callout';
import type {
  CatalogueComponentStatus,
  CatalogueComponentSummary,
  ComponentCatalogue,
} from '@kbn/streams-schema';
import { useDiscardConfirm } from '../../hooks/use_discard_confirm';
import { getDefinition, listComponents } from '../../services/component_catalogue';
import type { UnitSignal } from '../../services/unit_pipeline';
import type { DraftProcessor } from '../../services/unit_processing';
import {
  ComponentDefinitionForm,
  createInitialObject,
  fromConfigEntries,
  toConfigEntries,
  validateValues,
  type ComponentReferenceOption,
  type FieldErrors,
  type ObjectValue,
} from '../component_definition_form';
import {
  deleteProcessorPromptOptions,
  discardProcessorChangesPromptOptions,
} from './prompt_options';
import type { ProcessingStep } from './state_management/processing_flyout_machine';

const STATUS_COLORS: Record<CatalogueComponentStatus, string> = {
  stable: 'success',
  beta: 'hollow',
  experimental: 'warning',
  deprecated: 'danger',
};

const processorLabel = i18n.translate('xpack.streams.processingFlyout.editor.processorLabel', {
  defaultMessage: 'Processor',
});

const processorTelemetry = (
  component: CatalogueComponentSummary | undefined,
  targetTelemetry: readonly UnitSignal[]
): UnitSignal[] =>
  component
    ? targetTelemetry.filter((signal) => component.supported_telemetry.includes(signal))
    : [...targetTelemetry];

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
  telemetry: readonly UnitSignal[];
  componentRefs: readonly ComponentReferenceOption[];
  onCommit: (processor: DraftProcessor) => void;
  onCancel: () => void;
  /** Deletes the step being edited; omitted when creating a processor. */
  onDelete?: () => void;
}

export function ProcessorEditor({
  catalogue,
  step,
  telemetry,
  componentRefs,
  onCommit,
  onCancel,
  onDelete,
}: ProcessorEditorProps) {
  const processors = useMemo(() => listComponents(catalogue, 'processor'), [catalogue]);
  const [type, setType] = useState<string | undefined>(
    () => step?.processor.type ?? (processors.length === 1 ? processors[0].type : undefined)
  );
  const component = processors.find((candidate) => candidate.type === type);
  const definition = type ? getDefinition(catalogue, 'processor', type) : undefined;
  const signals = useMemo(
    () => step?.processor.supported_telemetry ?? processorTelemetry(component, telemetry),
    [component, step, telemetry]
  );
  const context = useMemo(
    () => ({ metadata: catalogue.metadata, telemetry: signals }),
    [catalogue.metadata, signals]
  );

  const initial = useMemo(() => fromConfigEntries(step?.processor.config), [step]);
  const scopedNames = useMemo(() => new Set(initial.scoped.map(({ name }) => name)), [initial]);
  const [values, setValues] = useState<ObjectValue>(() =>
    step || !definition
      ? initial.values
      : createInitialObject(definition.fields, undefined, context)
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [hasUnparsedInput, setHasUnparsedInput] = useState(false);

  const handleCancel = useDiscardConfirm(onCancel, {
    enabled: isDirty,
    ...discardProcessorChangesPromptOptions,
  });
  const handleDelete = useDiscardConfirm(() => onDelete?.(), deleteProcessorPromptOptions);

  const options = useMemo(() => processors.map(toOption), [processors]);
  const [isSelectionCleared, setIsSelectionCleared] = useState(false);
  const selectedOptions = isSelectionCleared ? [] : options.filter(({ value }) => value === type);

  const changeType = (nextType: string) => {
    const nextDefinition = getDefinition(catalogue, 'processor', nextType);
    const nextComponent = processors.find((candidate) => candidate.type === nextType);
    setType(nextType);
    setErrors({});
    setSubmitted(false);
    setIsDirty(true);
    setValues(
      nextDefinition
        ? createInitialObject(nextDefinition.fields, undefined, {
            metadata: catalogue.metadata,
            telemetry: processorTelemetry(nextComponent, telemetry),
          })
        : {}
    );
  };

  const onValuesChange = (next: ObjectValue) => {
    setValues(next);
    setIsDirty(true);
    if (submitted && definition) {
      setErrors(validateValues(definition.fields, next, context, scopedNames));
    }
  };

  const submit = () => {
    if (!definition || !type || hasUnparsedInput) {
      return;
    }
    const nextErrors = validateValues(definition.fields, values, context, scopedNames);
    setSubmitted(true);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    onCommit({
      ...(step?.processor ?? {}),
      type,
      supported_telemetry: signals,
      config: toConfigEntries(definition.fields, values, initial.scoped, signals),
    });
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
                    changeType(selected.value);
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
                title={i18n.translate('xpack.streams.processingFlyout.editor.unknownTypeTitle', {
                  defaultMessage: 'This processor type is not available to configure here',
                })}
                data-test-subj="streamsProcessingFlyoutUnknownType"
                text={i18n.translate('xpack.streams.processingFlyout.editor.unknownTypeBody', {
                  defaultMessage:
                    'Its configuration is kept as it is. Edit it in the YAML configuration instead.',
                })}
              />
            ) : null}
            {definition && signals.length === 0 ? (
              <KbnWarningCallout
                announceOnMount
                size="s"
                title={i18n.translate('xpack.streams.processingFlyout.editor.noTelemetryTitle', {
                  defaultMessage: '{processor} does not support the signals that flow here',
                  values: { processor: definition.display_name },
                })}
              />
            ) : null}
            {definition && signals.length > 0 ? (
              <ComponentDefinitionForm
                definition={definition}
                metadata={catalogue.metadata}
                telemetry={signals}
                values={values}
                errors={errors}
                componentRefs={componentRefs}
                onChange={onValuesChange}
                onUnparsedInputChange={setHasUnparsedInput}
              />
            ) : null}
          </EuiForm>
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
                    isDisabled={!definition || signals.length === 0 || hasUnparsedInput}
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
