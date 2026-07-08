/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiEmptyPrompt, EuiHorizontalRule, EuiText, EuiSpacer } from '@elastic/eui';
import { useFormContext, useWatch } from 'react-hook-form';
import { parse as parseYaml } from 'yaml';
import type {
  TemplateSettings,
  ParsedTemplateDefinition,
} from '../../../../common/types/domain/template/v1';
import { ParsedTemplateDefinitionSchema } from '../../../../common/types/domain/template/v1';
import type { CaseConnectorWithoutName } from '../../../../common/types/domain_zod/connector/v1';
import type { CaseAssignees } from '../../../../common/types/domain_zod/user/v1';
import { TemplateFieldRenderer } from '../field_types/field_renderer';
import { TemplateCaseDefaultsForm } from './template_case_defaults_form';
import * as i18n from '../translations';
import { normalizeTemplateCaseDefaultsForValidation } from '../utils/normalize_template_case_defaults';

type EditableCaseDefaultField =
  | 'name'
  | 'description'
  | 'severity'
  | 'category'
  | 'tags'
  | 'assignees';

interface TemplatePreviewProps {
  settings?: TemplateSettings;
  connector?: CaseConnectorWithoutName;
  onFieldDefaultChange?: (fieldName: string, value: string, control: string) => void;
  onCaseDefaultChange?: (
    field: EditableCaseDefaultField,
    value: string | string[] | CaseAssignees
  ) => void;
}

export const TemplatePreview: React.FC<TemplatePreviewProps> = ({
  settings,
  connector,
  onFieldDefaultChange,
  onCaseDefaultChange,
}) => {
  const { control } = useFormContext();
  const values = useWatch({ control, defaultValue: { definition: '' } });

  const isEmpty = !values.definition || values.definition.trim() === '';

  const parsedTemplate = useMemo(() => {
    try {
      if (!values.definition || values.definition.trim() === '') {
        return {
          success: false,
          data: undefined,
          error: {
            message: 'Template definition is empty',
          },
        } as const;
      }

      const parsedDefinition = parseYaml(values.definition);

      if (!parsedDefinition || typeof parsedDefinition !== 'object') {
        return {
          success: false,
          data: undefined,
          error: {
            message: 'Invalid YAML: parsed to null or non-object',
          },
        } as const;
      }

      return ParsedTemplateDefinitionSchema.safeParse(
        normalizeTemplateCaseDefaultsForValidation(parsedDefinition)
      );
    } catch (error: unknown) {
      if (error instanceof Error) {
        return {
          success: false,
          data: undefined,
          error: {
            message: error?.message,
          },
        } as const;
      }

      return {
        success: false,
        data: undefined,
        error: {
          message: 'Unknown error occurred during template parse phase',
        },
      } as const;
    }
  }, [values.definition]);

  // Nothing entered yet: neutral empty state.
  if (isEmpty) {
    return (
      <EuiEmptyPrompt
        data-test-subj="templatePreviewEmpty"
        iconType="eye"
        color="subdued"
        paddingSize="m"
        titleSize="xs"
        title={<h3>{i18n.PREVIEW_EMPTY_TITLE}</h3>}
        body={<p>{i18n.PREVIEW_EMPTY_BODY}</p>}
      />
    );
  }

  // Definition present but not parseable: the errors prevent rendering the fields,
  // so surface a clear, actionable error instead of a stale or blank panel.
  if (!parsedTemplate.success || !parsedTemplate.data) {
    return (
      <EuiEmptyPrompt
        data-test-subj="templatePreviewError"
        iconType="warning"
        color="warning"
        paddingSize="m"
        titleSize="xs"
        title={<h3>{i18n.PREVIEW_UNAVAILABLE_TITLE}</h3>}
        body={<p>{i18n.PREVIEW_UNAVAILABLE_BODY}</p>}
      />
    );
  }

  const parsedTemplateData = parsedTemplate.data;
  const previewDefinition: ParsedTemplateDefinition = {
    ...parsedTemplateData,
    settings: settings ?? parsedTemplateData.settings,
    connector: connector ?? parsedTemplateData.connector,
  };

  return (
    <div>
      <EuiText size="xs" color="subdued">
        <strong>{i18n.CASE_DEFAULTS_SECTION_TITLE}</strong>
      </EuiText>
      <EuiSpacer size="s" />
      <TemplateCaseDefaultsForm parsedTemplate={previewDefinition} onChange={onCaseDefaultChange} />

      {previewDefinition.fields.length > 0 && (
        <>
          <EuiHorizontalRule margin="m" />
          <EuiText size="xs" color="subdued">
            <strong>{i18n.TEMPLATE_FIELDS_LABEL}</strong>
          </EuiText>
          <EuiSpacer size="s" />
          <TemplateFieldRenderer
            parsedTemplate={previewDefinition}
            onFieldDefaultChange={onFieldDefaultChange}
          />
        </>
      )}
    </div>
  );
};

TemplatePreview.displayName = 'TemplatePreview';
