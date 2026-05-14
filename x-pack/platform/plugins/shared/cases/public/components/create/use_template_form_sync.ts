/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { load as parseYaml } from 'js-yaml';
import { useFormContext, useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { ParsedTemplate } from '../../../common/types/domain/template/v1';
import { CASE_EXTENDED_FIELDS } from '../../../common/constants';
import { useGetTemplate } from '../templates_v2/hooks/use_get_template';
import { useParentTemplateDefinition } from '../templates_v2/hooks/use_parent_template_definition';
import { mergeTemplateDefinitions } from '../templates_v2/utils/merge_template_definitions';
import { getFieldSnakeKey } from '../../../common/utils';
import { getYamlDefaultAsString } from '../templates_v2/utils';
import {
  FieldSchema,
  isInlineField,
  isRefField,
} from '../../../common/types/domain/template/fields';
import type { InlineField } from '../../../common/types/domain/template/fields';
import { useGetFieldDefinitions } from '../field_library/hooks/use_get_field_definitions';

interface UseTemplateFormSyncReturn {
  template: ParsedTemplate | undefined;
  isLoading: boolean;
}

export const useTemplateFormSync = (): UseTemplateFormSyncReturn => {
  const { setFieldValue } = useFormContext();
  const [{ templateId }] = useFormData<{ templateId?: string }>({ watch: ['templateId'] });
  const { data: template, isLoading } = useGetTemplate(templateId || undefined);
  const { data: fieldDefsData, isLoading: isLoadingFieldDefs } = useGetFieldDefinitions({
    owner: template?.owner,
  });
  const { definition: parentDefinition, isFetched: parentFetched } = useParentTemplateDefinition(
    template?.definition?.extends
  );
  const appliedRef = useRef<string | undefined>(undefined);
  const appliedFieldsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!templateId) {
      if (appliedRef.current) {
        appliedRef.current = undefined;
        setFieldValue('description', '');
        setFieldValue('tags', []);
        setFieldValue('severity', 'low');
        setFieldValue('category', null);

        // Clear previously applied extended fields
        for (const fieldPath of appliedFieldsRef.current) {
          setFieldValue(fieldPath, '');
        }
        appliedFieldsRef.current = [];
      }
      return;
    }

    if (!template || template.templateId !== templateId) {
      return;
    }

    const { definition } = template;
    const parentId = definition.extends;
    // Wait until the parent query settles (success or error) before applying.
    // parentFetched is false only while the query is in-flight; once it resolves
    // (even as a 404/error), we proceed — possibly without parent fields.
    if (parentId && !parentFetched) {
      return;
    }
    const key = `${template.templateId}:${template.templateVersion}:${parentId ?? ''}:${String(
      parentFetched
    )}`;
    if (appliedRef.current === key) {
      return;
    }

    const fieldMappings: Array<[string, unknown]> = [
      ['title', definition.name],
      ['description', definition.description],
      ['tags', definition.tags?.length ? definition.tags : undefined],
      ['severity', definition.severity],
      ['category', definition.category],
    ];

    for (const [fieldName, value] of fieldMappings) {
      if (value !== undefined) {
        setFieldValue(fieldName, value);
      }
    }

    // Wait for field definitions to load before applying extended field defaults.
    // Do NOT set appliedRef.current yet — the effect must re-run once defs are available.
    if (isLoadingFieldDefs) return;

    // Merge parent fields (if `extends` is set) with the template's own fields
    const effectiveDefinition = parentDefinition
      ? mergeTemplateDefinitions(parentDefinition, definition)
      : definition;

    // Resolve all fields — inline fields pass through, ref fields are looked up in the library
    const libraryDefs = fieldDefsData?.fieldDefinitions ?? [];
    const resolvedFields = (effectiveDefinition.fields ?? []).flatMap((field): InlineField[] => {
      if (isInlineField(field)) return [field];
      const fd = libraryDefs.find((d) => d.name === field.$ref);
      if (!fd) return [];
      try {
        const parsed = parseYaml(fd.definition);
        const result = FieldSchema.safeParse(parsed);
        if (!result.success || isRefField(result.data)) return [];
        const inlineField = result.data as InlineField;
        return [
          field.name && field.name !== inlineField.name
            ? { ...inlineField, name: field.name }
            : inlineField,
        ];
      } catch {
        return [];
      }
    });

    const newAppliedFields: string[] = [];
    for (const field of resolvedFields) {
      const fieldPath = `${CASE_EXTENDED_FIELDS}.${getFieldSnakeKey(field.name, field.type)}`;
      const defaultValue = getYamlDefaultAsString(field.metadata?.default);
      setFieldValue(fieldPath, defaultValue);
      newAppliedFields.push(fieldPath);
    }
    appliedFieldsRef.current = newAppliedFields;
    appliedRef.current = key;
  }, [
    templateId,
    template,
    parentDefinition,
    parentFetched,
    setFieldValue,
    fieldDefsData,
    isLoadingFieldDefs,
  ]);

  return { template, isLoading };
};
