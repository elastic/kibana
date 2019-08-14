/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect, useState } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiPageBody, EuiPageContent, EuiTitle, EuiSpacer } from '@elastic/eui';
import { BASE_PATH } from '../../../common/constants';
import { setBreadcrumbs } from '../../services/set_breadcrumbs';
import { loadIndexTemplate, updateTemplate } from '../../services/api';
import { SectionLoading, SectionError, TemplateForm } from '../../components';
import { Template } from '../../../common/types';

interface MatchParams {
  name: string;
}

export const TemplateEdit: React.FunctionComponent<RouteComponentProps<MatchParams>> = ({
  match: {
    params: { name },
  },
  history,
}) => {
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<any>(null);

  const { error, data: template, isLoading } = loadIndexTemplate(name);

  useEffect(() => {
    setBreadcrumbs('templateEdit');
  }, []);

  const onSave = async (updatedTemplate: Template) => {
    setIsSaving(true);
    setSaveError(null);

    const { error: saveErrorObject } = await updateTemplate(updatedTemplate);

    setIsSaving(false);

    if (saveErrorObject) {
      setSaveError(saveErrorObject);
      return;
    }

    history.push(`${BASE_PATH}templates/${name}`);
  };

  const clearSaveError = () => {
    setSaveError(null);
  };

  let content;

  if (isLoading) {
    content = (
      <SectionLoading>
        <FormattedMessage
          id="xpack.idxMgmt.templateEdit.loadingIndexTemplateDescription"
          defaultMessage="Loading index template…"
        />
      </SectionLoading>
    );
  } else if (error) {
    content = (
      <SectionError
        title={
          <FormattedMessage
            id="xpack.idxMgmt.templateEdit.loadingIndexTemplateErrorMessage"
            defaultMessage="Error loading index template"
          />
        }
        error={error}
        data-test-subj="sectionError"
      />
    );
  } else if (template) {
    content = (
      <TemplateForm
        template={template}
        onSave={onSave}
        isSaving={isSaving}
        saveError={saveError}
        clearSaveError={clearSaveError}
        isEditing={true}
      />
    );
  }

  return (
    <EuiPageBody>
      <EuiPageContent>
        <EuiTitle size="m">
          <h1 data-test-subj="pageTitle">
            <FormattedMessage
              id="xpack.idxMgmt.editTemplate.editTemplatePageTitle"
              defaultMessage="Edit template '{name}'"
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
