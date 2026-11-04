/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiAccordion, EuiSpacer, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CreateConnectorTypeRequest } from '@kbn/actions-plugin/common';
import { AiAssistantPanel } from './ai_assistant_panel';
import { YamlImportPanel } from './yaml_import_panel';

interface Props {
  onApply: (connectorType: Partial<CreateConnectorTypeRequest>) => void;
  isDisabled?: boolean;
  /** Prefix of the `data-test-subj` attributes, so each host keeps distinct test hooks. */
  testSubjPrefix: string;
}

/** The two ways to fill the builder at once: import a YAML definition, or generate one with AI. */
const DefinitionImportPanelsComponent: React.FC<Props> = ({
  onApply,
  isDisabled = false,
  testSubjPrefix,
}) => {
  const yamlAccordionId = useGeneratedHtmlId({ prefix: 'buildConnectorYaml' });
  const aiAccordionId = useGeneratedHtmlId({ prefix: 'buildConnectorAi' });

  return (
    <>
      <EuiAccordion
        id={yamlAccordionId}
        buttonContent={i18n.translate(
          'xpack.triggersActionsUI.sections.buildConnectorPage.importYamlAccordionLabel',
          { defaultMessage: 'Import from YAML' }
        )}
        buttonProps={{ 'data-test-subj': `${testSubjPrefix}-yaml-toggle` }}
        paddingSize="s"
      >
        <div data-test-subj={`${testSubjPrefix}-yaml-panel`}>
          <YamlImportPanel onApply={onApply} isDisabled={isDisabled} />
        </div>
      </EuiAccordion>
      <EuiSpacer size="s" />
      <EuiAccordion
        id={aiAccordionId}
        buttonContent={i18n.translate(
          'xpack.triggersActionsUI.sections.buildConnectorPage.aiAccordionLabel',
          { defaultMessage: 'Generate with AI' }
        )}
        buttonProps={{ 'data-test-subj': `${testSubjPrefix}-ai-toggle` }}
        paddingSize="s"
      >
        <div data-test-subj={`${testSubjPrefix}-ai-panel`}>
          <AiAssistantPanel onApply={onApply} isDisabled={isDisabled} />
        </div>
      </EuiAccordion>
    </>
  );
};

export const DefinitionImportPanels = memo(DefinitionImportPanelsComponent);
