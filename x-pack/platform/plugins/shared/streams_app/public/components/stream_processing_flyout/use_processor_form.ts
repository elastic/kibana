/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { uniq } from 'lodash';
import type {
  CatalogueComponentDefinition,
  CatalogueComponentSummary,
  ComponentCatalogue,
} from '@kbn/streams-schema';
import { getDefinition, listComponents } from '../../services/component_catalogue';
import type { UnitSignal } from '../../services/unit_pipeline';
import type { DraftProcessor } from '../../services/unit_processing';
import {
  createInitialObject,
  fromConfigEntries,
  toConfigEntries,
  trimItemScopes,
  validateItemScopes,
  validateValues,
  type FieldErrors,
  type ObjectValue,
} from '../component_definition_form';
import type { ProcessingStep } from './state_management/processing_flyout_machine';

/** The signals flowing through the slot that the processor type can carry. */
const flowingSignals = (
  definition: CatalogueComponentDefinition | undefined,
  targetTelemetry: readonly UnitSignal[]
): UnitSignal[] =>
  definition
    ? targetTelemetry.filter((signal) => definition.supported_telemetry.includes(signal))
    : [...targetTelemetry];

/** The signals a new processor of this type starts with. */
const defaultSignals = (
  definition: CatalogueComponentDefinition | undefined,
  targetTelemetry: readonly UnitSignal[]
): UnitSignal[] => {
  const flowing = flowingSignals(definition, targetTelemetry);
  if (!definition || flowing.length === 0) {
    return flowing;
  }
  // An instance of a `fixed` component must enable every signal the component supports.
  if (definition.telemetry_selection === 'fixed') {
    return [...definition.supported_telemetry];
  }
  const limit = definition.max_selected_telemetry;
  // Over the limit the user chooses, rather than Kibana dropping signals for them.
  return limit !== undefined && flowing.length > limit ? [] : flowing;
};

const signalsError = (
  definition: CatalogueComponentDefinition,
  signals: readonly UnitSignal[]
): string | undefined => {
  if (signals.length === 0) {
    return i18n.translate('xpack.streams.processingFlyout.editor.signalsRequired', {
      defaultMessage: 'Choose at least one signal',
    });
  }
  const limit = definition.max_selected_telemetry;
  return definition.telemetry_selection === 'configurable' &&
    limit !== undefined &&
    signals.length > limit
    ? i18n.translate('xpack.streams.processingFlyout.editor.signalsTooMany', {
        defaultMessage: 'Choose at most {limit, plural, one {# signal} other {# signals}}',
        values: { limit },
      })
    : undefined;
};

export interface ProcessorForm {
  /** Processor types the catalogue offers. */
  processors: CatalogueComponentSummary[];
  type?: string;
  component?: CatalogueComponentSummary;
  definition?: CatalogueComponentDefinition;
  signals: UnitSignal[];
  /** Signals the user may pick from: those flowing here plus any the processor already enables. */
  signalOptions: UnitSignal[];
  /** The type supports none of the signals flowing here. */
  doesNotFit: boolean;
  canChooseSignals: boolean;
  /** Why the chosen signals are not acceptable, once the user has touched them or submitted. */
  signalsError?: string;
  values: ObjectValue;
  errors: FieldErrors;
  isDirty: boolean;
  /** Everything a commit needs is in place; the check may still reject it. */
  canSubmit: boolean;
  changeType: (type: string) => void;
  setSignals: (signals: UnitSignal[]) => void;
  setValues: (values: ObjectValue) => void;
  setHasUnparsedInput: (hasUnparsedInput: boolean) => void;
  /** Shows errors the configuration service reported on fields, next to any client errors. */
  addErrors: (errors: FieldErrors) => void;
  /** Validates everything and shows what is wrong; returns the processor when nothing is. */
  validate: () => DraftProcessor | undefined;
}

/** The state of a processor being created or edited: its type, signals and configuration. */
export const useProcessorForm = ({
  catalogue,
  step,
  telemetry,
}: {
  catalogue: ComponentCatalogue;
  step?: ProcessingStep;
  telemetry: readonly UnitSignal[];
}): ProcessorForm => {
  const processors = useMemo(() => listComponents(catalogue, 'processor'), [catalogue]);
  const [type, setType] = useState<string | undefined>(
    () => step?.processor.type ?? (processors.length === 1 ? processors[0].type : undefined)
  );
  const component = processors.find((candidate) => candidate.type === type);
  const definition = type ? getDefinition(catalogue, 'processor', type) : undefined;
  const [signals, setSignalsState] = useState<UnitSignal[]>(
    () => step?.processor.supported_telemetry ?? defaultSignals(definition, telemetry)
  );
  const [signalsTouched, setSignalsTouched] = useState(false);
  // Signals an existing processor enables stay listed even when they no longer flow here. They
  // come from the processor as opened, not the current choice, so clearing the choice keeps them.
  const openedSignals = step?.processor.supported_telemetry;
  const signalOptions = useMemo(
    () => uniq([...flowingSignals(definition, telemetry), ...(openedSignals ?? [])]),
    [definition, openedSignals, telemetry]
  );
  const doesNotFit = definition !== undefined && signalOptions.length === 0;
  const canChooseSignals =
    definition?.telemetry_selection === 'configurable' && signalOptions.length > 1;
  const signalsProblem = definition && !doesNotFit ? signalsError(definition, signals) : undefined;
  const context = useMemo(
    () => ({ metadata: catalogue.metadata, telemetry: signals }),
    [catalogue.metadata, signals]
  );

  const initial = useMemo(() => fromConfigEntries(step?.processor.config), [step]);
  const scopedNames = useMemo(() => new Set(initial.scoped.map(({ name }) => name)), [initial]);
  const [values, setValuesState] = useState<ObjectValue>(() =>
    step || !definition
      ? initial.values
      : createInitialObject(definition.fields, undefined, context)
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [hasUnparsedInput, setHasUnparsedInput] = useState(false);

  /** Client-side errors for the form as it is now. */
  const validateForm = (
    nextValues: ObjectValue,
    nextSignals: readonly UnitSignal[]
  ): FieldErrors => {
    if (!definition) {
      return {};
    }
    const nextContext = { metadata: catalogue.metadata, telemetry: nextSignals };
    // Before the first submit, only item scopes the processor's signals no longer cover are shown.
    return submitted
      ? validateValues(definition.fields, nextValues, nextContext, scopedNames)
      : validateItemScopes(definition.fields, nextValues, nextContext);
  };

  const changeType = (nextType: string) => {
    const nextDefinition = getDefinition(catalogue, 'processor', nextType);
    const nextSignals = defaultSignals(nextDefinition, telemetry);
    setType(nextType);
    setSignalsState(nextSignals);
    setSignalsTouched(false);
    setErrors({});
    setSubmitted(false);
    setIsDirty(true);
    setValuesState(
      nextDefinition
        ? createInitialObject(nextDefinition.fields, undefined, {
            metadata: catalogue.metadata,
            telemetry: nextSignals,
          })
        : {}
    );
  };

  const setValues = (next: ObjectValue) => {
    setValuesState(next);
    setIsDirty(true);
    setErrors(validateForm(next, signals));
  };

  const setSignals = (next: UnitSignal[]) => {
    setSignalsState(next);
    setSignalsTouched(true);
    setIsDirty(true);
    if (!definition) {
      return;
    }
    const nextValues = next.length > 0 ? trimItemScopes(definition.fields, values, next) : values;
    setValuesState(nextValues);
    setErrors(validateForm(nextValues, next));
  };

  const validate = (): DraftProcessor | undefined => {
    if (!definition || !type || hasUnparsedInput) {
      return undefined;
    }
    const nextErrors = validateValues(definition.fields, values, context, scopedNames);
    setSubmitted(true);
    setSignalsTouched(true);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || signalsProblem) {
      return undefined;
    }
    return {
      ...(step?.processor ?? {}),
      type,
      supported_telemetry: signals,
      config: toConfigEntries(definition.fields, values, initial.scoped, signals),
    };
  };

  return {
    processors,
    type,
    component,
    definition,
    signals,
    signalOptions,
    doesNotFit,
    canChooseSignals,
    signalsError: signalsTouched ? signalsProblem : undefined,
    values,
    errors,
    isDirty,
    canSubmit: definition !== undefined && !doesNotFit && signals.length > 0 && !hasUnparsedInput,
    changeType,
    setSignals,
    setValues,
    setHasUnparsedInput,
    addErrors: (fieldErrors) => setErrors((current) => ({ ...current, ...fieldErrors })),
    validate,
  };
};
