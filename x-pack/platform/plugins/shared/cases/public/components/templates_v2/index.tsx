/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import type { EuiSelectOption, UseEuiTheme } from '@elastic/eui';
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
  EuiText,
  EuiButtonIcon,
  EuiTitle,
  EuiLoadingSpinner,
  EuiIconTip,
  EuiBadge,
  EuiCallOut,
} from '@elastic/eui';
import { useQuery, useMutation, useQueryClient } from '@kbn/react-query';
import { CodeEditor } from '@kbn/code-editor';
import { css } from '@emotion/react';
import { load as parseYaml } from 'js-yaml';
import { Controller, FormProvider, useForm, useFormContext } from 'react-hook-form';
import { camelCase, noop } from 'lodash';
import {
  UseField,
  useFormData as useKibanaFormData,
  useFormContext as useKibanaFormContext,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { HiddenField, SelectField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { CASE_EXTENDED_FIELDS, CASES_INTERNAL_URL } from '../../../common/constants';
import type { CreateTemplateInput, ParsedTemplate, Template } from '../../../common/templates';
import { CommonFlyout, CommonFlyoutFooter } from '../configure_cases/flyout';
import { TitleExperimentalBadge } from '../header_page/title';
import { KibanaServices } from '../../common/lib/kibana';
import { TruncatedText } from '../truncated_text';
import type { CaseUI } from '../../containers/types';

const i18n = {
  TEMPLATE_TITLE: 'Templates V2',
  TEMPLATE_DESCRIPTION: 'Create case blueprints, with customized display layout and fields',
  NO_TEMPLATES: 'No templates',
  ADD_TEMPLATE: 'Add template',
  UPDATE_TEMPLATE: 'Update template',
  CREATE_TEMPLATE: 'Create template',
};

// TODO:
// 1. update extended_fields in case view

// Api

const fetchTemplates = async () => {
  return KibanaServices.get().http.fetch<Template[]>(`${CASES_INTERNAL_URL}/templates`);
};

const fetchTemplate = async (templateId: string, version?: number): Promise<ParsedTemplate> => {
  const template = await KibanaServices.get().http.fetch<
    Template & { isLatest: boolean; latestVersion: number }
  >(`${CASES_INTERNAL_URL}/templates/${templateId}`, {
    query: {
      version,
    },
  });

  return {
    ...template,
    definition: parseYaml(template.definition),
  };
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

const useTemplate = (templateId: string, version?: number) =>
  useQuery({
    queryFn: () => fetchTemplate(templateId, version),
    queryKey: ['templates', templateId, version],
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
  onEditTemplate: (template: Template) => void;
}

export const TemplateListItem = ({
  template,
  onEditTemplate,
  onDeleteTemplate,
}: {
  template: Template;
  onEditTemplate: (template: Template) => void;
  onDeleteTemplate: (templateId: string) => void;
}) => {
  return (
    <EuiPanel paddingSize="s" data-test-subj={`template-${template.templateId}`} hasShadow={false}>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={true}>
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <h4>
                  <TruncatedText text={template.name} />
                </h4>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="flexEnd" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                data-test-subj={`${template.templateId}-template-edit`}
                aria-label={`${template.templateId}-template-edit`}
                iconType="pencil"
                color="primary"
                onClick={() => onEditTemplate(template)}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                data-test-subj={`${template.templateId}-template-delete`}
                aria-label={`${template.templateId}-template-delete`}
                iconType="minusInCircle"
                color="danger"
                onClick={() => onDeleteTemplate(template.templateId)}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

TemplateListItem.displayName = 'TemplateListItem';

export const TemplatesSection = ({ onAddTemplate, onEditTemplate }: TemplatesSectionProps) => {
  const disabled = false;
  const error = undefined;

  const { isFetching, data: templates } = useTemplates();

  const deleteTemplateMutation = useDeleteTemplate();

  const isLoading = isFetching || deleteTemplateMutation.isLoading;

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
        {templates?.length ? (
          <>
            {templates.map((template) => (
              <>
                <TemplateListItem
                  key={template.templateId}
                  template={template}
                  onEditTemplate={onEditTemplate}
                  onDeleteTemplate={(templateId) => deleteTemplateMutation.mutateAsync(templateId)}
                />
                <EuiSpacer size="s" />
              </>
            ))}
          </>
        ) : null}
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
    control: select
    type: keyword
    metadata:
      options:
        - low
        - moderate
        - high
        - critical
`;

// on save, persist version timestamp as well
// store each template as separate SO's with the same template_id (for reference)
// so that we can do audit and rollbacks
export const TemplateFormFields = ({ updating }: { updating?: boolean }) => {
  const { control } = useFormContext<{ name: string; definition: string }>();

  const euiTheme = useEuiTheme();

  useEffect(() => {
    const _parsed = parseYaml(sample);
    console.log('TemplateFormFields', _parsed);
  }, []);

  return (
    <div css={{ width: '100%', height: '100%', overflowY: 'scroll' }}>
      {!updating && (
        <>
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
        </>
      )}
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

const TemplateCreationView = ({ onClose }: { onClose: VoidFunction }) => {
  const createTemplateMutation = useCreateTemplate();

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
        renderHeader={() => <span>{i18n.CREATE_TEMPLATE}</span>}
        footer={
          <CommonFlyoutFooter
            isLoading={form.formState.isSubmitting}
            disabled={!form.formState.isValid}
            onCancel={onClose}
            onSave={form.handleSubmit(async (payload) => {
              await createTemplateMutation.mutateAsync(payload);
              onClose();
            })}
          />
        }
      >
        {() => <TemplateFormFields />}
      </CommonFlyout>
    </FormProvider>
  );
};
TemplateCreationView.displayName = 'TemplateCreationView';

const TemplateUpdateView = ({
  onClose,
  defaultValues,
}: {
  onClose: VoidFunction;
  defaultValues: Template;
}) => {
  const updateTemplateMutation = useUpdateTemplate();

  const form = useForm<{ name: string; definition: string }>({
    defaultValues,
  });

  return (
    <FormProvider {...form}>
      <CommonFlyout<FormData>
        isLoading={false}
        disabled={false}
        onCloseFlyout={onClose}
        onSaveField={noop}
        renderHeader={() => <span>{i18n.UPDATE_TEMPLATE}</span>}
        footer={
          <CommonFlyoutFooter
            isLoading={form.formState.isSubmitting}
            disabled={!form.formState.isValid}
            onCancel={onClose}
            onSave={form.handleSubmit(async (payload) => {
              await updateTemplateMutation.mutateAsync({
                templateId: defaultValues.templateId,
                template: payload,
              });
              onClose();
            })}
          />
        }
      >
        {() => <TemplateFormFields updating />}
      </CommonFlyout>
    </FormProvider>
  );
};
TemplateUpdateView.displayName = 'TemplateUpdateView';

export const TemplateSelectorV2 = () => {
  const templates = useTemplates();
  const form = useKibanaFormContext();

  const options: EuiSelectOption[] = useMemo(() => {
    return [
      ...(templates.data?.map((t) => ({
        text: t.name,
        value: t.templateId,
      })) ?? []),
    ];
  }, [templates.data]);

  return (
    <EuiFormRow
      id="createCaseTemplateV2"
      fullWidth
      label={'Template'}
      helpText={'Template governs case fields and layout'}
    >
      <>
        <UseField path="template.version" component={HiddenField} />
        <UseField
          path="template.id"
          component={SelectField}
          onChange={(value) => {
            form.setFieldValue(
              'template.version',
              templates.data?.find((t) => t.templateId === value)?.templateVersion
            );
          }}
          componentProps={{
            euiFieldProps: {
              options,
            },
          }}
        />
      </>
    </EuiFormRow>
  );
};
TemplateSelectorV2.displayName = 'TemplateSelectorV2';

export const CreateCaseTemplateFields = () => {
  const [fields] = useKibanaFormData();
  const template = useTemplate(fields?.template?.id);

  const fieldsFragment = useMemo(() => {
    if (!template.data) {
      return null;
    }

    // TODO: create control registry and use it here
    return template.data.definition.fields.map((field) => {
      if (field.control === 'select') {
        const options = (field.metadata.options as string[]).map((value) => ({
          text: value,
          value,
        }));

        return (
          <EuiFormRow
            label={field.label ?? field.name}
            title={`${CASE_EXTENDED_FIELDS}.${field.name}_as_${field.type}`}
          >
            <UseField
              key={field.name}
              path={`${CASE_EXTENDED_FIELDS}.${field.name}_as_${field.type}`}
              component={SelectField}
              componentProps={{
                euiFieldProps: {
                  options,
                },
              }}
            />
          </EuiFormRow>
        );
      }

      return <>{'unknown field'}</>;
    });
  }, [template]);

  if (!fieldsFragment) {
    return (
      <>
        <EuiSpacer />
        <EuiCallOut announceOnMount title="Template not selected">
          <p>{`Select template in the first step above to edit extended fields.`}</p>
        </EuiCallOut>
      </>
    );
  }

  return (
    <>
      <EuiSpacer />
      <EuiTitle size="s">
        <h4>{`Extended Fields`}</h4>
      </EuiTitle>
      <EuiSpacer />
      {fieldsFragment}
    </>
  );
};
CreateCaseTemplateFields.displayName = 'TemplateFields';

const CaseViewTemplateFieldsInner = ({
  template,
  // TODO: needed for updates
  caseId,
  extendedFields,
}: {
  template: {
    id: string;
    version: number;
  };
  caseId: string;
  extendedFields: unknown;
}) => {
  const templateQuery = useTemplate(template.id, template.version);

  if (templateQuery.isFetching) {
    return <EuiLoadingSpinner />;
  }

  const fields = templateQuery.data?.definition.fields;

  return (
    <>
      <EuiTitle size="xs">
        <h3>
          {`Extended Fields (${templateQuery.data?.name})`}{' '}
          {!templateQuery.data?.isLatest && (
            <EuiBadge>
              {`Outdated`}{' '}
              <EuiIconTip
                type="info"
                content={`Based on template "${templateQuery.data?.name}" (${
                  templateQuery.data?.isLatest
                    ? 'latest template version'
                    : `v${template.version}, current version is ${templateQuery.data?.latestVersion}`
                })`}
              />
            </EuiBadge>
          )}
        </h3>
      </EuiTitle>
      <EuiSpacer size="xs" />
      {fields?.map((field) => {
        return (
          <div key={field.name}>
            <strong>{`${field.name}:`}</strong>{' '}
            {(extendedFields as any)?.[`${camelCase(`${field.name}_as_${field.type}`)}`]}
          </div>
        );
      })}
    </>
  );
};

CaseViewTemplateFieldsInner.displayName = 'CaseViewTemplateFieldsInner';

export const CaseViewTemplateFields = ({ caseData }: { caseData: CaseUI }) => {
  if (!caseData.template) {
    return <pre>{`Debug: missing template data on the case`}</pre>;
  }

  return (
    <CaseViewTemplateFieldsInner
      template={caseData.template}
      caseId={caseData.id}
      extendedFields={caseData.extendedFields}
    />
  );
};

CaseViewTemplateFields.displayName = 'CaseViewTemplateFields';

export const TemplateFlyout = ({
  onClose,
  template,
}: {
  onClose: VoidFunction;
  template: Template | null;
}) => {
  return template ? (
    <TemplateUpdateView defaultValues={template} onClose={onClose} />
  ) : (
    <TemplateCreationView onClose={onClose} />
  );
};
TemplateFlyout.displayName = 'TemplateFlyout';
