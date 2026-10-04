/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiText, EuiSpacer, EuiTextAlign, EuiButton, htmlIdGenerator } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SettingsStateProps } from './settings';
import { UrlTemplateForm } from './url_template_form';

const generateId = htmlIdGenerator();

export function UrlTemplateList({
  removeTemplate,
  saveTemplate,
  urlTemplates,
}: Pick<SettingsStateProps, 'removeTemplate' | 'saveTemplate' | 'urlTemplates'>) {
  const [uncommittedForms, setUncommittedForms] = useState<string[]>([]);

  function removeUncommittedForm(id: string) {
    setUncommittedForms(uncommittedForms.filter((formId) => formId !== id));
  }

  return (
    <>
      <EuiText size="s">
        {i18n.translate('xpack.graph.drilldowns.description', {
          defaultMessage:
            'Use drilldowns to link to other applications. The selected vertices become part of the URL.',
        })}
      </EuiText>
      <EuiSpacer />
      {urlTemplates.map(({ id, ...template }) => {
        const formId = `accordion-template-${id}`;
        return (
          <UrlTemplateForm
            key={id}
            id={formId}
            initialTemplate={template}
            onSubmit={(newTemplate) => {
              saveTemplate({ id, template: newTemplate });
            }}
            onRemove={() => {
              removeTemplate(id);
            }}
          />
        );
      })}

      {uncommittedForms.map((id) => (
        <UrlTemplateForm
          id={`accordion-new-${id}`}
          key={id}
          onSubmit={(newTemplate) => {
            saveTemplate({ template: newTemplate });
            removeUncommittedForm(id);
          }}
          onRemove={removeUncommittedForm.bind(undefined, id)}
        />
      ))}

      <EuiSpacer />

      <EuiTextAlign textAlign="center">
        <EuiButton
          size="s"
          fill
          iconType="plusCircle"
          data-test-subj="graphAddNewTemplate"
          onClick={() => {
            setUncommittedForms([...uncommittedForms, generateId()]);
          }}
        >
          {i18n.translate('xpack.graph.templates.newTemplateFormLabel', {
            defaultMessage: 'Add drilldown',
          })}
        </EuiButton>
      </EuiTextAlign>
    </>
  );
}
