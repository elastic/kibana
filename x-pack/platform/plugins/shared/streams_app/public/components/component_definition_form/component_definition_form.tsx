/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef } from 'react';
import { useGeneratedHtmlId } from '@elastic/eui';
import type {
  CatalogueComponentDefinition,
  CatalogueFieldGroup,
  CatalogueMetadata,
  CatalogueSignal,
} from '@kbn/streams-schema';
import { FieldSections } from './field_sections';
import {
  DefinitionFormContext,
  type ComponentReferenceOption,
  type DefinitionFormContextValue,
} from './form_context';
import type { FieldErrors, ObjectValue } from './values';

const NO_ERRORS: FieldErrors = {};
const NO_REFS: readonly ComponentReferenceOption[] = [];
const NO_GROUPS: readonly CatalogueFieldGroup[] = [];

export interface ComponentDefinitionFormProps {
  definition: CatalogueComponentDefinition;
  metadata: CatalogueMetadata;
  /** Raw form values keyed by top-level parameter name (unscoped config entries). */
  values: ObjectValue;
  onChange: (values: ObjectValue) => void;
  /** Signals the component is configured for; filters enum and path options. */
  telemetry: readonly CatalogueSignal[];
  errors?: FieldErrors;
  componentRefs?: readonly ComponentReferenceOption[];
  /**
   * Called when the form starts or stops holding input it could not parse. The
   * values then still carry the last parsed input, so it must not be committed.
   */
  onUnparsedInputChange?: (hasUnparsedInput: boolean) => void;
}

/** Renders a configuration form from a catalogue component definition. */
export function ComponentDefinitionForm({
  definition,
  metadata,
  values,
  onChange,
  telemetry,
  errors = NO_ERRORS,
  componentRefs = NO_REFS,
  onUnparsedInputChange,
}: ComponentDefinitionFormProps) {
  const idPrefix = useGeneratedHtmlId({ prefix: `componentDefinitionForm-${definition.type}` });
  const unparsedControlIds = useRef(new Set<string>());
  const reportUnparsedInput = useCallback(
    (controlId: string, isUnparsed: boolean) => {
      const ids = unparsedControlIds.current;
      const hadUnparsed = ids.size > 0;
      if (isUnparsed) {
        ids.add(controlId);
      } else {
        ids.delete(controlId);
      }
      if (hadUnparsed !== ids.size > 0) {
        onUnparsedInputChange?.(ids.size > 0);
      }
    },
    [onUnparsedInputChange]
  );
  const groups = definition.groups ?? NO_GROUPS;
  const context = useMemo<DefinitionFormContextValue>(
    () => ({ metadata, telemetry, errors, componentRefs, groups, idPrefix, reportUnparsedInput }),
    [componentRefs, errors, groups, idPrefix, metadata, reportUnparsedInput, telemetry]
  );

  return (
    <DefinitionFormContext.Provider value={context}>
      <div data-test-subj={`componentDefinitionForm-${definition.kind}-${definition.type}`}>
        <FieldSections fields={definition.fields} value={values} onChange={onChange} pointer="" />
      </div>
    </DefinitionFormContext.Provider>
  );
}
