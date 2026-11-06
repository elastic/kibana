/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiFilePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnWarningCallout } from '@kbn/ui-callout';
import type { CodeEditorProps } from '@kbn/code-editor';
import type { CreateConnectorTypeRequest } from '@kbn/actions-plugin/common';
import { formatOpenApi, parseOpenApi } from '../lib/parse_openapi';
import { formatConnectorTypeYaml, parseConnectorTypeYaml } from '../lib/parse_connector_type_yaml';
import { ResizableCodeEditor } from './resizable_code_editor';

interface Props {
  onApply: (connectorType: Partial<CreateConnectorTypeRequest>) => void;
  isDisabled?: boolean;
}

const EDITOR_OPTIONS: CodeEditorProps['options'] = {
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  wordWrap: 'on',
  automaticLayout: true,
  tabSize: 2,
  folding: false,
};

const OPENAPI_EXAMPLE = `openapi: 3.0.3
info:
  title: My Service
  version: 1.0.0
servers:
  - url: https://api.example.com
paths:
  /items:
    get:
      operationId: listItems
      summary: List items
      responses:
        '200':
          description: OK`;

const BEAUTIFY_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.buildConnectorPage.beautifyOpenApiButtonLabel',
  { defaultMessage: 'Beautify OpenAPI' }
);

interface ParsedInput {
  connectorType?: Partial<CreateConnectorTypeRequest>;
  skippedOperations?: string[];
  isOpenApi?: boolean;
  error?: string;
}

const isOpenApiDocument = (text: string) =>
  /(?:^|\n)\s*(?:openapi|swagger|info|paths)\s*:|"(?:openapi|swagger|info|paths)"\s*:/.test(text);

const parseInput = (text: string): ParsedInput => {
  if (!text.trim()) return {};
  try {
    if (isOpenApiDocument(text)) {
      const { connectorType, skippedOperations } = parseOpenApi(text);
      return { connectorType, skippedOperations, isOpenApi: true };
    }
    return { connectorType: parseConnectorTypeYaml(text) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
};

const OpenApiImportPanelComponent: React.FC<Props> = ({ onApply, isDisabled = false }) => {
  const [document, setDocument] = useState('');
  const [fileError, setFileError] = useState<string>();
  const { connectorType, skippedOperations, isOpenApi, error } = useMemo(
    () => parseInput(document),
    [document]
  );
  const canApply = connectorType !== undefined && !isDisabled && !fileError;

  const onFileChange = useCallback(async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (file.size > 1_000_000) {
      setFileError(
        i18n.translate(
          'xpack.triggersActionsUI.sections.buildConnectorPage.openApiFileTooLargeErrorMessage',
          {
            defaultMessage: 'OpenAPI file must be at most 1 MB.',
          }
        )
      );
      return;
    }
    try {
      setDocument(await file.text());
      setFileError(undefined);
    } catch {
      setFileError(
        i18n.translate(
          'xpack.triggersActionsUI.sections.buildConnectorPage.openApiFileReadErrorMessage',
          {
            defaultMessage: 'Could not read the OpenAPI file.',
          }
        )
      );
    }
  }, []);

  const onBeautify = useCallback(() => {
    if (connectorType) {
      setDocument(isOpenApi ? formatOpenApi(document) : formatConnectorTypeYaml(connectorType));
    }
  }, [connectorType, document, isOpenApi]);

  const onApplyClick = useCallback(() => {
    if (connectorType) onApply(connectorType);
  }, [connectorType, onApply]);

  return (
    <>
      <EuiFormRow
        label={i18n.translate(
          'xpack.triggersActionsUI.sections.buildConnectorPage.openApiFileLabel',
          {
            defaultMessage: 'OpenAPI file',
          }
        )}
        helpText={i18n.translate(
          'xpack.triggersActionsUI.sections.buildConnectorPage.openApiFileDescription',
          { defaultMessage: 'Upload an OpenAPI 3.0 or 3.1 YAML or JSON file, or paste it below.' }
        )}
        fullWidth
        isInvalid={!!fileError}
        error={fileError}
      >
        <EuiFilePicker
          accept=".yaml,.yml,.json,application/json,application/yaml,text/yaml"
          onChange={onFileChange}
          isInvalid={!!fileError}
          data-test-subj="build-connector-openapi-file"
          fullWidth
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow
        label={i18n.translate(
          'xpack.triggersActionsUI.sections.buildConnectorPage.openApiFieldLabel',
          { defaultMessage: 'OpenAPI document' }
        )}
        helpText={i18n.translate(
          'xpack.triggersActionsUI.sections.buildConnectorPage.openApiFieldDescription',
          {
            defaultMessage:
              'Supported operations fill the form for review. Nothing is saved until you choose Save.',
          }
        )}
        fullWidth
        isInvalid={!!error}
        error={error}
      >
        <ResizableCodeEditor
          languageId={document.trimStart().startsWith('{') ? 'json' : 'yaml'}
          value={document}
          onChange={(value) => {
            setDocument(value);
            setFileError(undefined);
          }}
          defaultHeight={220}
          minHeight={120}
          options={EDITOR_OPTIONS}
          placeholder={OPENAPI_EXAMPLE}
          dataTestSubj="build-connector-openapi-editor"
        />
      </EuiFormRow>
      {skippedOperations && skippedOperations.length > 0 && (
        <>
          <EuiSpacer size="m" />
          <KbnWarningCallout
            size="s"
            title={i18n.translate(
              'xpack.triggersActionsUI.sections.buildConnectorPage.openApiSkippedTitle',
              {
                defaultMessage:
                  '{count, plural, one {# operation could not be imported} other {# operations could not be imported}}',
                values: { count: skippedOperations.length },
              }
            )}
            data-test-subj="build-connector-openapi-skipped"
          >
            <ul>
              {skippedOperations.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </KbnWarningCallout>
        </>
      )}
      <EuiSpacer size="s" />
      <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={BEAUTIFY_LABEL} disableScreenReaderOutput>
            <EuiButtonIcon
              size="s"
              iconType="brush"
              aria-label={BEAUTIFY_LABEL}
              onClick={onBeautify}
              isDisabled={!canApply}
              data-test-subj="build-connector-openapi-beautify-btn"
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            onClick={onApplyClick}
            isDisabled={!canApply}
            data-test-subj="build-connector-openapi-apply-btn"
          >
            {i18n.translate(
              'xpack.triggersActionsUI.sections.buildConnectorPage.applyOpenApiButtonLabel',
              { defaultMessage: 'Apply to form' }
            )}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

export const OpenApiImportPanel = memo(OpenApiImportPanelComponent);
