/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiHorizontalRule, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { useFormContext, useWatch } from 'react-hook-form';
import { load as parseYaml } from 'js-yaml';
import { ParsedTemplateDefinitionSchema } from '../../../../common/types/domain/template/v1';
import { TemplateFieldRenderer } from '../field_types/field_renderer';
import { TemplateMetadataPreview } from './template_metadata_preview';
import * as i18n from '../translations';

const fieldsSectionStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
});

export const TemplatePreview = () => {
  const { control } = useFormContext();
  const values = useWatch({ control, defaultValue: { definition: '' } });

  const parsedTemplate = useMemo(() => {
    try {
      const parsedDefinition = parseYaml(values.definition);
      return ParsedTemplateDefinitionSchema.safeParse(parsedDefinition);
    } catch (error: unknown) {
      if (error instanceof Error) {
        return {
          success: false,
          data: undefined,
          error: {
            message: error?.message,
          },
        };
      }

      return {
        success: false,
        data: undefined,
        error: {
          message: 'Unknown error occurred during template parse phase',
        },
      };
    }
  }, [values.definition]);

  const parsedTemplateData = parsedTemplate.success ? parsedTemplate.data : undefined;

  if (!parsedTemplateData) {
    return (
      <div>
        <pre>{JSON.stringify(parsedTemplate.error, null, 2)}</pre>
      </div>
    );
  }

  return (
    <div>
      <TemplateMetadataPreview parsedTemplate={parsedTemplateData} />

      {parsedTemplateData.fields.length > 0 && (
        <>
          <EuiHorizontalRule margin="m" />
          <div css={fieldsSectionStyles}>
            <EuiText size="xs" color="subdued">
              <strong>{i18n.TEMPLATE_FIELDS_LABEL}</strong>
            </EuiText>
            <TemplateFieldRenderer parsedTemplate={parsedTemplateData} />
          </div>
        </>
      )}
    </div>
  );
};

TemplatePreview.displayName = 'TemplatePreview';
