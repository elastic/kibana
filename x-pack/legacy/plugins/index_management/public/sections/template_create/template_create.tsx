/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect, useState } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiPageBody, EuiPageContent, EuiSpacer, EuiTitle } from '@elastic/eui';
import { TemplateForm } from '../../components';
import { setBreadcrumbs } from '../../services/set_breadcrumbs';
import { Template } from '../../../common/types';
import { saveTemplate } from '../../services/api';
import { BASE_PATH } from '../../../common/constants';

const emptyObject = '{\n\n}';

const DEFAULT_TEMPLATE: Template = {
  name: '',
  indexPatterns: [],
  version: '',
  order: '',
  settings: emptyObject,
  mappings: emptyObject,
  aliases: emptyObject,
};

export const TemplateCreate: React.FunctionComponent<RouteComponentProps> = ({ history }) => {
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<any>(null);

  const onSave = async (template: Template) => {
    const { name } = template;

    setIsSaving(true);
    setSaveError(null);

    const { error } = await saveTemplate(template);

    setIsSaving(false);

    if (error) {
      setSaveError(error);
      return;
    }

    history.push(`${BASE_PATH}templates/${encodeURIComponent(name)}`);
  };

  const clearSaveError = () => {
    setSaveError(null);
  };

  useEffect(() => {
    setBreadcrumbs('templateCreate');
  }, []);

  return (
    <EuiPageBody>
      <EuiPageContent>
        <EuiTitle size="l">
          <h1 data-test-subj="pageTitle">
            <FormattedMessage
              id="xpack.idxMgmt.createTemplate.createTemplatePageTitle"
              defaultMessage="Create template"
            />
          </h1>
        </EuiTitle>
        <EuiSpacer size="l" />
        <TemplateForm
          template={DEFAULT_TEMPLATE}
          onSave={onSave}
          isSaving={isSaving}
          saveError={saveError}
          clearSaveError={clearSaveError}
        />
      </EuiPageContent>
    </EuiPageBody>
  );
};
