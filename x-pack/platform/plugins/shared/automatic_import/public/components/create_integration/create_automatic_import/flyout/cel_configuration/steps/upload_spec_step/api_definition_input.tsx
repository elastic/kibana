/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiFilePicker, EuiFormRow, EuiSpacer, EuiText } from '@elastic/eui';
import Oas from 'oas';
import yaml from 'js-yaml';
import type { IntegrationSettings } from '../../../../types';
import * as i18n from './translations';
import { useActions } from '../../../../state';

interface PrepareOasErrorResult {
  error: string;
}
interface PrepareOasSuccessResult {
  oas: Oas;
}
type PrepareOasResult = PrepareOasSuccessResult | PrepareOasErrorResult;

/**
 * Prepares the OpenAPI specification file to send to the backend from the user-uploaded file.
 *
 * This function will return an error message if the uploaded API definition cannot be parsed into an OAS Document
 * from the uploaded JSON or YAML defintion file.
 *
 * @param fileContent The content of the user-provided API definition file.
 * @returns The parsed OAS object or an error message.
 */
const prepareOas = (fileContent: string): PrepareOasResult => {
  let parsedApiSpec: Oas;

  try {
    parsedApiSpec = new Oas(fileContent);
  } catch (parseJsonOasError) {
    try {
      const specYaml = yaml.load(fileContent);
      const specJson = JSON.stringify(specYaml);
      parsedApiSpec = new Oas(specJson);
    } catch (parseYamlOasError) {
      return { error: i18n.API_DEFINITION_ERROR.INVALID_OAS };
    }
  }
  return { oas: parsedApiSpec };
};

interface ApiDefinitionInputProps {
  integrationSettings: IntegrationSettings | undefined;
  showValidation: boolean;
  isGenerating: boolean;
  onModifySpecFile: (hasValidFile: boolean) => void;
}

export const ApiDefinitionInput = React.memo<ApiDefinitionInputProps>(
  ({ integrationSettings, showValidation, isGenerating, onModifySpecFile }) => {
    const { setIntegrationSettings } = useActions();
    const [uploadedFile, setUploadedFile] = useState<FileList | undefined>(undefined);
    const [isParsing, setIsParsing] = useState(false);
    const [apiFileError, setApiFileError] = useState<string>();

    const onChangeApiDefinition = useCallback(
      (files: FileList | null) => {
        if (!files || files.length === 0) {
          setUploadedFile(undefined);
          onModifySpecFile(false);
          return;
        }

        setUploadedFile(files);
        setApiFileError(undefined);
        setIntegrationSettings({
          ...integrationSettings,
          apiSpec: undefined,
          apiSpecFileName: undefined,
        });

        const apiDefinitionFile = files[0];
        const reader = new FileReader();

        reader.onloadstart = function () {
          setIsParsing(true);
        };

        reader.onloadend = function () {
          setIsParsing(false);
        };

        reader.onload = function (e) {
          const fileContent = e.target?.result as string | undefined; // We can safely cast to string since we call `readAsText` to load the file.

          if (fileContent == null) {
            setApiFileError(i18n.API_DEFINITION_ERROR.CAN_NOT_READ);
            onModifySpecFile(false);
            return;
          }

          if (fileContent === '' && e.loaded > 100000) {
            // V8-based browsers can't handle large files and return an empty string
            // instead of an error; see https://stackoverflow.com/a/61316641
            setApiFileError(i18n.API_DEFINITION_ERROR.TOO_LARGE_TO_PARSE);
            onModifySpecFile(false);
            return;
          }

          const prepareResult = prepareOas(fileContent);

          if ('error' in prepareResult) {
            setApiFileError(prepareResult.error);
            onModifySpecFile(false);
            return;
          }

          const { oas } = prepareResult;

          const oasPaths = oas.getPaths();

          // Verify we have valid GET paths in the uploaded spec file
          if (Object.values(oasPaths).filter((path) => path?.get).length === 0) {
            setApiFileError(i18n.API_DEFINITION_ERROR.NO_PATHS_IDENTIFIED);
            onModifySpecFile(false);
          }

          setIntegrationSettings({
            ...integrationSettings,
            apiSpec: oas,
            apiSpecFileName: apiDefinitionFile.name,
          });
        };

        const handleReaderError = function () {
          const message = reader.error?.message;
          if (message) {
            setApiFileError(i18n.API_DEFINITION_ERROR.CAN_NOT_READ_WITH_REASON(message));
          } else {
            setApiFileError(i18n.API_DEFINITION_ERROR.CAN_NOT_READ);
          }
        };

        reader.onerror = handleReaderError;
        reader.onabort = handleReaderError;

        reader.readAsText(apiDefinitionFile);
        onModifySpecFile(true);
      },
      [setIntegrationSettings, integrationSettings, onModifySpecFile]
    );

    return (
      <EuiFormRow
        fullWidth
        isDisabled={isGenerating}
        label={i18n.API_DEFINITION_TITLE}
        isInvalid={apiFileError != null || (showValidation && uploadedFile === undefined)}
        error={apiFileError ? apiFileError : i18n.SPEC_FILE_REQUIRED}
      >
        <>
          <EuiText size="s">
            <p>{i18n.OPEN_API_UPLOAD_INSTRUCTIONS}</p>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiFilePicker
            id="apiDefinitionFilePicker"
            fullWidth
            initialPromptText={
              <>
                <EuiText size="s" textAlign="center">
                  {i18n.API_DEFINITION_DESCRIPTION}
                </EuiText>
                <EuiText size="xs" color="subdued" textAlign="center">
                  {i18n.API_DEFINITION_DESCRIPTION_2}
                </EuiText>
              </>
            }
            onChange={onChangeApiDefinition}
            display="large"
            aria-label="Upload API definition file"
            data-loading={isParsing || isGenerating}
            isLoading={isParsing || isGenerating}
            isInvalid={apiFileError != null || (showValidation && uploadedFile === undefined)}
            data-test-subj="apiDefinitionFilePicker"
          />
        </>
      </EuiFormRow>
    );
  }
);
ApiDefinitionInput.displayName = 'ApiDefinitionInput';
