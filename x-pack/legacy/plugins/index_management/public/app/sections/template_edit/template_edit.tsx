/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect, useState, Fragment } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiPageBody, EuiPageContent, EuiTitle, EuiSpacer, EuiCallOut } from '@elastic/eui';
import { breadcrumbService } from '../../services/breadcrumbs';
import { loadIndexTemplate, updateTemplate } from '../../services/api';
import { decodePath, getTemplateDetailsLink } from '../../services/routing';
import { SectionLoading, SectionError, TemplateForm, Error } from '../../components';
import { Template } from '../../../../common/types';

interface MatchParams {
  name: string;
}

export const TemplateEdit: React.FunctionComponent<RouteComponentProps<MatchParams>> = ({
  match: {
    params: { name },
  },
  history,
}) => {
  const decodedTemplateName = decodePath(name);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<any>(null);

  const { error, data: template, isLoading } = loadIndexTemplate(decodedTemplateName);

  useEffect(() => {
    breadcrumbService.setBreadcrumbs('templateEdit');
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

    history.push(getTemplateDetailsLink(name));
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
          defaultMessage="Loading template…"
        />
      </SectionLoading>
    );
  } else if (error) {
    content = (
      <SectionError
        title={
          <FormattedMessage
            id="xpack.idxMgmt.templateEdit.loadingIndexTemplateErrorMessage"
            defaultMessage="Error loading template"
          />
        }
        error={error as Error}
        data-test-subj="sectionError"
      />
    );
  } else if (template) {
    const { name: templateName, isManaged } = template;
    const isSystemTemplate = templateName && templateName.startsWith('.');

    if (isManaged) {
      content = (
        <EuiCallOut
          title={
            <FormattedMessage
              id="xpack.idxMgmt.templateEdit.managedTemplateWarningTitle"
              defaultMessage="Editing a managed template is not permitted"
            />
          }
          color="danger"
          iconType="alert"
          data-test-subj="systemTemplateEditCallout"
        >
          <FormattedMessage
            id="xpack.idxMgmt.templateEdit.managedTemplateWarningDescription"
            defaultMessage="Managed templates are critical for internal operations."
          />
        </EuiCallOut>
      );
    } else {
      content = (
        <Fragment>
          {isSystemTemplate && (
            <Fragment>
              <EuiCallOut
                title={
                  <FormattedMessage
                    id="xpack.idxMgmt.templateEdit.systemTemplateWarningTitle"
                    defaultMessage="Editing a system template can break Kibana"
                  />
                }
                color="danger"
                iconType="alert"
                data-test-subj="systemTemplateEditCallout"
              >
                <FormattedMessage
                  id="xpack.idxMgmt.templateEdit.systemTemplateWarningDescription"
                  defaultMessage="System templates are critical for internal operations."
                />
              </EuiCallOut>
              <EuiSpacer size="l" />
            </Fragment>
          )}
          <TemplateForm
            defaultValue={template}
            onSave={onSave}
            isSaving={isSaving}
            saveError={saveError}
            clearSaveError={clearSaveError}
            isEditing={true}
          />
        </Fragment>
      );
    }
  }

  return (
    <EuiPageBody>
      <EuiPageContent>
        <EuiTitle size="l">
          <h1 data-test-subj="pageTitle">
            <FormattedMessage
              id="xpack.idxMgmt.editTemplate.editTemplatePageTitle"
              defaultMessage="Edit template '{name}'"
              values={{ name: decodedTemplateName }}
            />
          </h1>
        </EuiTitle>
        <EuiSpacer size="l" />
        {content}
      </EuiPageContent>
    </EuiPageBody>
  );
};
