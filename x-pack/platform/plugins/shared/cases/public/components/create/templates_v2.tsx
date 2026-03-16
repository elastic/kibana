/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiFlexItem,
  EuiFormRow,
  EuiComboBox,
  EuiFlexGroup,
  EuiSkeletonRectangle,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { css } from '@emotion/react';
import { UseField, useFormContext } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { HiddenField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { OptionalFieldLabel } from '../optional_field_label';
import { useCasesContext } from '../cases_context/use_cases_context';
import { TEMPLATE_HELP_TEXT, TEMPLATE_LABEL, TEMPLATE_SELECT_PLACEHOLDER } from './translations';
import { useGetTemplates } from '../templates_v2/hooks/use_get_templates';

const EMPTY_TEMPLATE_OPTION: EuiComboBoxOptionOption<string> = { label: 'None', value: '' };

interface Props {
  isLoading: boolean;
  isDisabled?: boolean;
}

export const TemplateSelectorComponent: React.FC<Props> = ({ isLoading, isDisabled }) => {
  const { euiTheme } = useEuiTheme();
  const { owner } = useCasesContext();
  const { setFieldValue } = useFormContext();

  const { data: templatesData, isLoading: isLoadingTemplates } = useGetTemplates({
    queryParams: { page: 1, perPage: 10000, owner },
  });

  const [selectedTemplate, setSelectedTemplate] = useState<EuiComboBoxOptionOption<string> | null>(
    null
  );

  const options: Array<EuiComboBoxOptionOption<string>> = useMemo(
    () => [
      EMPTY_TEMPLATE_OPTION,
      ...(templatesData?.templates ?? []).map((template) => ({
        label: template.name,
        value: template.templateId,
      })),
    ],
    [templatesData?.templates]
  );

  const onChange = useCallback(
    (selected: Array<EuiComboBoxOptionOption<string>>) => {
      const selection = selected[0] ?? null;
      setSelectedTemplate(selection);

      const templateId = selection?.value ?? '';
      setFieldValue('templateId', templateId);

      const matched = (templatesData?.templates ?? []).find((t) => t.templateId === templateId);
      setFieldValue('templateVersion', matched?.templateVersion ?? '');
    },
    [setFieldValue, templatesData?.templates]
  );

  return (
    <>
      <UseField path="templateId" component={HiddenField} />
      <UseField path="templateVersion" component={HiddenField} />
      <EuiFormRow
        id="createCaseTemplate"
        fullWidth
        label={TEMPLATE_LABEL}
        labelAppend={
          <EuiFlexGroup
            alignItems="center"
            gutterSize="s"
            css={css`
              flex-grow: 0;
            `}
            responsive={false}
          >
            <EuiFlexItem grow={false}>{OptionalFieldLabel}</EuiFlexItem>
          </EuiFlexGroup>
        }
        helpText={TEMPLATE_HELP_TEXT}
      >
        {isLoadingTemplates ? (
          <EuiSkeletonRectangle width="100%" height={euiTheme.size.xxl} borderRadius="m" />
        ) : (
          <EuiComboBox
            singleSelection={{ asPlainText: true }}
            options={options}
            selectedOptions={selectedTemplate ? [selectedTemplate] : []}
            onChange={onChange}
            isLoading={isLoading}
            isDisabled={isLoading || isDisabled}
            data-test-subj="create-case-template-select"
            fullWidth
            placeholder={TEMPLATE_SELECT_PLACEHOLDER}
          />
        )}
      </EuiFormRow>
    </>
  );
};

TemplateSelectorComponent.displayName = 'TemplateSelector';

export const TemplateSelector = React.memo(TemplateSelectorComponent);
