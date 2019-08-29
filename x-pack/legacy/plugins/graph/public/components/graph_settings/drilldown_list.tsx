/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiListGroup, EuiListGroupItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { GraphSettingsProps } from './graph_settings';
import { UrlTemplate } from '../../types';
import { LegacyIcon } from './legacy_icon';
import { getOutlinkEncoders } from '../../services/outlink_encoders';
import { DrilldownForm } from './drilldown_form';

const encoders = getOutlinkEncoders();

export function DrilldownList({
  removeUrlTemplate,
  saveUrlTemplate,
  urlTemplates,
}: Pick<GraphSettingsProps, 'removeUrlTemplate' | 'saveUrlTemplate' | 'urlTemplates'>) {
  const [selectedTemplate, setSelectedTemplate] = useState<
    undefined | { index: number; template: UrlTemplate }
  >(undefined);

  if (selectedTemplate) {
    const { index, template } = selectedTemplate;
    function setValue<K extends keyof UrlTemplate>(key: K, value: UrlTemplate[K]) {
      setSelectedTemplate({ index, template: { ...template, [key]: value } });
    }
    return (
      <DrilldownForm
        template={template}
        setValue={setValue}
        onSubmit={() => {
          saveUrlTemplate(index, template);
          setSelectedTemplate(undefined);
        }}
        onGoBack={() => {
          setSelectedTemplate(undefined);
        }}
      />
    );
  } else {
    return (
      <>
        <EuiText size="s">
          {i18n.translate('xpack.graph.drilldowns.description', {
            defaultMessage:
              'Drilldown links configured here can be used to link to other applications and carry over the selected nodes as part of the URL',
          })}
        </EuiText>
        <EuiListGroup>
          {urlTemplates.map((template, index) => (
            <EuiListGroupItem
              icon={
                template.icon ? (
                  <>
                    <LegacyIcon icon={template.icon} />
                    &nbsp;
                  </>
                ) : (
                  undefined
                )
              }
              iconType={template.icon ? undefined : 'empty'}
              onClick={() => {
                // shallow-clone template to edit
                setSelectedTemplate({ index, template: { ...template } });
              }}
              key={index}
              label={template.description}
              extraAction={{
                iconType: 'trash',
                'aria-label': i18n.translate('xpack.graph.templates.removeLabel', {
                  defaultMessage: 'Remove',
                }),
                alwaysShow: true,
                onClick: () => {
                  removeUrlTemplate(template);
                },
              }}
            />
          ))}
          <EuiListGroupItem
            onClick={() => {
              setSelectedTemplate({
                index: -1,
                template: {
                  encoder: encoders[0],
                  icon: null,
                  description: '',
                  url: '',
                },
              });
            }}
            iconType="plusInCircle"
            label={i18n.translate('xpack.graph.templates.addLabel', {
              defaultMessage: 'Create new template',
            })}
          />
        </EuiListGroup>
      </>
    );
  }
}
