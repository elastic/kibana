/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiTitle,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiFormRow,
  EuiFieldText,
  EuiComboBox,
  EuiSpacer,
  EuiCallOut,
  EuiCheckableCard,
  EuiFilePicker,
  useEuiTheme,
} from '@elastic/eui';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { css } from '@emotion/react';
import { useParams } from 'react-router-dom';
import type { DataStream, InputType } from '../../../../../common';
import type { LogsSourceOption } from '../../forms/types';
import { useIntegrationForm } from '../../forms/integration_form';
import * as i18n from './translations';
import { FormStyledLabel } from '../../../../common/components/form_styled_label';
import {
  useFetchIndices,
  useValidateIndex,
  useCreateUpdateIntegration,
  useGetIntegrationById,
  useUploadSamples,
  generateId,
} from '../../../../common';

interface CreateDataStreamFlyoutProps {
  onClose: () => void;
}

const useLayoutStyles = () => {
  const { euiTheme } = useEuiTheme();
  return {
    formField: css`
      background-color: ${euiTheme.colors.backgroundBaseSubdued};
    `,
    comboBox: css`
      .euiComboBox__inputWrap {
        background-color: ${euiTheme.colors.backgroundBaseSubdued};
      }
    `,
    checkableCard: css`
      .euiSplitPanel__inner {
        background-color: transparent;
      }
    `,
  };
};

const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result as string | undefined;

      if (content == null) {
        reject(new Error(i18n.LOG_FILE_ERROR.CAN_NOT_READ));
        return;
      }

      // V8-based browsers can't handle large files and return an empty string
      // instead of an error; see https://stackoverflow.com/a/61316641
      if (content === '' && e.loaded > 100000) {
        reject(new Error(i18n.LOG_FILE_ERROR.TOO_LARGE_TO_PARSE));
        return;
      }

      resolve(content);
    };

    reader.onerror = () => {
      const message = reader.error?.message;
      reject(
        new Error(
          message
            ? i18n.LOG_FILE_ERROR.CAN_NOT_READ_WITH_REASON(message)
            : i18n.LOG_FILE_ERROR.CAN_NOT_READ
        )
      );
    };

    reader.onabort = () => {
      reject(new Error(i18n.LOG_FILE_ERROR.CAN_NOT_READ));
    };

    reader.readAsText(file);
  });
};

const dataCollectionMethodOptions: Array<EuiComboBoxOptionOption<string>> = [
  { value: 'filestream', label: 'File Stream' },
  { value: 'aws-s3', label: 'AWS S3' },
  { value: 'aws-cloudwatch', label: 'AWS Cloudwatch' },
  { value: 'azure-blob-storage', label: 'Azure Blob Storage' },
  { value: 'azure-eventhub', label: 'Azure Event Hub' },
  // { value: 'cel', label: 'API (CEL Input)' },
  { value: 'gcp-pubsub', label: 'GCP Pub/Sub' },
  { value: 'gcs', label: 'Google Cloud Storage' },
  { value: 'http_endpoint', label: 'HTTP Endpoint' },
  { value: 'kafka', label: 'Kafka' },
  { value: 'tcp', label: 'TCP' },
  { value: 'udp', label: 'UDP' },
];

export const CreateDataStreamFlyout: React.FC<CreateDataStreamFlyoutProps> = ({ onClose }) => {
  const styles = useLayoutStyles();
  const { integrationId: currentIntegrationId } = useParams<{ integrationId?: string }>();
  // React Query has a cache but needs to integration ID to find it.
  const { integration } = useGetIntegrationById(currentIntegrationId);
  const { form, formData } = useIntegrationForm();

  const { indices, isLoading: isLoadingIndices } = useFetchIndices();
  const {
    isValidating: isValidatingIndex,
    validationError: indexValidationError,
    validateIndex,
    clearValidationError: clearIndexValidationError,
  } = useValidateIndex();
  const { createUpdateIntegrationMutation, isLoading } = useCreateUpdateIntegration();
  const { uploadSamplesMutation, isLoading: isUploadingSamples } = useUploadSamples();

  const [isParsing, setIsParsing] = useState(false);
  const [fileError, setFileError] = useState<string | undefined>(undefined);
  const [uploadedFileName, setUploadedFileName] = useState<string | undefined>(undefined);

  const logsSourceOption = formData?.logsSourceOption ?? 'upload';
  const logSample = formData?.logSample;
  const selectedIndex = formData?.selectedIndex ?? '';

  const comboBoxOptions = useMemo(() => {
    const rawOptions = [
      { value: '', label: i18n.SELECT_PLACEHOLDER },
      ...indices.map((indexName) => ({
        value: indexName,
        label: indexName,
      })),
    ];

    // Filter Indices logic here
    return rawOptions.filter((option) => option.value !== '' && !option.value?.startsWith('.'));
  }, [indices]);

  const onChangeLogFile = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) {
        setFileError(undefined);
        setUploadedFileName(undefined);
        form.setFieldValue('logSample', undefined);
        return;
      }

      setFileError(undefined);
      setIsParsing(true);

      try {
        const file = files[0];
        setUploadedFileName(file.name);
        const content = await readFileAsText(file);
        form.setFieldValue('logSample', content);
      } catch (error) {
        setFileError(error instanceof Error ? error.message : i18n.LOG_FILE_ERROR.CAN_NOT_READ);
        setUploadedFileName(undefined);
        form.setFieldValue('logSample', undefined);
      } finally {
        setIsParsing(false);
      }
    },
    [form]
  );

  const handleLogsSourceChange = useCallback(
    async (option: LogsSourceOption) => {
      form.setFieldValue('logsSourceOption', option);
      if (option === 'upload') {
        clearIndexValidationError();
      } else {
        setFileError(undefined);
        if (selectedIndex) {
          await validateIndex(selectedIndex);
        }
      }
    },
    [form, clearIndexValidationError, selectedIndex, validateIndex]
  );

  const handleIndexChange = useCallback(
    async (value: string, fieldSetValue: (value: string) => void) => {
      fieldSetValue(value);
      clearIndexValidationError();

      if (value) {
        await validateIndex(value);
      }
    },
    [validateIndex, clearIndexValidationError]
  );

  // Check if integration-level required fields are filled (only when creating new integration)
  const isIntegrationFieldsValid =
    !!formData?.title?.trim() && !!formData?.description?.trim() && !!formData?.connectorId?.trim();

  const isDataStreamFieldsValid =
    !!formData?.dataStreamTitle?.trim() &&
    formData?.dataCollectionMethod != null &&
    formData.dataCollectionMethod.length > 0;

  const isLogSourceValid =
    (logsSourceOption === 'upload' && !!logSample) ||
    (logsSourceOption === 'index' && !!selectedIndex && !indexValidationError);

  const isAnalyzeDisabled =
    !isIntegrationFieldsValid ||
    !isDataStreamFieldsValid ||
    !isLogSourceValid ||
    isParsing ||
    isValidatingIndex ||
    isLoading ||
    isUploadingSamples;

  const handleAnalyzeLogs = useCallback(async () => {
    if (!formData) return;

    const integrationId = currentIntegrationId ?? generateId();
    const dataStreamId = generateId();
    const inputTypes: InputType[] = (formData.dataCollectionMethod ?? []).map((method) => ({
      name: method as InputType['name'],
    }));

    const newDataStream: DataStream = {
      dataStreamId,
      title: formData.dataStreamTitle,
      description: formData.dataStreamDescription ?? formData.dataStreamTitle,
      inputTypes,
    };

    if (logsSourceOption === 'upload' && logSample) {
      const samples = logSample
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      await uploadSamplesMutation.mutateAsync({
        integrationId,
        dataStreamId,
        samples,
        originalSource: {
          sourceType: 'file',
          sourceValue: uploadedFileName ?? 'uploaded-file.log',
        },
      });
    } else if (logsSourceOption === 'index' && selectedIndex) {
      // For index source, we don't need to upload
      // TODO: Add logic to fetch samples from the index.
    }

    await createUpdateIntegrationMutation.mutateAsync({
      connectorId: formData.connectorId,
      integrationId,
      title: formData.title,
      description: formData.description,
      ...(formData.logo ? { logo: formData.logo } : {}),
      dataStreams: [newDataStream],
    });
  }, [
    formData,
    createUpdateIntegrationMutation,
    uploadSamplesMutation,
    currentIntegrationId,
    logsSourceOption,
    logSample,
    selectedIndex,
    uploadedFileName,
  ]);

  return (
    <EuiFlyout
      onClose={onClose}
      size="m"
      aria-labelledby="createDataStreamFlyoutTitle"
      data-test-subj="createDataStreamFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="createDataStreamFlyoutTitle">
            {i18n.CREATE_DATA_STREAM_TITLE} {(integration?.dataStreams?.length ?? 0) + 1}
          </h2>
        </EuiTitle>
        <EuiText size="s" color="subdued">
          {i18n.CREATE_DATA_STREAM_DESCRIPTION}
        </EuiText>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {/* Hidden fields to register them with the form */}
        <UseField<string> path="logsSourceOption">{() => null}</UseField>
        <UseField<string | undefined> path="logSample">{() => null}</UseField>

        <UseField<string> path="dataStreamTitle">
          {(field) => (
            <EuiFormRow
              label={<FormStyledLabel text={i18n.DATA_STREAM_TITLE_LABEL} />}
              isInvalid={field.errors.length > 0}
              error={field.errors.map((e) => e.message)}
              fullWidth
            >
              <EuiFieldText
                value={field.value}
                onChange={(e) => field.setValue(e.target.value)}
                isInvalid={field.errors.length > 0}
                placeholder=""
                data-test-subj="dataStreamTitleInput"
                css={styles.formField}
                fullWidth
              />
            </EuiFormRow>
          )}
        </UseField>

        <UseField<string> path="dataStreamDescription">
          {(field) => (
            <EuiFormRow
              label={<FormStyledLabel text={i18n.DATA_STREAM_DESCRIPTION_LABEL} />}
              isInvalid={field.errors.length > 0}
              error={field.errors.map((e) => e.message)}
              fullWidth
            >
              <EuiFieldText
                value={field.value}
                onChange={(e) => field.setValue(e.target.value)}
                isInvalid={field.errors.length > 0}
                placeholder=""
                data-test-subj="dataStreamDescriptionInput"
                css={styles.formField}
                fullWidth
              />
            </EuiFormRow>
          )}
        </UseField>

        <UseField<string[]> path="dataCollectionMethod">
          {(field) => {
            const selectedOptions = dataCollectionMethodOptions.filter((option) =>
              field.value?.includes(option.value as string)
            );
            return (
              <EuiFormRow
                label={<FormStyledLabel text={i18n.DATA_COLLECTION_METHOD_LABEL} />}
                isInvalid={field.errors.length > 0}
                error={field.errors.map((e) => e.message)}
                fullWidth
              >
                <EuiComboBox
                  options={dataCollectionMethodOptions}
                  selectedOptions={selectedOptions}
                  onChange={(options) =>
                    field.setValue(options.map((option) => option.value as string))
                  }
                  isInvalid={field.errors.length > 0}
                  data-test-subj="dataCollectionMethodSelect"
                  css={styles.comboBox}
                  fullWidth
                />
              </EuiFormRow>
            );
          }}
        </UseField>

        <EuiSpacer size="l" />

        <EuiTitle size="xs">
          <h3>{i18n.LOGS_SECTION_TITLE}</h3>
        </EuiTitle>
        <EuiText size="s" color="subdued">
          {i18n.LOGS_SECTION_DESCRIPTION}
        </EuiText>

        <EuiSpacer size="m" />

        <EuiCallOut size="s" color="warning" title={i18n.AI_ANALYSIS_CALLOUT} />

        <EuiSpacer size="m" />

        <EuiCheckableCard
          id="logsSourceUpload"
          label={<FormStyledLabel text={i18n.UPLOAD_LOG_FILE_LABEL} />}
          checked={logsSourceOption === 'upload'}
          onChange={() => handleLogsSourceChange('upload')}
          data-test-subj="logsSourceUploadCard"
          css={styles.checkableCard}
        >
          <EuiFormRow fullWidth isInvalid={fileError != null} error={fileError}>
            <EuiFilePicker
              id="logFilePicker"
              fullWidth
              initialPromptText={i18n.FILE_PICKER_PROMPT}
              onChange={onChangeLogFile}
              display="large"
              aria-label={i18n.ARIA_LABELS.uploadLogFile}
              isLoading={isParsing}
              isInvalid={fileError != null}
              disabled={logsSourceOption !== 'upload'}
            />
          </EuiFormRow>
        </EuiCheckableCard>

        <EuiSpacer size="m" />

        <EuiCheckableCard
          id="logsSourceIndex"
          label={<FormStyledLabel text={i18n.SELECT_INDEX_LABEL} />}
          checked={logsSourceOption === 'index'}
          onChange={() => handleLogsSourceChange('index')}
          data-test-subj="logsSourceIndexCard"
          css={styles.checkableCard}
        >
          <UseField<string> path="selectedIndex">
            {(field) => {
              const selectedOptions = comboBoxOptions.filter((opt) => opt.value === field.value);
              return (
                <EuiFormRow
                  fullWidth
                  isInvalid={!!indexValidationError}
                  error={indexValidationError}
                  aria-label={i18n.ARIA_LABELS.selectIndex}
                >
                  <EuiComboBox
                    key={field.value ?? ''}
                    fullWidth
                    singleSelection={{ asPlainText: true }}
                    options={comboBoxOptions}
                    selectedOptions={selectedOptions}
                    onChange={(options) =>
                      handleIndexChange(
                        options.length > 0 ? (options[0].value as string) : '',
                        field.setValue
                      )
                    }
                    data-test-subj="indexSelect"
                    isDisabled={logsSourceOption !== 'index'}
                    isLoading={isLoadingIndices || isValidatingIndex}
                    isInvalid={!!indexValidationError}
                    css={styles.comboBox}
                  />
                </EuiFormRow>
              );
            }}
          </UseField>
        </EuiCheckableCard>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} data-test-subj="cancelDataStreamButton">
              {i18n.CANCEL_BUTTON}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={handleAnalyzeLogs}
              disabled={isAnalyzeDisabled}
              isLoading={isParsing || isLoading || isUploadingSamples}
              data-test-subj="analyzeLogsButton"
            >
              {i18n.ANALYZE_LOGS_BUTTON}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

CreateDataStreamFlyout.displayName = 'CreateDataStreamFlyout';
