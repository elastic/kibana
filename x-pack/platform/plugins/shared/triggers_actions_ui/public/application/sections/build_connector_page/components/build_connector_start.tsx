/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPageTemplate,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CreateConnectorTypeRequest } from '@kbn/actions-plugin/common';
import { AiAssistantPanel } from './ai_assistant_panel';
import { YamlImportPanel } from './yaml_import_panel';

interface Props {
  onApply: (definition: Partial<CreateConnectorTypeRequest>) => void;
  onStartFromScratch: () => void;
}

export const BuildConnectorStart: React.FC<Props> = ({ onApply, onStartFromScratch }) => {
  const [showYamlImport, setShowYamlImport] = useState(false);

  return (
    <EuiPageTemplate.Section
      grow={false}
      paddingSize="none"
      restrictWidth
      data-test-subj="build-connector-start"
    >
      <EuiPanel hasBorder paddingSize="l">
        <EuiTitle size="m">
          <h2>
            {i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.aiTitle', {
              defaultMessage: 'Generate with AI',
            })}
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.aiIntro', {
            defaultMessage: 'Enter a public API documentation URL. Review the draft before saving.',
          })}
        </EuiText>
        <EuiSpacer size="l" />
        <AiAssistantPanel onApply={onApply} />
      </EuiPanel>
      <EuiHorizontalRule margin="l" />
      <EuiFlexGroup gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            onClick={() => setShowYamlImport((current) => !current)}
            data-test-subj="build-connector-start-import-yaml"
          >
            {i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.importYaml', {
              defaultMessage: 'Import YAML',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            onClick={onStartFromScratch}
            data-test-subj="build-connector-start-scratch"
          >
            {i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.scratch', {
              defaultMessage: 'Start from scratch',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      {showYamlImport && (
        <>
          <EuiSpacer size="m" />
          <EuiPanel hasBorder paddingSize="l" data-test-subj="build-connector-start-yaml">
            <EuiTitle size="s">
              <h3>
                {i18n.translate(
                  'xpack.triggersActionsUI.sections.buildConnectorPage.importYamlTitle',
                  { defaultMessage: 'Import YAML' }
                )}
              </h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <YamlImportPanel onApply={onApply} />
          </EuiPanel>
        </>
      )}
    </EuiPageTemplate.Section>
  );
};
