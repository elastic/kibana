/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiDescribedFormGroup,
  EuiErrorBoundary,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

import type { CaseConnectorWithoutName } from '../../../../common/types/domain_zod/connector/v1';
import type { TemplateSettings } from '../../../../common/types/domain/template/v1';
import type { TemplateMetadata, TemplateMetadataErrors } from '../utils/template_metadata';
import { TemplateMetadataForm } from './template_metadata_form';
import { TemplateSettingsForm } from './template_settings_form';
import * as i18n from '../translations';

interface TemplateConfigurationTabProps {
  metadata: TemplateMetadata;
  metadataErrors: TemplateMetadataErrors;
  onMetadataChange: (metadata: TemplateMetadata) => void;
  settings?: TemplateSettings;
  connector?: CaseConnectorWithoutName;
  onSettingsChange: (settings: TemplateSettings) => void;
  onConnectorChange: (connector: CaseConnectorWithoutName) => void;
  formResetKey?: number;
}

/**
 * The Configuration tab: a Kibana settings-page (described-form-group) for the template's identity
 * (name/description/tags), case settings, and default connector. None of this lives in the editor
 * YAML — it is panel-owned and merged into the definition on save. The connector form is
 * error-boundaried so a flaky async connector fetch can never blank the tab.
 */
export const TemplateConfigurationTab: React.FC<TemplateConfigurationTabProps> = ({
  metadata,
  metadataErrors,
  onMetadataChange,
  settings,
  connector,
  onSettingsChange,
  onConnectorChange,
  formResetKey,
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      css={css`
        height: 100%;
        overflow: auto;
        background-color: ${euiTheme.colors.backgroundBasePlain};
      `}
      data-test-subj="templateConfigurationTab"
    >
      <div
        css={css`
          max-width: 1000px;
          margin: 0 auto;
          padding: ${euiTheme.size.xl} ${euiTheme.size.l};
        `}
      >
        <EuiTitle size="s">
          <h2>{i18n.CONFIGURATION_TAB_LABEL}</h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="s" color="subdued">
          {i18n.CONFIGURATION_TAB_DESCRIPTION}
        </EuiText>
        <EuiSpacer size="l" />

        <EuiDescribedFormGroup
          title={<h3>{i18n.TEMPLATE_METADATA_SECTION_TITLE}</h3>}
          description={i18n.TEMPLATE_METADATA_SECTION_DESCRIPTION}
        >
          <TemplateMetadataForm
            metadata={metadata}
            errors={metadataErrors}
            onChange={onMetadataChange}
            compact
          />
        </EuiDescribedFormGroup>

        <EuiDescribedFormGroup
          title={<h3>{i18n.CONFIGURATION_CONNECTOR_GROUP_TITLE}</h3>}
          description={i18n.CONFIGURATION_CONNECTOR_GROUP_DESCRIPTION}
        >
          <EuiErrorBoundary>
            <TemplateSettingsForm
              settings={settings}
              connector={connector}
              onSettingsChange={onSettingsChange}
              onConnectorChange={onConnectorChange}
              formResetKey={formResetKey}
              compact
            />
          </EuiErrorBoundary>
        </EuiDescribedFormGroup>
      </div>
    </div>
  );
};

TemplateConfigurationTab.displayName = 'TemplateConfigurationTab';
