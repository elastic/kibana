/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { RouteComponentProps } from 'react-router-dom';
import { EuiEmptyPrompt, EuiLink, EuiButton } from '@elastic/eui';

import { reactRouterNavigate } from '../shared_imports';
import { useComponentTemplatesContext } from '../component_templates_context';

interface Props {
  history: RouteComponentProps['history'];
}

export const EmptyPrompt: FunctionComponent<Props> = ({ history }) => {
  const { documentation } = useComponentTemplatesContext();

  return (
    <EuiEmptyPrompt
      iconType="managementApp"
      data-test-subj="emptyList"
      title={
        <h2 data-test-subj="title">
          {i18n.translate('xpack.idxMgmt.home.componentTemplates.emptyPromptTitle', {
            defaultMessage: 'Start by creating a component template',
          })}
        </h2>
      }
      body={
        <p>
          <FormattedMessage
            id="xpack.idxMgmt.home.componentTemplates.emptyPromptDescription"
            defaultMessage="For example, you can create a component template for index settings that can be reused across index templates."
          />
          <br />
          <EuiLink href={documentation.componentTemplates} target="_blank" external>
            {i18n.translate('xpack.idxMgmt.home.componentTemplates.emptyPromptDocumentionLink', {
              defaultMessage: 'Learn more.',
            })}
          </EuiLink>
        </p>
      }
      actions={
        <EuiButton
          {...reactRouterNavigate(history, '/create_component_template')}
          iconType="plusInCircle"
          fill
        >
          {i18n.translate('xpack.idxMgmt.home.componentTemplates.emptyPromptButtonLabel', {
            defaultMessage: 'Create a component template',
          })}
        </EuiButton>
      }
    />
  );
};
