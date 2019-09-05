/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiText, EuiAccordion, EuiButtonIcon, EuiSpacer, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { GraphSettingsProps } from './graph_settings';
import { DrilldownForm } from './drilldown_form';

export function DrilldownList({
  removeUrlTemplate,
  saveUrlTemplate,
  urlTemplates,
}: Pick<GraphSettingsProps, 'removeUrlTemplate' | 'saveUrlTemplate' | 'urlTemplates'>) {
  return (
    <>
      <EuiText size="s">
        {i18n.translate('xpack.graph.drilldowns.description', {
          defaultMessage:
            'Drilldown links configured here can be used to link to other applications and carry over the selected nodes as part of the URL',
        })}
      </EuiText>
      <EuiSpacer />
      {urlTemplates.map((template, index) => (
        <>
          <EuiAccordion
            id={`accordion-${index}-${template.description}`}
            buttonContent={template.description}
            className="gphSettingsAccordion"
            buttonClassName="gphSettingsAccordion__button"
          >
            <DrilldownForm
              initialTemplate={template}
              onSubmit={newTemplate => {
                saveUrlTemplate(index, newTemplate);
              }}
              onRemove={() => {
                removeUrlTemplate(template);
              }}
            />
          </EuiAccordion>
          <EuiSpacer />
        </>
      ))}
      <EuiAccordion
        id={`accordion--1`}
        buttonContent={i18n.translate('xpack.graph.templates.addLabel', {
          defaultMessage: 'New template',
        })}
        className="gphSettingsAccordion"
        buttonClassName="gphSettingsAccordion__button"
        extraAction={<EuiIcon type="plusInCircleFilled" color="primary" />}
      >
        <DrilldownForm
          onSubmit={newTemplate => {
            saveUrlTemplate(-1, newTemplate);
          }}
        />
      </EuiAccordion>
    </>
  );
}
