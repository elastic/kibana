/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { useFormContext, useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { ParsedTemplate } from '../../../common/types/domain/template/v1';
import { useGetTemplate } from '../templates_v2/hooks/use_get_template';

interface UseTemplateFormSyncReturn {
  template: ParsedTemplate | undefined;
  isLoading: boolean;
}

export const useTemplateFormSync = (): UseTemplateFormSyncReturn => {
  const { setFieldValue } = useFormContext();
  const [{ templateId }] = useFormData<{ templateId?: string }>({ watch: ['templateId'] });
  const { data: template, isLoading } = useGetTemplate(templateId || undefined);
  const appliedRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!templateId) {
      if (appliedRef.current) {
        appliedRef.current = undefined;
        setFieldValue('description', '');
        setFieldValue('tags', []);
        setFieldValue('severity', 'low');
        setFieldValue('category', null);
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

    if (template.definition.name) {
      setFieldValue('title', template.definition.name);
    }
    if (template.definition.description) {
      setFieldValue('description', template.definition.description);
    }
    if (template.definition.tags?.length) {
      setFieldValue('tags', template.definition.tags);
    }
    if (template.definition.severity) {
      setFieldValue('severity', template.definition.severity);
    }
    if (template.definition.category) {
      setFieldValue('category', template.definition.category);
    }
  }, [templateId, template, setFieldValue]);

  return { template, isLoading };
};
