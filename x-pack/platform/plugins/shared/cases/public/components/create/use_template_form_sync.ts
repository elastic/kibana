/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { useFormContext, useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { ParsedTemplate } from '../../../common/types/domain/template/v1';
import { CASE_EXTENDED_FIELDS } from '../../../common/constants';
import { useGetTemplate } from '../templates_v2/hooks/use_get_template';
import { getFieldSnakeKey } from '../../../common/utils';
import { getYamlDefaultAsString } from '../templates_v2/utils';

interface UseTemplateFormSyncReturn {
  template: ParsedTemplate | undefined;
  isLoading: boolean;
}

export const useTemplateFormSync = (): UseTemplateFormSyncReturn => {
  const { setFieldValue } = useFormContext();
  const [{ templateId }] = useFormData<{ templateId?: string }>({ watch: ['templateId'] });
  const { data: template, isLoading } = useGetTemplate(templateId || undefined);
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

    const key = `${template.templateId}:${template.templateVersion}`;
    if (appliedRef.current === key) {
      return;
    }
    appliedRef.current = key;

    const { definition } = template;
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

    // Apply default values for extended fields
    const newAppliedFields: string[] = [];
    if (template.definition.fields) {
      for (const field of template.definition.fields) {
        const fieldPath = `${CASE_EXTENDED_FIELDS}.${getFieldSnakeKey(field.name, field.type)}`;
        const defaultValue = getYamlDefaultAsString(field.metadata?.default);
        setFieldValue(fieldPath, defaultValue);
        newAppliedFields.push(fieldPath);
      }
    }
    appliedFieldsRef.current = newAppliedFields;
  }, [templateId, template, setFieldValue]);

  return { template, isLoading };
};
