/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageBody,
  EuiPageSection,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { FC } from 'react';
import React, { useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { HeaderPage } from '../../header_page';
import { CreateTemplateForm } from './form';
import { CreateTemplatePreview } from './preview';
import { exampleTemplateDefinition } from '../field_types/constants';
import { GENERAL_CASES_OWNER } from '../../../../common/constants';

import * as i18n from '../translations';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CreateTemplatePageProps {}

export const CreateTemplatePage: FC<CreateTemplatePageProps> = () => {
  const form = useForm({
    defaultValues: {
      name: '',
      owner: GENERAL_CASES_OWNER,
      definition: exampleTemplateDefinition,
    },
  });

  // NOTE: reset the form to propagate initial value to the renderer.
  // For some reason it does not happen automatically.
  useEffect(() => {
    form.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <FormProvider {...form}>
      <EuiPageSection restrictWidth={false}>
        <HeaderPage data-test-subj="case-configure-title" title={i18n.ADD_TEMPLATE_TITLE} />
        <EuiPageBody>
          <EuiSpacer size="xs" />
          <EuiFlexGroup>
            <EuiFlexItem grow={3}>
              <EuiText>
                <h3>{i18n.YAML_EDITOR_TITLE}</h3>
              </EuiText>
              <EuiSpacer size="m" />
              <CreateTemplateForm />
              <EuiSpacer size="m" />
            </EuiFlexItem>
            <EuiFlexItem grow={1}>
              <EuiText>
                <h3>{i18n.INTERACTIVE_EDITOR_TITLE}</h3>
              </EuiText>
              <EuiSpacer size="m" />
              <CreateTemplatePreview />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPageBody>
      </EuiPageSection>
    </FormProvider>
  );
};

CreateTemplatePage.displayName = 'CreateTemplatePage';

// eslint-disable-next-line import/no-default-export
export default CreateTemplatePage;
