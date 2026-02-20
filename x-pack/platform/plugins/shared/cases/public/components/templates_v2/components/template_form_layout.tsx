/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactNode } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPageBody,
  EuiPageSection,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { UseFormReturn } from 'react-hook-form';
import { FormProvider } from 'react-hook-form';
import type { TemplateFormValues } from './template_form';
import { HeaderPage } from '../../header_page';
import { TemplatePreview } from './template_preview';
import * as i18n from '../translations';

interface TemplateFormLayoutProps {
  form: UseFormReturn<TemplateFormValues>;
  title: string;
  formContent: ReactNode;
  isLoading?: boolean;
}

export const TemplateFormLayout: React.FC<TemplateFormLayoutProps> = ({
  form,
  title,
  formContent,
  isLoading,
}) => {
  return (
    <FormProvider {...form}>
      <EuiPageSection restrictWidth={false}>
        <HeaderPage data-test-subj="case-configure-title" title={title} />
        <EuiPageBody>
          <EuiSpacer size="xs" />
          {isLoading ? (
            <EuiLoadingSpinner size="l" />
          ) : (
            <EuiFlexGroup>
              <EuiFlexItem grow={3}>
                <EuiText>
                  <h3>{i18n.YAML_EDITOR_TITLE}</h3>
                </EuiText>
                <EuiSpacer size="m" />
                {formContent}
                <EuiSpacer size="m" />
              </EuiFlexItem>
              <EuiFlexItem grow={1}>
                <EuiText>
                  <h3>{i18n.INTERACTIVE_EDITOR_TITLE}</h3>
                </EuiText>
                <EuiSpacer size="m" />
                <TemplatePreview />
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </EuiPageBody>
      </EuiPageSection>
    </FormProvider>
  );
};

TemplateFormLayout.displayName = 'TemplateFormLayout';
