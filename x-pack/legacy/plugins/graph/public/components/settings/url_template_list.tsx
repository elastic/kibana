/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiText, EuiSpacer, EuiTextAlign, EuiButton, htmlIdGenerator } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SettingsProps } from './settings';
import { UrlTemplateForm } from './url_template_form';
import { useListKeys } from './use_list_keys';

const generateId = htmlIdGenerator();

export function UrlTemplateList({
  removeTemplate,
  saveTemplate,
  urlTemplates,
}: Pick<SettingsProps, 'removeTemplate' | 'saveTemplate' | 'urlTemplates'>) {
  const [uncommittedForms, setUncommittedForms] = useState<string[]>([]);
  const getListKey = useListKeys(urlTemplates);

  function removeUncommittedForm(id: string) {
    setUncommittedForms(uncommittedForms.filter(formId => formId !== id));
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
      {urlTemplates.map((template, index) => (
        <UrlTemplateForm
          key={getListKey(template)}
          id={getListKey(template)}
          initialTemplate={template}
          onSubmit={newTemplate => {
            saveTemplate({ index, template: newTemplate });
          }}
          onRemove={() => {
            removeTemplate(template);
          }}
        />
      ))}

      {uncommittedForms.map(id => (
        <UrlTemplateForm
          id={`accordion-new-${id}`}
          key={id}
          onSubmit={newTemplate => {
            saveTemplate({ index: -1, template: newTemplate });
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
          iconType="plusInCircle"
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
