/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CodeEditorProps } from '@kbn/code-editor';
import type { CreateConnectorTypeRequest } from '@kbn/actions-plugin/common';
import { formatConnectorTypeYaml, parseConnectorTypeYaml } from './parse_connector_type_yaml';
import { ResizableCodeEditor } from './resizable_code_editor';

interface Props {
  onApply: (connectorType: Partial<CreateConnectorTypeRequest>) => void;
  isDisabled?: boolean;
}

interface ParsedYaml {
  connectorType?: Partial<CreateConnectorTypeRequest>;
  error?: string;
}

const EDITOR_OPTIONS: CodeEditorProps['options'] = {
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  wordWrap: 'on',
  automaticLayout: true,
  tabSize: 2,
  folding: false,
};

/** Example shown while the editor is empty; mirrors the request body shape (config is a list, actions a map). */
const YAML_EXAMPLE = `id: .my_service
displayName: My Service
description: Sends notifications to My Service
auth:
  type: bearer
config:
  - name: baseUrl
    type: string
    required: true
actions:
  notify:
    description: Send a notification
    scope: write
    input:
      - name: message
        type: string
        required: true
    request:
      method: POST
      url: "{{config.baseUrl}}"
      path: /notify
      headers:
        Content-Type: application/json
      body:
        text: "{{params.message}}"`;

const parseYaml = (yaml: string): ParsedYaml => {
  if (!yaml.trim()) {
    return {};
  }
  try {
    return { connectorType: parseConnectorTypeYaml(yaml) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
};

const YamlImportPanelComponent: React.FC<Props> = ({ onApply, isDisabled = false }) => {
  const [yaml, setYaml] = useState<string>('');
  const { connectorType, error } = useMemo(() => parseYaml(yaml), [yaml]);
  const canApply = connectorType !== undefined && !isDisabled;

  const onBeautify = useCallback(() => {
    if (connectorType) {
      setYaml(formatConnectorTypeYaml(connectorType));
    }
  }, [connectorType]);

  const onApplyClick = useCallback(() => {
    if (connectorType) {
      onApply(connectorType);
    }
  }, [connectorType, onApply]);

  return (
    <>
      <EuiFormRow
        label={i18n.translate(
          'xpack.triggersActionsUI.sections.buildConnectorFlyout.yamlFieldLabel',
          {
            defaultMessage: 'YAML definition',
          }
        )}
        helpText={i18n.translate(
          'xpack.triggersActionsUI.sections.buildConnectorFlyout.yamlFieldHelpText',
          {
            defaultMessage:
              'Uses the same keys as the connector type request body. Applying it fills the form without saving.',
          }
        )}
        fullWidth
        isInvalid={!!error}
        error={error}
      >
        <ResizableCodeEditor
          languageId="yaml"
          value={yaml}
          onChange={setYaml}
          defaultHeight={220}
          minHeight={120}
          options={EDITOR_OPTIONS}
          placeholder={YAML_EXAMPLE}
          dataTestSubj="build-connector-flyout-yaml-editor"
        />
      </EuiFormRow>
      <EuiSpacer size="s" />
      <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            iconType="brush"
            onClick={onBeautify}
            isDisabled={!canApply}
            data-test-subj="build-connector-flyout-yaml-beautify-btn"
          >
            {i18n.translate(
              'xpack.triggersActionsUI.sections.buildConnectorFlyout.beautifyYamlButtonLabel',
              { defaultMessage: 'Beautify' }
            )}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            onClick={onApplyClick}
            isDisabled={!canApply}
            data-test-subj="build-connector-flyout-yaml-apply-btn"
          >
            {i18n.translate(
              'xpack.triggersActionsUI.sections.buildConnectorFlyout.applyYamlButtonLabel',
              { defaultMessage: 'Apply to form' }
            )}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

export const YamlImportPanel = memo(YamlImportPanelComponent);
