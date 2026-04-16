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
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { css } from '@emotion/react';
import { useParams } from 'react-router-dom';
import {
  normalizeLogSamplesFromFileContent,
  UPLOAD_SAMPLES_MAX_LINES,
  type DataStream,
  type InputType,
} from '../../../../../common';
import { PLUGIN_ID } from '../../../../../common/constants';
import type { LogsSourceOption } from '../../forms/types';
import { useIntegrationForm } from '../../forms/integration_form';
import * as formI18n from '../../forms/translations';
import * as i18n from './translations';
import { FormStyledLabel } from '../../../../common/components/form_styled_label';
import {
  useFetchIndices,
  useValidateIndex,
  useCreateUpdateIntegration,
  useGetIntegrationById,
  useUploadSamples,
  isValidNameFormat,
  startsWithLetter,
  useKibana,
} from '../../../../common';
import { meetsMinLength, normalizeTitleName } from '../../../../common/lib/helper_functions';
import { useTelemetry } from '../../../telemetry_context';

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

interface AnalyzeLogsValidationParams {
  integrationTitle: string;
  dataStreamTitle: string;
  description?: string;
  connectorId?: string;
  dataStreamDescription?: string;
  dataCollectionMethod?: string[];
  hasDuplicateDataStreamName: boolean;
  logsSourceOption: string;
  logSample?: string;
  selectedIndex: string;
  indexValidationError?: string | null;
}

const getAnalyzeLogsValidationReasons = (params: AnalyzeLogsValidationParams): string[] => {
  const reasons: string[] = [];
  if (!params.integrationTitle) {
    reasons.push(formI18n.TITLE_REQUIRED);
  } else {
    if (!meetsMinLength(params.integrationTitle)) {
      reasons.push(formI18n.NAME_TOO_SHORT);
    }
    if (!isValidNameFormat(params.integrationTitle)) {
      reasons.push(formI18n.NAME_INVALID_FORMAT);
    }
    if (!startsWithLetter(params.integrationTitle)) {
      reasons.push(formI18n.NAME_MUST_START_WITH_LETTER);
    }
  }
  if (!params.description?.trim()) {
    reasons.push(formI18n.DESCRIPTION_REQUIRED);
  }
  if (!params.connectorId?.trim()) {
    reasons.push(formI18n.CONNECTOR_REQUIRED);
  }
  if (!params.dataStreamTitle) {
    reasons.push(formI18n.DATA_STREAM_TITLE_REQUIRED);
  } else {
    if (!meetsMinLength(params.dataStreamTitle)) {
      reasons.push(formI18n.NAME_TOO_SHORT);
    }
    if (params.hasDuplicateDataStreamName) {
      reasons.push(formI18n.DATA_STREAM_TITLE_ALREADY_EXISTS);
    }
    if (!isValidNameFormat(params.dataStreamTitle)) {
      reasons.push(formI18n.NAME_INVALID_FORMAT);
    }
    if (!startsWithLetter(params.dataStreamTitle)) {
      reasons.push(formI18n.NAME_MUST_START_WITH_LETTER);
    }
  }
  if (!params.dataStreamDescription?.trim()) {
    reasons.push(formI18n.DATA_STREAM_DESCRIPTION_REQUIRED);
  }
  if (!params.dataCollectionMethod?.length) {
    reasons.push(formI18n.DATA_COLLECTION_METHOD_REQUIRED);
  }
  if (params.logsSourceOption === 'file' && !params.logSample) {
    reasons.push(formI18n.LOG_SAMPLE_REQUIRED);
  }
  if (params.logsSourceOption === 'index') {
    if (!params.selectedIndex) {
      reasons.push(formI18n.SELECTED_INDEX_REQUIRED);
    } else if (params.indexValidationError) {
      reasons.push(params.indexValidationError);
    }
  }
  return reasons;
};

interface AnalyzeFormValidityParams {
  integrationTitle: string;
  description?: string;
  connectorId?: string;
  dataStreamTitle: string;
  dataStreamDescription?: string;
  dataCollectionMethod?: string[];
  hasDuplicateDataStreamName: boolean;
  logsSourceOption: string;
  logSample?: string;
  selectedIndex: string;
  indexValidationError?: string | null;
  isParsing: boolean;
  isValidatingIndex: boolean;
  isLoading: boolean;
  isUploadingSamples: boolean;
}

const isValidTitle = (title: string): boolean =>
  !!title && meetsMinLength(title) && isValidNameFormat(title) && startsWithLetter(title);

const checkIntegrationFieldsValid = (params: AnalyzeFormValidityParams): boolean =>
  isValidTitle(params.integrationTitle) &&
  !!params.description?.trim() &&
  !!params.connectorId?.trim();

const checkDataStreamFieldsValid = (params: AnalyzeFormValidityParams): boolean =>
  isValidTitle(params.dataStreamTitle) &&
  !!params.dataStreamDescription?.trim() &&
  !params.hasDuplicateDataStreamName &&
  params.dataCollectionMethod != null &&
  params.dataCollectionMethod.length > 0;

const checkLogSourceValid = (params: AnalyzeFormValidityParams): boolean =>
  (params.logsSourceOption === 'file' && !!params.logSample) ||
  (params.logsSourceOption === 'index' && !!params.selectedIndex && !params.indexValidationError);

const useAnalyzeFormValidity = (params: AnalyzeFormValidityParams) => {
  const isAnalyzeDisabled =
    !checkIntegrationFieldsValid(params) ||
    !checkDataStreamFieldsValid(params) ||
    !checkLogSourceValid(params) ||
    params.isParsing ||
    params.isValidatingIndex ||
    params.isLoading ||
    params.isUploadingSamples;

  return { isAnalyzeDisabled };
};

export const CreateDataStreamFlyout: React.FC<CreateDataStreamFlyoutProps> = ({ onClose }) => {
  const { euiTheme } = useEuiTheme();
  const styles = useLayoutStyles();
  const { integrationId: currentIntegrationId } = useParams<{ integrationId?: string }>();
  const { reportAnalyzeLogsTriggered } = useTelemetry();
  const { notifications, application } = useKibana().services;

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
  const [collectionMethodResetKey, setCollectionMethodResetKey] = useState(0);

  const logsSourceOption = formData?.logsSourceOption ?? 'file';
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
      if (option === 'file') {
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

  const integrationTitle = formData?.title?.trim() ?? '';
  const dataStreamTitle = formData?.dataStreamTitle?.trim() ?? '';

  const existingDataStreamNames = useMemo(
    () => new Set((integration?.dataStreams ?? []).map((ds) => ds.title.toLowerCase())),
    [integration?.dataStreams]
  );

  const hasDuplicateDataStreamName =
    !!dataStreamTitle && existingDataStreamNames.has(dataStreamTitle.toLowerCase());

  const { isAnalyzeDisabled } = useAnalyzeFormValidity({
    integrationTitle,
    description: formData?.description,
    connectorId: formData?.connectorId,
    dataStreamTitle,
    dataStreamDescription: formData?.dataStreamDescription,
    dataCollectionMethod: formData?.dataCollectionMethod,
    hasDuplicateDataStreamName,
    logsSourceOption,
    logSample,
    selectedIndex,
    indexValidationError,
    isParsing,
    isValidatingIndex,
    isLoading,
    isUploadingSamples,
  });

  const analyzeLogsValidationReasons = useMemo(
    () =>
      getAnalyzeLogsValidationReasons({
        integrationTitle,
        dataStreamTitle,
        description: formData?.description,
        connectorId: formData?.connectorId,
        dataStreamDescription: formData?.dataStreamDescription,
        dataCollectionMethod: formData?.dataCollectionMethod,
        hasDuplicateDataStreamName,
        logsSourceOption,
        logSample,
        selectedIndex,
        indexValidationError,
      }),
    [
      integrationTitle,
      dataStreamTitle,
      formData?.description,
      formData?.connectorId,
      formData?.dataStreamDescription,
      formData?.dataCollectionMethod,
      hasDuplicateDataStreamName,
      logsSourceOption,
      logSample,
      selectedIndex,
      indexValidationError,
    ]
  );

  const analyzeLogsDisabledTooltipContent = useMemo(() => {
    if (!isAnalyzeDisabled) {
      return null;
    }
    if (analyzeLogsValidationReasons.length > 0) {
      return (
        <EuiText size="xs" component="div">
          <ul
            css={css`
              margin-block: 0;
              padding-inline-start: ${euiTheme.size.base};
            `}
          >
            {analyzeLogsValidationReasons.map((reason, index) => (
              <li key={`${reason}-${index}`}>{reason}</li>
            ))}
          </ul>
        </EuiText>
      );
    }
    if (isParsing || isValidatingIndex || isLoading || isUploadingSamples) {
      return i18n.ANALYZE_LOGS_DISABLED_LOADING;
    }
    return null;
  }, [
    analyzeLogsValidationReasons,
    euiTheme.size.base,
    isAnalyzeDisabled,
    isLoading,
    isParsing,
    isUploadingSamples,
    isValidatingIndex,
  ]);

  const handleAnalyzeLogs = useCallback(async () => {
    if (!formData) return;

    const trimmedIntegrationTitle = formData.title?.trim() ?? '';
    const trimmedDataStreamTitle = formData.dataStreamTitle?.trim() ?? '';
    if (!isValidTitle(trimmedIntegrationTitle) || !isValidTitle(trimmedDataStreamTitle)) {
      return;
    }

    const integrationId = currentIntegrationId ?? normalizeTitleName(trimmedIntegrationTitle);
    const dataStreamId = normalizeTitleName(trimmedDataStreamTitle);
    const inputTypes: InputType[] = (formData.dataCollectionMethod ?? []).map((method) => ({
      name: method as InputType['name'],
    }));

    const newDataStream: DataStream = {
      dataStreamId,
      title: formData.dataStreamTitle,
      description: formData.dataStreamDescription ?? formData.dataStreamTitle,
      inputTypes,
    };

    try {
      if (logsSourceOption === 'file' && logSample) {
        const { samples, linesOmittedOverLimit } = normalizeLogSamplesFromFileContent(logSample);

        if (linesOmittedOverLimit > 0) {
          notifications.toasts.addWarning({
            title: i18n.SAMPLES_NORMALIZED_WARNING_TITLE,
            text: i18n.SAMPLES_NORMALIZED_WARNING_LINES_OMITTED(
              linesOmittedOverLimit,
              UPLOAD_SAMPLES_MAX_LINES
            ),
          });
        }

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
        await uploadSamplesMutation.mutateAsync({
          integrationId,
          dataStreamId,
          sourceIndex: selectedIndex,
          originalSource: {
            sourceType: 'index',
            sourceValue: selectedIndex,
          },
        });
      }

      const result = await createUpdateIntegrationMutation.mutateAsync({
        connectorId: formData.connectorId,
        integrationId,
        title: formData.title,
        description: formData.description,
        ...(formData.logo ? { logo: formData.logo } : {}),
        dataStreams: [newDataStream],
      });

      onClose();

      if (!currentIntegrationId && result.integration_id) {
        application.navigateToApp(PLUGIN_ID, {
          path: `/edit/${result.integration_id}`,
          state: { isNew: true },
        });
      }
    } catch (error) {
      notifications.toasts.addError(error instanceof Error ? error : new Error('Unknown error'), {
        title: i18n.CREATE_DATA_STREAM_ERROR,
      });
    } finally {
      reportAnalyzeLogsTriggered({
        logsSource: logsSourceOption,
      });
    }
  }, [
    formData,
    createUpdateIntegrationMutation,
    uploadSamplesMutation,
    currentIntegrationId,
    logsSourceOption,
    logSample,
    selectedIndex,
    uploadedFileName,
    onClose,
    reportAnalyzeLogsTriggered,
    notifications,
    application,
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
                data-test-subj="dataStreamTitleInputV2"
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
                data-test-subj="dataStreamDescriptionInputV2"
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
                  key={collectionMethodResetKey}
                  options={dataCollectionMethodOptions}
                  selectedOptions={selectedOptions}
                  onChange={(options) => {
                    field.setValue(options.map((option) => option.value as string));
                    if (options.length === 0) {
                      setCollectionMethodResetKey((k) => k + 1);
                    }
                  }}
                  isClearable
                  isInvalid={field.errors.length > 0}
                  data-test-subj="dataCollectionMethodSelect"
                  aria-label={i18n.DATA_COLLECTION_METHOD_LABEL}
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
        <EuiSpacer size="xs" />
        <EuiText size="s">{i18n.LOG_SAMPLE_REQUIRED_FOR_ANALYSIS}</EuiText>

        <EuiSpacer size="m" />

        <EuiCallOut size="s" color="warning" title={i18n.AI_ANALYSIS_CALLOUT} />

        <EuiSpacer size="m" />

        <EuiCheckableCard
          id="logsSourceUpload"
          label={<FormStyledLabel text={i18n.UPLOAD_LOG_FILE_LABEL} />}
          checked={logsSourceOption === 'file'}
          onChange={() => handleLogsSourceChange('file')}
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
              disabled={logsSourceOption !== 'file'}
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
                    aria-label={i18n.ARIA_LABELS.selectIndex}
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
            {isAnalyzeDisabled && analyzeLogsDisabledTooltipContent != null ? (
              <EuiToolTip content={analyzeLogsDisabledTooltipContent} position="top">
                <span tabIndex={0}>
                  <EuiButton
                    fill
                    onClick={handleAnalyzeLogs}
                    disabled={isAnalyzeDisabled}
                    isLoading={isParsing || isLoading || isUploadingSamples}
                    data-test-subj="analyzeLogsButton"
                  >
                    {i18n.ANALYZE_LOGS_BUTTON}
                  </EuiButton>
                </span>
              </EuiToolTip>
            ) : (
              <EuiButton
                fill
                onClick={handleAnalyzeLogs}
                disabled={isAnalyzeDisabled}
                isLoading={isParsing || isLoading || isUploadingSamples}
                data-test-subj="analyzeLogsButton"
              >
                {i18n.ANALYZE_LOGS_BUTTON}
              </EuiButton>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

CreateDataStreamFlyout.displayName = 'CreateDataStreamFlyout';
