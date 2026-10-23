/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef } from 'react';
import { EuiAccordion, useEuiTheme, useGeneratedHtmlId } from '@elastic/eui';
import { css } from '@emotion/react';
import type {
  CatalogueComponentDefinition,
  CatalogueMetadata,
  CatalogueSignal,
} from '@kbn/streams-schema';
import { FieldList } from './field_list';
import {
  DefinitionFormContext,
  type ComponentReferenceOption,
  type DefinitionFormContextValue,
} from './form_context';
import { layoutSections } from './layout';
import { errorsUnder, joinPointer, type FieldErrors, type ObjectValue } from './values';

const NO_ERRORS: FieldErrors = {};
const NO_REFS: readonly ComponentReferenceOption[] = [];

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
  const { euiTheme } = useEuiTheme();
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
  const context = useMemo<DefinitionFormContextValue>(
    () => ({ metadata, telemetry, errors, componentRefs, idPrefix, reportUnparsedInput }),
    [componentRefs, errors, idPrefix, metadata, reportUnparsedInput, telemetry]
  );
  const sections = useMemo(
    () => layoutSections(definition.fields, definition.groups),
    [definition.fields, definition.groups]
  );
  const groupBodyStyles = css`
    border-left: ${euiTheme.border.thin};
    margin-left: ${euiTheme.size.m};
    padding-top: ${euiTheme.size.m};
    padding-left: calc(${euiTheme.size.m} + ${euiTheme.size.xs});
  `;

  return (
    <DefinitionFormContext.Provider value={context}>
      <div data-test-subj={`componentDefinitionForm-${definition.kind}-${definition.type}`}>
        {sections.map(({ group, fields }) => {
          const list = <FieldList fields={fields} value={values} onChange={onChange} pointer="" />;
          if (!group) {
            return <React.Fragment key="ungrouped">{list}</React.Fragment>;
          }
          const hasErrors = fields.some(({ name }) => errorsUnder(errors, joinPointer('', name)));
          return (
            <EuiAccordion
              key={group.id}
              id={`${idPrefix}-${group.id}`}
              element="fieldset"
              paddingSize="none"
              buttonContent={group.label}
              initialIsOpen={!group.advanced || hasErrors}
              data-test-subj={`componentDefinitionFormGroup-${group.id}`}
            >
              <div css={groupBodyStyles}>{list}</div>
            </EuiAccordion>
          );
        })}
      </div>
    </DefinitionFormContext.Provider>
  );
}
