/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import { FormattedMessage } from '@kbn/i18n/react';

import { EuiEmptyPrompt } from '@elastic/eui';

import { SectionError, SectionLoading } from '../../../components';
import { loadIndexTemplates } from '../../../services/api';

export const TemplatesList: React.FunctionComponent = () => {
  const { error, isLoading, data: templates } = loadIndexTemplates();

  let content;

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
  } else if (templates && templates.length === 0) {
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
  } else {
    content = <Fragment>{/* TODO Index templates table */} index template list</Fragment>;
  }

  return <section data-test-subj="indexTemplatesList">{content}</section>;
};
