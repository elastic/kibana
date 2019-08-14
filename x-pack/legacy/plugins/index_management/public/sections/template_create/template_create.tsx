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
import { saveTemplate, loadTemplateToClone } from '../../services/api';
import { BASE_PATH } from '../../../common/constants';

interface MatchParams {
  name: string;
}

const defaultTemplate: Template = {
  name: '',
  indexPatterns: [],
  version: '',
  order: '',
  settings: undefined,
  mappings: undefined,
  aliases: undefined,
};

export const TemplateCreate: React.FunctionComponent<RouteComponentProps<MatchParams>> = ({
  match: {
    params: { name },
  },
  history,
}) => {
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadTemplateError, setLoadTemplateError] = useState<any>(null);
  const [templateToClone, setTemplateToClone] = useState<any>(null);

  const fetchTemplateToClone = async () => {
    setIsLoading(true);
    setLoadTemplateError(null);

    const { data: templateToCloneData, error } = await loadTemplateToClone(name);

    setIsLoading(false);
    setLoadTemplateError(error);
    setTemplateToClone(templateToCloneData);
  };

  const onSave = async (template: Template) => {
    const isClone = Boolean(name);

    setIsSaving(true);
    setSaveError(null);

    const { error } = await saveTemplate(template, isClone);

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

  const renderTemplateForm = (templateData?: Template) => {
    return (
      <TemplateForm
        template={templateData ? templateData : defaultTemplate}
        onSave={onSave}
        isSaving={isSaving}
        saveError={saveError}
        clearSaveError={clearSaveError}
      />
    );
  };

  let content;

  useEffect(() => {
    const breadcrumbName = name ? 'templateClone' : 'templateCreate';
    setBreadcrumbs(breadcrumbName);

    if (name) {
      fetchTemplateToClone();
    }
  }, []);

  // If name param provided, we are cloning a template and need to fetch the template to clone
  if (name) {
    if (isLoading) {
      content = (
        <SectionLoading>
          <FormattedMessage
            id="xpack.idxMgmt.templateCreate.loadingTemplateToCloneDescription"
            defaultMessage="Loading template to clone…"
          />
        </SectionLoading>
      );
    } else if (loadTemplateError) {
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
            error={loadTemplateError}
            data-test-subj="sectionError"
          />
          <EuiSpacer size="l" />
          {renderTemplateForm()}
        </Fragment>
      );
    } else if (templateToClone) {
      const { indexPatterns, aliases } = defaultTemplate;

      // Reset name, index patterns and aliases on clone
      const templateData = {
        ...templateToClone,
        ...{ name: `${name}-copy`, indexPatterns, aliases },
      };

      content = renderTemplateForm(templateData);
    }
  } else {
    content = renderTemplateForm();
  }

  return (
    <EuiPageBody>
      <EuiPageContent>
        <EuiTitle size="m">
          <h1 data-test-subj="pageTitle">
            {name ? (
              <FormattedMessage
                id="xpack.idxMgmt.createTemplate.cloneTemplatePageTitle"
                defaultMessage="Clone template '{name}'"
                values={{ name }}
              />
            ) : (
              <FormattedMessage
                id="xpack.idxMgmt.createTemplate.createTemplatePageTitle"
                defaultMessage="Create template"
              />
            )}
          </h1>
        </EuiTitle>
        <EuiSpacer size="l" />
        {content}
      </EuiPageContent>
    </EuiPageBody>
  );
};
