/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiDescribedFormGroup,
  EuiButtonEmpty,
  useEuiTheme,
  EuiFieldText,
  EuiFormRow,
} from '@elastic/eui';
import { useQuery, useMutation, useQueryClient } from '@kbn/react-query';
import { CodeEditor } from '@kbn/code-editor';
import { css } from '@emotion/react';
import { load as parseYaml } from 'js-yaml';
import { Controller, FormProvider, useForm, useFormContext } from 'react-hook-form';
import { noop } from 'lodash';
import { CASES_INTERNAL_URL } from '../../../common/constants';
import type { CreateTemplateInput, Template } from '../../../common/templates';
import { CommonFlyout, CommonFlyoutFooter } from '../configure_cases/flyout';
import { TitleExperimentalBadge } from '../header_page/title';
import { KibanaServices } from '../../common/lib/kibana';

const i18n = {
  TEMPLATE_TITLE: 'Templates V2',
  TEMPLATE_DESCRIPTION: 'Create case blueprints, with customized display layout and fields',
  NO_TEMPLATES: 'No templates',
  ADD_TEMPLATE: 'Add template',
};

// Api

const fetchTemplates = async () => {
  return KibanaServices.get().http.fetch<Template[]>(`${CASES_INTERNAL_URL}/templates`);
};

const fetchTemplate = async (templateId: string) => {
  return KibanaServices.get().http.fetch<Template>(`${CASES_INTERNAL_URL}/templates/${templateId}`);
};

const createTemplate = async (templateInput: CreateTemplateInput) => {
  return KibanaServices.get().http.post<Template>(`${CASES_INTERNAL_URL}/templates`, {
    body: JSON.stringify(templateInput),
  });
};

const updateTemplate = async ({
  templateId,
  template,
}: {
  templateId: string;
  template: Partial<Template>;
}) => {
  return KibanaServices.get().http.patch<Template>(
    `${CASES_INTERNAL_URL}/templates/${templateId}`,
    {
      body: JSON.stringify(template),
    }
  );
};

const deleteTemplate = async (templateId: string) => {
  return KibanaServices.get().http.delete(`${CASES_INTERNAL_URL}/templates/${templateId}`);
};

// Hooks

const useTemplates = () =>
  useQuery({
    queryFn: fetchTemplates,
    queryKey: ['templates'],
  });

const useTemplate = (templateId: string) =>
  useQuery({
    queryFn: () => fetchTemplate(templateId),
    queryKey: ['templates', templateId],
    enabled: !!templateId,
  });

const useCreateTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
};

const useUpdateTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
};

const useDeleteTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
};

// Components

interface TemplatesSectionProps {
  onAddTemplate: VoidFunction;
}

export const TemplatesSection = ({ onAddTemplate }: TemplatesSectionProps) => {
  const disabled = false;
  const error = undefined;

  const { isFetching: isLoading, data: templates } = useTemplates();

  return (
    <EuiDescribedFormGroup
      fullWidth
      title={
        <EuiFlexGroup alignItems="center" gutterSize="none">
          <EuiFlexItem grow={false}>
            <h2>
              {i18n.TEMPLATE_TITLE} <TitleExperimentalBadge />{' '}
            </h2>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      description={<p>{i18n.TEMPLATE_DESCRIPTION}</p>}
      data-test-subj="templates-form-group"
      css={{ alignItems: 'flex-start' }}
    >
      <EuiPanel paddingSize="s" color="subdued" hasBorder={false} hasShadow={false}>
        {templates?.length ? <></> : null}
        <EuiSpacer size="s" />
        {!templates?.length ? (
          <EuiFlexGroup justifyContent="center">
            <EuiFlexItem grow={false} data-test-subj="empty-templates">
              {i18n.NO_TEMPLATES}
              <EuiSpacer size="m" />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : null}
        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              isLoading={isLoading}
              isDisabled={disabled || error}
              size="s"
              onClick={onAddTemplate}
              iconType="plusInCircle"
              data-test-subj="add-template"
            >
              {i18n.ADD_TEMPLATE}
            </EuiButtonEmpty>
            <EuiSpacer size="s" />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiDescribedFormGroup>
  );
};

TemplatesSection.displayName = 'TemplateList';

const styles = {
  editorContainer: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
      height: '75vh',
      width: '100%',
      padding: euiTheme.size.xs,
    }),
};

const sample = `# This is an example template
fields:
  - name: severity
    type: select
    options:
      - low
      - moderate
      - high
      - critical
`;

// on save, persist version timestamp as well
// store each template as separate SO's with the same template_id (for reference)
// so that we can do audit and rollbacks
export const TemplateFormFields = () => {
  const { control } = useFormContext<{ name: string; definition: string }>();

  const euiTheme = useEuiTheme();

  useEffect(() => {
    console.log('parsed', parseYaml(sample));
  }, []);

  return (
    <div css={{ width: '100%', height: '100%', overflowY: 'scroll' }}>
      <EuiFormRow fullWidth>
        <Controller
          control={control}
          name="name"
          render={({ field }) => {
            return (
              <EuiFieldText
                placeholder="Template display name"
                value={field.value}
                onChange={(e) => field.onChange(e.currentTarget.value)}
              />
            );
          }}
        />
      </EuiFormRow>
      <EuiSpacer size="xs" />
      <div css={styles.editorContainer(euiTheme)}>
        <Controller
          control={control}
          name="definition"
          render={({ field }) => {
            return (
              <CodeEditor
                fullWidth
                height={'100%'}
                transparentBackground
                languageId="yaml"
                value={field.value}
                onChange={(code) => field.onChange(code)}
              />
            );
          }}
        />
      </div>
    </div>
  );
};

TemplateFormFields.displayName = 'TemplateFormFields';

export const TemplateFlyout = ({ onClose }: { onClose: VoidFunction }) => {
  const form = useForm<{ name: string; definition: string }>({
    defaultValues: {
      definition: sample,
      name: 'sample template name',
    },
  });

  return (
    <FormProvider {...form}>
      <CommonFlyout<FormData>
        isLoading={false}
        disabled={false}
        onCloseFlyout={onClose}
        onSaveField={noop}
        renderHeader={() => <span>{'Create template'}</span>}
        footer={
          <CommonFlyoutFooter
            isLoading={false}
            disabled={false}
            onCancel={onClose}
            onSave={form.handleSubmit((payload) => {
              console.log('payload', payload);
            })}
          />
        }
      >
        {TemplateFormFields}
      </CommonFlyout>
    </FormProvider>
  );
};
TemplateFlyout.displayName = 'TemplateFlyout';
