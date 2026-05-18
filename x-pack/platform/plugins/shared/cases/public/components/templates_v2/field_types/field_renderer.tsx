/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo, useRef } from 'react';
import { css } from '@emotion/react';
import type { z } from '@kbn/zod/v4';
import { EuiIconTip, useEuiTheme } from '@elastic/eui';
import type { FormHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  FormProvider,
  useForm,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { ParsedTemplateDefinitionSchema } from '../../../../common/types/domain/template/latest';
import type { InlineField } from '../../../../common/types/domain/template/fields';
import { CASE_EXTENDED_FIELDS } from '../../../../common/constants';
import { controlRegistry } from './field_types_registry';
import { evaluateCondition } from '../../../../common/types/domain/template/evaluate_conditions';
import { useYamlFormSync } from './hooks/use_yaml_form_sync';
import { getFieldSnakeKey } from '../../../../common/utils';
import { getYamlDefaultAsString } from '../utils';
import { useResolvedFields } from '../../field_library/hooks/use_resolved_fields';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { INHERITED_FIELD_TOOLTIP } from '../translations';

type ParsedTemplateDefinition = z.infer<typeof ParsedTemplateDefinitionSchema>;

export interface TemplateFieldRendererProps {
  parsedTemplate: ParsedTemplateDefinition;
  owner?: string;
  onFieldDefaultChange?: (fieldName: string, value: string, control: string) => void;
  parentFieldNames?: Set<string>;
  parentTemplateName?: string;
}

export const FieldsRenderer: FC<{
  resolvedFields: InlineField[];
  form: FormHook<{}>;
  parentFieldNames?: Set<string>;
  parentTemplateName?: string;
}> = ({ resolvedFields, form, parentFieldNames, parentTemplateName }) => {
  const { euiTheme } = useEuiTheme();

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

  const [formData] = useFormData({ form, watch: allFieldPaths });

  const fieldValues = useMemo(() => {
    const extendedFields =
      (formData as Record<string, Record<string, unknown>>)?.[CASE_EXTENDED_FIELDS] ?? {};
    return Object.fromEntries(
      resolvedFields.map((f) => [f.name, extendedFields[getFieldSnakeKey(f.name, f.type)]])
    );
  }, [formData, resolvedFields]);

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

        const Control = controlRegistry[field.control] as unknown as FC<Record<string, unknown>>;
        if (!Control) return null;

        const controlProps = {
          ...field,
          label: field.label ?? field.name,
          value: fieldValues[field.name],
          isRequired,
          patternValidation: field.validation?.pattern,
          min: field.validation?.min,
          max: field.validation?.max,
          minLength: field.validation?.min_length,
          maxLength: field.validation?.max_length,
        };

        const isInherited = parentFieldNames?.has(field.name) ?? false;

        const fieldLabel =
          isInherited && parentTemplateName ? (
            <span css={css({ display: 'inline-flex', alignItems: 'center', gap: '4px' })}>
              {field.label ?? field.name}
              <EuiIconTip
                content={INHERITED_FIELD_TOOLTIP(parentTemplateName)}
                type="info"
                size="s"
                color="subdued"
                data-test-subj={`inherited-field-icon-${field.name}`}
              />
            </span>
          ) : (
            field.label ?? field.name
          );

        return (
          <div
            key={field.name}
            data-test-subj={`template-field-${field.name}`}
            css={{ marginBottom: euiTheme.size.m }}
          >
            <Control {...controlProps} label={fieldLabel} />
          </div>
        );
      })}
    </>
  );
};

FieldsRenderer.displayName = 'FieldsRenderer';

const TemplateFieldRendererInner: FC<{
  resolvedFields: InlineField[];
  parsedTemplate: ParsedTemplateDefinition;
  onFieldDefaultChange?: (fieldName: string, value: string, control: string) => void;
  parentFieldNames?: Set<string>;
  parentTemplateName?: string;
}> = ({
  resolvedFields,
  parsedTemplate,
  onFieldDefaultChange,
  parentFieldNames,
  parentTemplateName,
}) => {
  const initialDefaultValues = React.useMemo(() => {
    const defaults: Record<string, Record<string, string>> = {
      [CASE_EXTENDED_FIELDS]: {},
    };
    for (const field of resolvedFields) {
      const yamlDefault = getYamlDefaultAsString(field.metadata?.default);
      const fieldKey = getFieldSnakeKey(field.name, field.type);
      defaults[CASE_EXTENDED_FIELDS][fieldKey] = yamlDefault;
    }
    return defaults;
  }, [resolvedFields]);

  const { form } = useForm<{}>({
    defaultValue: initialDefaultValues,
    options: { stripEmptyFields: false },
  });

  useYamlFormSync(form, resolvedFields, onFieldDefaultChange);

  return (
    <FormProvider key={parsedTemplate.name} form={form}>
      <FieldsRenderer
        resolvedFields={resolvedFields}
        form={form}
        parentFieldNames={parentFieldNames}
        parentTemplateName={parentTemplateName}
      />
    </FormProvider>
  );
};

TemplateFieldRendererInner.displayName = 'TemplateFieldRendererInner';

/**
 * WARN: this component uses shared-form renderer for Case form compatiblity.
 * Dont change this until we migrate everything to react hook form.
 */
export const TemplateFieldRenderer: FC<TemplateFieldRendererProps> = ({
  parsedTemplate,
  owner,
  onFieldDefaultChange,
  parentFieldNames,
  parentTemplateName,
}) => {
  const { owner: contextOwner } = useCasesContext();
  const resolvedOwner = owner ?? contextOwner[0];
  const { resolvedFields, isLoading } = useResolvedFields(parsedTemplate.fields, resolvedOwner);

  // Content-based key to detect real field definition changes (vs same-content re-parses).
  const fieldsKey = useMemo(
    () => resolvedFields.map((f) => JSON.stringify(f)).join('|'),
    [resolvedFields]
  );

  // Stabilize the resolvedFields reference — only update when content actually changes.
  // This prevents useYamlFormSync effects from re-running when identical YAML is re-parsed
  // into a new object reference (e.g. on every keystroke in the YAML editor).
  const stableResolvedFieldsRef = useRef(resolvedFields);
  const prevFieldsKeyRef = useRef(fieldsKey);
  if (prevFieldsKeyRef.current !== fieldsKey) {
    prevFieldsKeyRef.current = fieldsKey;
    stableResolvedFieldsRef.current = resolvedFields;
  }

  if (isLoading) return null;

  return (
    <TemplateFieldRendererInner
      key={fieldsKey}
      resolvedFields={stableResolvedFieldsRef.current}
      parsedTemplate={parsedTemplate}
      onFieldDefaultChange={onFieldDefaultChange}
      parentFieldNames={parentFieldNames}
      parentTemplateName={parentTemplateName}
    />
  );
};

TemplateFieldRenderer.displayName = 'TemplateFieldRenderer';
