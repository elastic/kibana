/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useMemo, useRef } from 'react';
import type { z } from '@kbn/zod/v4';
import { FormProvider, useForm, useFormContext, useWatch } from 'react-hook-form';
import { useEuiTheme } from '@elastic/eui';
import type { ParsedTemplateDefinitionSchema } from '../../../../common/types/domain/template/latest';
import type { InlineField } from '../../../../common/types/domain/template/fields';
import { isDisplayOnlyField } from '../../../../common/types/domain/template/fields';
import { CASE_EXTENDED_FIELDS } from '../../../../common/constants';
import { controlRegistry } from './field_types_registry';
import { evaluateCondition } from '../../../../common/types/domain/template/evaluate_conditions';
import { useYamlFormSync } from './hooks/use_yaml_form_sync';
import { getFieldSnakeKey } from '../../../../common/utils';
import { getYamlDefaultAsString } from '../utils';
import { useResolvedFields } from '../../field_library/hooks/use_resolved_fields';
import { useCasesContext } from '../../cases_context/use_cases_context';

type ParsedTemplateDefinition = z.infer<typeof ParsedTemplateDefinitionSchema>;

export interface TemplateFieldRendererProps {
  parsedTemplate: ParsedTemplateDefinition;
  owner?: string;
  onFieldDefaultChange?: (fieldName: string, value: string, control: string) => void;
}

interface TemplateFieldRowProps {
  field: InlineField;
  Control: FC<Record<string, unknown>>;
  value: unknown;
  isRequired: boolean;
  isRequiredOnClose: boolean;
  onFieldConfirm?: (fieldName: string, fieldType: string) => void;
  isSaving: boolean;
  isSaveDisabled: boolean;
  marginBottom: string;
}

/**
 * Builds the initial `extended_fields` form defaults from resolved fields. Display-only fields
 * (e.g. MARKDOWN) hold no form value and are excluded, so they never seed an `extended_fields` key.
 */
export const buildInitialDefaultValues = (
  resolvedFields: InlineField[]
): Record<string, Record<string, string>> => {
  const defaults: Record<string, Record<string, string>> = {
    [CASE_EXTENDED_FIELDS]: {},
  };
  for (const field of resolvedFields) {
    if (!isDisplayOnlyField(field)) {
      const yamlDefault = getYamlDefaultAsString(field.metadata?.default);
      const fieldKey = getFieldSnakeKey(field.name, field.type);
      defaults[CASE_EXTENDED_FIELDS][fieldKey] = yamlDefault;
    }
  }
  return defaults;
};

/** Prevents a field value change from re-rendering sibling controls. */
const TemplateFieldRow: FC<TemplateFieldRowProps> = React.memo(
  ({
    field,
    Control,
    value,
    isRequired,
    isRequiredOnClose,
    onFieldConfirm,
    isSaving,
    isSaveDisabled,
    marginBottom,
  }) => {
    const handleConfirm = useCallback(() => {
      onFieldConfirm?.(field.name, field.type);
    }, [onFieldConfirm, field.name, field.type]);

    const controlProps = {
      ...field,
      label: field.label ?? field.name,
      value,
      isRequired,
      isRequiredOnClose,
      patternValidation: field.validation?.pattern,
      min: field.validation?.min,
      max: field.validation?.max,
      minLength: field.validation?.min_length,
      maxLength: field.validation?.max_length,
      onConfirm: onFieldConfirm ? handleConfirm : undefined,
      isSaving,
      isSaveDisabled,
    };

    return (
      <div data-test-subj={`template-field-${field.name}`} css={{ marginBottom }}>
        <Control {...controlProps} />
      </div>
    );
  }
);
TemplateFieldRow.displayName = 'TemplateFieldRow';

export const FieldsRenderer: FC<{
  resolvedFields: InlineField[];
  onFieldConfirm?: (fieldName: string, fieldType: string) => void;
  savingFieldKey?: string;
}> = ({ resolvedFields, onFieldConfirm, savingFieldKey }) => {
  const { euiTheme } = useEuiTheme();
  const { control } = useFormContext();

  const fieldTypeMap = useMemo(
    () => Object.fromEntries(resolvedFields.map((f) => [f.name, f.type])),
    [resolvedFields]
  );

  const fieldControlMap = useMemo(
    () => Object.fromEntries(resolvedFields.map((f) => [f.name, f.control])),
    [resolvedFields]
  );

  const allFieldPaths = useMemo(
    () => resolvedFields.map((f) => `${CASE_EXTENDED_FIELDS}.${getFieldSnakeKey(f.name, f.type)}`),
    [resolvedFields]
  );

  const watchedValues = useWatch({ control, name: allFieldPaths });

  const fieldValues = useMemo(() => {
    return Object.fromEntries(resolvedFields.map((f, i) => [f.name, watchedValues?.[i]]));
  }, [watchedValues, resolvedFields]);

  return (
    <>
      {resolvedFields.map((field) => {
        if (field.display?.show_when) {
          const shouldShow = evaluateCondition(
            field.display.show_when,
            fieldValues,
            fieldTypeMap,
            fieldControlMap
          );
          if (!shouldShow) return null;
        }

        const isRequired =
          field.validation?.required === true ||
          (field.validation?.required_when
            ? evaluateCondition(
                field.validation.required_when,
                fieldValues,
                fieldTypeMap,
                fieldControlMap
              )
            : false);

        // Required-on-close is not required *now* (so the field stays fillable), but the label must
        // say so rather than "Optional". Only surfaced when the field isn't already required.
        const isRequiredOnClose = !isRequired && field.validation?.required_on_close === true;

        const Control = controlRegistry[field.control] as unknown as FC<Record<string, unknown>>;
        if (!Control) return null;

        return (
          <TemplateFieldRow
            key={field.name}
            field={field}
            Control={Control}
            value={fieldValues[field.name]}
            isRequired={isRequired}
            isRequiredOnClose={isRequiredOnClose}
            onFieldConfirm={onFieldConfirm}
            isSaving={savingFieldKey === getFieldSnakeKey(field.name, field.type)}
            isSaveDisabled={savingFieldKey != null}
            marginBottom={euiTheme.size.m}
          />
        );
      })}
    </>
  );
};

FieldsRenderer.displayName = 'FieldsRenderer';

const TemplateFieldRendererInner: FC<{
  resolvedFields: InlineField[];
  onFieldDefaultChange?: (fieldName: string, value: string, control: string) => void;
}> = ({ resolvedFields, onFieldDefaultChange }) => {
  const initialDefaultValues = React.useMemo(
    () => buildInitialDefaultValues(resolvedFields),
    [resolvedFields]
  );

  const form = useForm({
    defaultValues: initialDefaultValues,
  });

  useYamlFormSync(form, resolvedFields, onFieldDefaultChange);

  return (
    <FormProvider {...form}>
      <FieldsRenderer resolvedFields={resolvedFields} />
    </FormProvider>
  );
};

TemplateFieldRendererInner.displayName = 'TemplateFieldRendererInner';

/**
 * Renders extended fields inside the template YAML editor preview. Owns its
 * own RHF form and bidirectionally syncs with the YAML defaults via
 * useYamlFormSync.
 */
export const TemplateFieldRenderer: FC<TemplateFieldRendererProps> = ({
  parsedTemplate,
  owner,
  onFieldDefaultChange,
}) => {
  const { owner: contextOwner } = useCasesContext();
  const resolvedOwner = owner ?? contextOwner[0];
  const { resolvedFields, isLoading } = useResolvedFields(parsedTemplate.fields, resolvedOwner);

  // Full-content signature — changes whenever the resolved fields actually change, INCLUDING a
  // default value. Drives the stable-reference update below so external default edits (typed in the
  // YAML editor) flow into the live inner form via useYamlFormSync.
  const contentKey = useMemo(
    () => resolvedFields.map((f) => JSON.stringify(f)).join('|'),
    [resolvedFields]
  );

  // Structural signature — deliberately EXCLUDES metadata.default (the two-way-bound value the user
  // edits in the preview). Only this gates the remount `key` below: keying on the default would
  // remount the inner form on every keystroke / date click once the debounced YAML round-trip lands,
  // stealing input focus and closing the date-picker popover. Structural changes (fields
  // added/removed/renamed, control/type/options/validation/display) still change it and correctly
  // rebuild the form. useYamlFormSync already syncs default changes into the mounted form.
  const structuralKey = useMemo(
    () =>
      resolvedFields
        .map((field) => {
          const metadataWithoutDefault: Record<string, unknown> = { ...(field.metadata ?? {}) };
          delete metadataWithoutDefault.default;
          return JSON.stringify({ ...field, metadata: metadataWithoutDefault });
        })
        .join('|'),
    [resolvedFields]
  );

  // Stabilize the resolvedFields reference — only update when content actually changes (contentKey),
  // not on every identical re-parse. This keeps useYamlFormSync effects from re-running needlessly
  // while still handing the inner form fresh defaults when they genuinely change.
  const stableResolvedFieldsRef = useRef(resolvedFields);
  const prevContentKeyRef = useRef(contentKey);
  if (prevContentKeyRef.current !== contentKey) {
    prevContentKeyRef.current = contentKey;
    stableResolvedFieldsRef.current = resolvedFields;
  }

  if (isLoading) return null;

  return (
    <TemplateFieldRendererInner
      key={structuralKey}
      resolvedFields={stableResolvedFieldsRef.current}
      onFieldDefaultChange={onFieldDefaultChange}
    />
  );
};

TemplateFieldRenderer.displayName = 'TemplateFieldRenderer';
