/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink, EuiFormRow, EuiFilePicker, EuiSpacer } from '@elastic/eui';
import type { EuiFilePickerRef } from '@elastic/eui';
import React, { useCallback, useState, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

const SUPPORTED_CONFIG_EXTENSIONS = ['application/json', 'text/plain'];

const SELECT_CONFIG_FILE_LABEL = i18n.translate(
  'xpack.osquery.configUploader.initialPromptTextLabel',
  {
    defaultMessage: 'Select or drag and drop osquery config file',
  }
);

const ExampleConfigLink = React.memo(() => (
  <EuiLink
    href="https://github.com/osquery/osquery/blob/master/tools/deployment/osquery.example.conf"
    target="_blank"
  >
    <FormattedMessage
      id="xpack.osquery.configUploader.exampleConfigLinkLabel"
      defaultMessage="Example config"
    />
  </EuiLink>
));

ExampleConfigLink.displayName = 'ExampleOsqueryConfigLink';

interface ConfigUploaderProps {
  onChange: (payload: Record<string, unknown>) => void;
}

const ConfigUploaderComponent: React.FC<ConfigUploaderProps> = ({ onChange }) => {
  const filePickerRef = useRef<EuiFilePickerRef>(null);
  const [isInvalid, setIsInvalid] = useState<string | null>(null);

  const handleFileRead = useCallback(
    (content: string) => {
      let parsedContent;

      try {
        parsedContent = JSON.parse(content.replaceAll('\\\n', ''), (key, value) => {
          if (key === 'query') {
            // remove any multiple spaces from the query
            return value.replaceAll(/\s(?=\s)/gm, '');
          }

          return value;
        });

        setIsInvalid(null);
      } catch (error) {
        setIsInvalid(error);
        filePickerRef.current?.removeFiles();
      }

      onChange(parsedContent);
      filePickerRef.current?.removeFiles();
    },
    [onChange]
  );

  const handleFileChosen = useCallback(
    (file: File) => {
      const fileReader = new FileReader();
      fileReader.onloadend = () => handleFileRead(fileReader.result as string);
      fileReader.readAsText(file);
    },
    [handleFileRead]
  );

  const handleInputChange = useCallback(
    (inputFiles: any) => {
      if (!inputFiles.length) {
        return;
      }

      if (
        inputFiles.length &&
        ((!!inputFiles[0].type.length &&
          !SUPPORTED_CONFIG_EXTENSIONS.includes(inputFiles[0].type)) ??
          !inputFiles[0].name.endsWith('.conf'))
      ) {
        setIsInvalid(
          i18n.translate('xpack.osquery.configUploader.unsupportedFileTypeText', {
            defaultMessage:
              'File type {fileType} is not supported, please upload {supportedFileTypes} config file',
            values: {
              fileType: inputFiles[0].type,
              supportedFileTypes: SUPPORTED_CONFIG_EXTENSIONS.join(' or '),
            },
          })
        );
        filePickerRef.current?.removeFiles();

        return;
      }

      handleFileChosen(inputFiles[0]);
    },
    [handleFileChosen]
  );

  return (
    <>
      <EuiSpacer size="xl" />
      <EuiFormRow
        fullWidth
        labelAppend={<ExampleConfigLink />}
        isInvalid={!!isInvalid}
        error={<>{`${isInvalid}`}</>}
      >
        <EuiFilePicker
          ref={filePickerRef}
          id="osquery_config_picker"
          aria-label={SELECT_CONFIG_FILE_LABEL}
          initialPromptText={SELECT_CONFIG_FILE_LABEL}
          onChange={handleInputChange}
          display="large"
          fullWidth
          isInvalid={!!isInvalid}
          accept={SUPPORTED_CONFIG_EXTENSIONS.join(',')}
        />
      </EuiFormRow>
    </>
  );
};

export const ConfigUploader = React.memo(ConfigUploaderComponent);
