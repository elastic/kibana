/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiListGroup, EuiText, EuiAccordion, EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { GraphSettingsProps } from './graph_settings';
import { getOutlinkEncoders } from '../../services/outlink_encoders';
import { DrilldownForm } from './drilldown_form';

const encoders = getOutlinkEncoders();

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
      {urlTemplates.map((template, index) => (
        <EuiAccordion
          id={`accordion-${index}`}
          buttonContent={template.description}
          extraAction={
            <EuiButtonIcon
              iconType="trash"
              color="danger"
              size="s"
              onClick={() => {
                removeUrlTemplate(template);
              }}
            />
          }
        >
          <DrilldownForm
            initialTemplate={template}
            onSubmit={newTemplate => {
              saveUrlTemplate(index, newTemplate);
            }}
          />
        </EuiAccordion>
      ))}
      <EuiAccordion
        id={`accordion--1`}
        buttonContent={i18n.translate('xpack.graph.templates.addLabel', {
          defaultMessage: 'Create new template',
        })}
      >
        <DrilldownForm
          initialTemplate={{
            encoder: encoders[0],
            icon: null,
            description: '',
            url: '',
          }}
          onSubmit={newTemplate => {
            saveUrlTemplate(-1, newTemplate);
          }}
        />
      </EuiAccordion>
    </>
  );
}
