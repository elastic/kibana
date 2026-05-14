/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiCallOut, EuiSpacer, EuiTitle } from '@elastic/eui';
import { useFormContext, useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { useTemplateFormSync } from './use_template_form_sync';
import * as i18n from './translations';
import { FieldsRenderer } from '../templates_v2/field_types/field_renderer';
import { useResolvedFields } from '../field_library/hooks/use_resolved_fields';

export const CreateCaseTemplateFields: React.FC = () => {
  const form = useFormContext();
  const [{ templateId }] = useFormData<{ templateId?: string }>({ watch: ['templateId'] });
  const { template, isLoading } = useTemplateFormSync();

  const { resolvedFields, isLoading: isLoadingFields } = useResolvedFields(
    template?.definition?.fields ?? [],
    template?.owner
  );

  const fieldsFragment = useMemo(() => {
    if (!resolvedFields.length) {
      return null;
    }

    return <FieldsRenderer form={form} resolvedFields={resolvedFields} />;
  }, [resolvedFields, form]);

  if (isLoading || isLoadingFields) {
    return null;
  }

  if (!templateId || template?.definition?.fields === undefined) {
    return (
      <>
        <EuiSpacer />
        <EuiCallOut announceOnMount title={i18n.TEMPLATE_NOT_SELECTED_TITLE} size="s">
          <p>{i18n.TEMPLATE_NOT_SELECTED_DESCRIPTION}</p>
        </EuiCallOut>
      </>
    );
  }

  return (
    <>
      <EuiSpacer />
      <EuiTitle size="s">
        <h4>{i18n.EXTENDED_FIELDS_TITLE}</h4>
      </EuiTitle>
      <EuiSpacer />
      {fieldsFragment}
    </>
  );
};

CreateCaseTemplateFields.displayName = 'CreateCaseTemplateFields';
