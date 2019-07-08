/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiEmptyPrompt, EuiSpacer, EuiTitle, EuiText, EuiSwitch } from '@elastic/eui';
import { SectionError, SectionLoading } from '../../../components';
import { TemplatesTable } from './templates_table';
import { loadIndexTemplates } from '../../../services/api';
import { Template } from '../../../../common/types';

export const TemplatesList: React.FunctionComponent = () => {
  const { error, isLoading, data: templates, createRequest: reload } = loadIndexTemplates();

  let content;

  const [showSystemTemplates, setShowSystemTemplates] = useState<boolean>(false);

  if (isLoading) {
    content = (
      <SectionLoading>
        <FormattedMessage
          id="xpack.idxMgmt.indexTemplatesList.loadingIndexTemplatesDescription"
          defaultMessage="Loading index templates…"
        />
      </SectionLoading>
    );
  } else if (error) {
    content = (
      <SectionError
        title={
          <FormattedMessage
            id="xpack.idxMgmt.indexTemplatesList.loadingIndexTemplatesErrorMessage"
            defaultMessage="Error loading index templates"
          />
        }
        error={error}
      />
    );
  } else if (Array.isArray(templates) && templates.length === 0) {
    content = (
      <EuiEmptyPrompt
        iconType="managementApp"
        title={
          <h1 data-test-subj="title">
            <FormattedMessage
              id="xpack.idxMgmt.indexTemplatesList.emptyPrompt.noIndexTemplatesTitle"
              defaultMessage="You don't have any index templates yet"
            />
          </h1>
        }
        data-test-subj="emptyPrompt"
      />
    );
  } else if (Array.isArray(templates) && templates.length > 0) {
    // Filter out system index templates
    const filteredTemplates = templates.filter(
      (template: Template) => !template.name.startsWith('.')
    );

    content = (
      <Fragment>
        <EuiTitle size="s">
          <EuiText color="subdued">
            <FormattedMessage
              id="xpack.idxMgmt.home.indexTemplatesDescription"
              defaultMessage="Use index templates to automatically apply mappings and other properties to new indices."
            />
          </EuiText>
        </EuiTitle>
        <EuiSpacer size="l" />
        <EuiSwitch
          id="checkboxShowSystemIndexTemplates"
          checked={showSystemTemplates}
          onChange={event => setShowSystemTemplates(event.target.checked)}
          label={
            <FormattedMessage
              id="xpack.idxMgmt.indexTemplatesTable.systemIndexTemplatesSwitchLabel"
              defaultMessage="Include system index templates"
            />
          }
        />
        <EuiSpacer size="l" />
        <TemplatesTable
          templates={showSystemTemplates ? templates : filteredTemplates}
          reload={reload}
        />
      </Fragment>
    );
  }

  return <section data-test-subj="templatesList">{content}</section>;
};
