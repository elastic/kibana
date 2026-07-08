/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAccordion, EuiEmptyPrompt, EuiSpacer, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import type { CaseConnectorWithoutName } from '../../../../common/types/domain_zod/connector/v1';
import type { CaseAssignees } from '../../../../common/types/domain_zod/user/v1';
import type { TemplateSettings } from '../../../../common/types/domain/template/v1';
import type { TemplateMetadata, TemplateMetadataErrors } from '../utils/template_metadata';
import { TemplatePreview } from './template_preview';
import { TemplateMetadataForm } from './template_metadata_form';
import { TemplateSettingsForm } from './template_settings_form';
import * as i18n from '../translations';

type EditableCaseDefaultField =
  | 'name'
  | 'description'
  | 'severity'
  | 'category'
  | 'tags'
  | 'assignees';
type EditableCaseDefaultValue = string | string[] | CaseAssignees;

interface TemplateRenderPanelProps {
  settings?: TemplateSettings;
  connector?: CaseConnectorWithoutName;
  onSettingsChange: (settings: TemplateSettings) => void;
  onConnectorChange: (connector: CaseConnectorWithoutName) => void;
  metadata: TemplateMetadata;
  metadataErrors: TemplateMetadataErrors;
  onMetadataChange: (metadata: TemplateMetadata) => void;
  onFieldDefaultChange?: (fieldName: string, value: string, control: string) => void;
  onCaseDefaultChange?: (field: EditableCaseDefaultField, value: EditableCaseDefaultValue) => void;
  formResetKey?: number;
  isYamlDefinitionValid: boolean;
}

/** Right-hand render panel with accordion sections for metadata, fields/defaults, and settings. */
export const TemplateRenderPanel: React.FC<TemplateRenderPanelProps> = ({
  settings,
  connector,
  onSettingsChange,
  onConnectorChange,
  metadata,
  metadataErrors,
  onMetadataChange,
  onFieldDefaultChange,
  onCaseDefaultChange,
  formResetKey,
  isYamlDefinitionValid,
}) => {
  const { euiTheme } = useEuiTheme();

  if (!isYamlDefinitionValid) {
    return (
      <EuiEmptyPrompt
        data-test-subj="templateRenderPanelInvalidYaml"
        iconType="warning"
        color="warning"
        paddingSize="m"
        titleSize="xs"
        title={<h3>{i18n.PREVIEW_UNAVAILABLE_TITLE}</h3>}
        body={<p>{i18n.PREVIEW_UNAVAILABLE_BODY}</p>}
      />
    );
  }

  return (
    <div>
      <EuiAccordion
        id="templateRenderMetadataAccordion"
        buttonContent={
          <span
            css={css`
              font-weight: ${euiTheme.font.weight.medium};
            `}
          >
            {i18n.TEMPLATE_METADATA_SECTION_TITLE}
          </span>
        }
        initialIsOpen={true}
        data-test-subj="templateRenderMetadataAccordion"
      >
        <EuiSpacer size="s" />
        <EuiText size="xs" color="subdued">
          <p>{i18n.TEMPLATE_METADATA_SECTION_DESCRIPTION}</p>
        </EuiText>
        <EuiSpacer size="m" />
        <TemplateMetadataForm
          metadata={metadata}
          errors={metadataErrors}
          onChange={onMetadataChange}
          compact
        />
      </EuiAccordion>

      <EuiSpacer size="m" />

      <EuiAccordion
        id="templateRenderFieldsAccordion"
        buttonContent={
          <span
            css={css`
              font-weight: ${euiTheme.font.weight.medium};
            `}
          >
            {i18n.FIELDS_TAB_LABEL}
          </span>
        }
        initialIsOpen={true}
        data-test-subj="templateRenderFieldsAccordion"
      >
        <EuiSpacer size="s" />
        <EuiText size="xs" color="subdued" data-test-subj="templateFieldsTabDescription">
          {i18n.PREVIEW_TEMPLATE_DESCRIPTION}
        </EuiText>
        <EuiSpacer size="m" />
        <TemplatePreview
          settings={settings}
          connector={connector}
          onFieldDefaultChange={onFieldDefaultChange}
          onCaseDefaultChange={onCaseDefaultChange}
        />
      </EuiAccordion>

      <EuiSpacer size="m" />

      <EuiAccordion
        id="templateRenderSettingsAccordion"
        buttonContent={
          <span
            css={css`
              font-weight: ${euiTheme.font.weight.medium};
            `}
          >
            {i18n.SETTINGS_TAB_LABEL}
          </span>
        }
        initialIsOpen={true}
        data-test-subj="templateRenderSettingsAccordion"
      >
        <EuiSpacer size="s" />
        <TemplateSettingsForm
          settings={settings}
          connector={connector}
          onSettingsChange={onSettingsChange}
          onConnectorChange={onConnectorChange}
          formResetKey={formResetKey}
          compact
        />
      </EuiAccordion>
    </div>
  );
};

TemplateRenderPanel.displayName = 'TemplateRenderPanel';
