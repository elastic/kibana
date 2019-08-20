/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect, useState, Fragment } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiPageBody, EuiPageContent, EuiSpacer, EuiTitle } from '@elastic/eui';
import { TemplateForm, SectionLoading, SectionError } from '../../components';
import { setBreadcrumbs } from '../../services/set_breadcrumbs';
import { Template } from '../../../common/types';
import { saveTemplate, loadIndexTemplate } from '../../services/api';
import { BASE_PATH } from '../../../common/constants';

const DEFAULT_TEMPLATE: Template = {
  name: '',
  indexPatterns: [],
  version: '',
  order: '',
  settings: undefined,
  mappings: undefined,
  aliases: undefined,
};

interface MatchParams {
  name: string;
}

export const TemplateClone: React.FunctionComponent<RouteComponentProps<MatchParams>> = ({
  match: {
    params: { name },
  },
  history,
}) => {
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<any>(null);

  const { error: templateToCloneError, data: templateToClone, isLoading } = loadIndexTemplate(name);

  const onSave = async (template: Template) => {
    setIsSaving(true);
    setSaveError(null);

    const { error } = await saveTemplate(template, true);

    setIsSaving(false);

    if (error) {
      setSaveError(error);
      return;
    }

    history.push(`${BASE_PATH}templates`);
  };

  const clearSaveError = () => {
    setSaveError(null);
  };

  const renderTemplateForm = (templateData: Template) => {
    return (
      <TemplateForm
        template={templateData}
        onSave={onSave}
        isSaving={isSaving}
        saveError={saveError}
        clearSaveError={clearSaveError}
      />
    );
  };

  let content;

  useEffect(() => {
    setBreadcrumbs('templateClone');
  }, []);

  if (isLoading) {
    content = (
      <SectionLoading>
        <FormattedMessage
          id="xpack.idxMgmt.templateCreate.loadingTemplateToCloneDescription"
          defaultMessage="Loading template to clone…"
        />
      </SectionLoading>
    );
  } else if (templateToCloneError) {
    // If error, display callout, but allow user to proceed with default create flow
    content = (
      <Fragment>
        <SectionError
          title={
            <FormattedMessage
              id="xpack.idxMgmt.templateCreate.loadingTemplateToCloneErrorMessage"
              defaultMessage="Error loading template to clone"
            />
          }
          error={templateToCloneError}
          data-test-subj="sectionError"
        />
        <EuiSpacer size="l" />
        {renderTemplateForm(DEFAULT_TEMPLATE)}
      </Fragment>
    );
  } else if (templateToClone) {
    const templateData = {
      ...templateToClone,
      ...{ name: `${name}-copy` },
    } as Template;

    content = renderTemplateForm(templateData);
  }

  return (
    <EuiPageBody>
      <EuiPageContent>
        <EuiTitle size="l">
          <h1 data-test-subj="pageTitle">
            <FormattedMessage
              id="xpack.idxMgmt.createTemplate.cloneTemplatePageTitle"
              defaultMessage="Clone template '{name}'"
              values={{ name }}
            />
          </h1>
        </EuiTitle>
        <EuiSpacer size="l" />
        {content}
      </EuiPageContent>
    </EuiPageBody>
  );
};
