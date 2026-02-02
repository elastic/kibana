/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { HeaderPage } from '../../header_page';
import { useTemplateViewParams } from '../../../common/navigation';
import * as i18n from '../../templates/translations';

export const TemplateFormPage: React.FC = () => {
  const { templateId } = useTemplateViewParams();
  const isEditMode = Boolean(templateId);

  const title = isEditMode ? i18n.EDIT_TEMPLATE : i18n.CREATE_TEMPLATE;

  return (
    <HeaderPage title={title} border data-test-subj="template-form-page">
      <div data-test-subj={isEditMode ? 'edit-template-content' : 'create-template-content'}>
        {isEditMode
          ? i18n.EDITING_TEMPLATE(templateId as string)
          : i18n.CREATE_NEW_TEMPLATE_DESCRIPTION}
      </div>
    </HeaderPage>
  );
};

TemplateFormPage.displayName = 'TemplateFormPage';
