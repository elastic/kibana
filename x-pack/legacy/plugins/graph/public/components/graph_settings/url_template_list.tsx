/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { EuiText, EuiAccordion, EuiSpacer, EuiIcon, EuiTextAlign, EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { GraphSettingsProps } from './graph_settings';
import { UrlTemplateForm } from './url_template_form';
import { useListKeys } from './use_list_keys';

export function UrlTemplateList({
  removeUrlTemplate,
  saveUrlTemplate,
  urlTemplates,
}: Pick<GraphSettingsProps, 'removeUrlTemplate' | 'saveUrlTemplate' | 'urlTemplates'>) {
  const getListKey = useListKeys(urlTemplates);

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
        <Fragment key={getListKey(template)}>
          <EuiAccordion
            id={getListKey(template)}
            buttonContent={template.description}
            // TODO: Change the icon below to the template.icon
            extraAction={<EuiIcon type="alert" />}
            className="gphSettingsAccordion"
            buttonClassName="gphSettingsAccordion__button"
            onToggle={isOpen => {
              /* TODO: Use this to set a classname .gphSettingsAccordion-isOpen for the background color change */
            }}
            paddingSize="m"
          >
            <UrlTemplateForm
              initialTemplate={template}
              onSubmit={newTemplate => {
                saveUrlTemplate(index, newTemplate);
              }}
              onRemove={() => {
                removeUrlTemplate(template);
              }}
            />
          </EuiAccordion>
        </Fragment>
      ))}

      {/* TODO: Only show the following accordion when the user clicked "Add template" and auto-expand */}
      <EuiAccordion
        id="accordion-new"
        buttonContent={i18n.translate('xpack.graph.templates.addLabel', {
          defaultMessage: 'New template',
        })}
        className="gphSettingsAccordion"
        buttonClassName="gphSettingsAccordion__button"
        paddingSize="m"
      >
        <UrlTemplateForm
          onSubmit={newTemplate => {
            saveUrlTemplate(-1, newTemplate);
          }}
        />
      </EuiAccordion>

      <EuiSpacer />

      {/* TODO: Hook this up */}
      <EuiTextAlign textAlign="center">
        <EuiButton size="s" fill iconType="plusInCircle">
          Add template
        </EuiButton>
      </EuiTextAlign>
    </>
  );
}
