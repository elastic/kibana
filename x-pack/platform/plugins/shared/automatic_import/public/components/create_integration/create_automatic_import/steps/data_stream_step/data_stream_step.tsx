/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiBetaBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiComboBox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { InputType } from '../../../../../../common';
import {
  DATASTREAM_NAME_REGEX_PATTERN,
  NAME_REGEX_PATTERN,
} from '../../../../../../common/constants';
import { useActions, type State } from '../../state';
import type { IntegrationSettings } from '../../types';
import { StepContentWrapper } from '../step_content_wrapper';
import { GenerationModal } from './generation_modal';
import { SampleLogsInput } from './sample_logs_input';
import * as i18n from './translations';
import type { OnComplete } from './use_generation';
import { useLoadPackageNames } from './use_load_package_names';

export const InputTypeOptions: Array<EuiComboBoxOptionOption<InputType>> = [
  { value: 'aws-cloudwatch', label: 'AWS Cloudwatch' },
  { value: 'aws-s3', label: 'AWS S3' },
  { value: 'azure-blob-storage', label: 'Azure Blob Storage' },
  { value: 'azure-eventhub', label: 'Azure Event Hub' },
  { value: 'cel', label: 'API (CEL Input)' },
  { value: 'cloudfoundry', label: 'Cloud Foundry' },
  { value: 'filestream', label: 'File Stream' },
  { value: 'gcp-pubsub', label: 'GCP Pub/Sub' },
  { value: 'gcs', label: 'Google Cloud Storage' },
  { value: 'http_endpoint', label: 'HTTP Endpoint' },
  { value: 'journald', label: 'Journald' },
  { value: 'kafka', label: 'Kafka' },
  { value: 'tcp', label: 'TCP' },
  { value: 'udp', label: 'UDP' },
];

const isValidName = (name: string) => NAME_REGEX_PATTERN.test(name);
const isValidDatastreamName = (name: string) => DATASTREAM_NAME_REGEX_PATTERN.test(name);
export const getNameFromTitle = (title: string) =>
  title.toLowerCase().replaceAll(/[^a-z0-9]/g, '_');

interface DataStreamStepProps {
  integrationSettings: State['integrationSettings'];
  celInputResult: State['celInputResult'];
  connector: State['connector'];
  isGenerating: State['isGenerating'];
}
export const DataStreamStep = React.memo<DataStreamStepProps>(
  ({ integrationSettings, celInputResult, connector, isGenerating }) => {
    const {
      setIntegrationSettings,
      setIsGenerating,
      setShowCelCreateFlyout,
      setStep,
      setResult,
      completeStep,
    } = useActions();
    const { isLoading: isLoadingPackageNames, packageNames } = useLoadPackageNames(); // this is used to avoid duplicate names

    const [name, setName] = useState<string>(integrationSettings?.name ?? '');
    const [dataStreamName, setDataStreamName] = useState<string>(
      integrationSettings?.dataStreamName ?? ''
    );
    const [invalidFields, setInvalidFields] = useState({ name: false, dataStreamName: false });
    const [showCelOpenApiSpecButton, setShowCelOpenApiSpecButton] = useState<boolean>(false);

    const setIntegrationValues = useCallback(
      (settings: Partial<IntegrationSettings>) =>
        setIntegrationSettings({ ...integrationSettings, ...settings }),
      [integrationSettings, setIntegrationSettings]
    );

    const onChange = useMemo(() => {
      return {
        name: (e: React.ChangeEvent<HTMLInputElement>) => {
          const nextName = e.target.value;
          setName(nextName);
          if (!isValidName(nextName) || packageNames?.has(nextName)) {
            setInvalidFields((current) => ({ ...current, name: true }));
            setIntegrationValues({ name: undefined });
          } else {
            setInvalidFields((current) => ({ ...current, name: false }));
            setIntegrationValues({ name: nextName });
          }
        },
        dataStreamName: (e: React.ChangeEvent<HTMLInputElement>) => {
          const nextDataStreamName = e.target.value;
          setDataStreamName(nextDataStreamName);
          if (!isValidDatastreamName(nextDataStreamName)) {
            setInvalidFields((current) => ({ ...current, dataStreamName: true }));
            setIntegrationValues({ dataStreamName: undefined });
          } else {
            setInvalidFields((current) => ({ ...current, dataStreamName: false }));
            setIntegrationValues({ dataStreamName: nextDataStreamName });
          }
        },
        // inputs without validation
        dataStreamTitle: (e: React.ChangeEvent<HTMLInputElement>) =>
          setIntegrationValues({ dataStreamTitle: e.target.value }),
        dataStreamDescription: (e: React.ChangeEvent<HTMLInputElement>) =>
          setIntegrationValues({ dataStreamDescription: e.target.value }),
        inputTypes: (options: EuiComboBoxOptionOption[]) => {
          setIntegrationValues({ inputTypes: options.map((option) => option.value as InputType) });
          setShowCelOpenApiSpecButton(
            // the cel value here comes from the input type options defined above
            options.map((option) => option.value as InputType).includes('cel' as InputType)
          );
        },
      };
    }, [setIntegrationValues, setInvalidFields, packageNames]);

    useEffect(() => {
      // Pre-populates the name from the title set in the previous step.
      // Only executed once when the packageNames are loaded
      if (packageNames != null && integrationSettings?.name == null && integrationSettings?.title) {
        const generatedName = getNameFromTitle(integrationSettings.title);
        if (!packageNames.has(generatedName) && isValidName(generatedName)) {
          setName(generatedName);
          setIntegrationValues({ name: generatedName });
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [packageNames]);

    const onGenerationCompleted = useCallback<OnComplete>(
      (result: State['result']) => {
        if (result) {
          setResult(result);
          setIsGenerating(false);
          setStep(4);
        }
      },
      [setResult, setIsGenerating, setStep]
    );
    const onGenerationClosed = useCallback(() => {
      setIsGenerating(false); // aborts generation
    }, [setIsGenerating]);

    const nameInputError = useMemo(() => {
      if (packageNames && name && packageNames.has(name)) {
        return i18n.NAME_ALREADY_EXISTS_ERROR;
      }
    }, [packageNames, name]);

    const selectedInputTypeOptions = useMemo<Array<EuiComboBoxOptionOption<InputType>>>(
      () =>
        InputTypeOptions.filter((inputType) =>
          integrationSettings?.inputTypes?.includes(inputType.value as InputType)
        ),
      [integrationSettings?.inputTypes]
    );

    return (
      <EuiForm
        component="form"
        fullWidth
        onSubmit={(e) => {
          e.preventDefault();
          completeStep();
        }}
      >
        <EuiFlexGroup direction="column" gutterSize="l" data-test-subj="dataStreamStep">
          <EuiFlexItem>
            <StepContentWrapper
              title={i18n.INTEGRATION_NAME_TITLE}
              subtitle={i18n.INTEGRATION_NAME_DESCRIPTION}
            >
              <EuiPanel hasShadow={false} hasBorder>
                <EuiFormRow
                  label={i18n.INTEGRATION_NAME_LABEL}
                  helpText={
                    !nameInputError && !invalidFields.name ? i18n.NO_SPACES_HELP : undefined
                  }
                  isInvalid={!!nameInputError || invalidFields.name}
                  error={[nameInputError ?? i18n.NO_SPACES_HELP]}
                >
                  <EuiFieldText
                    name="name"
                    data-test-subj="nameInput"
                    value={name}
                    onChange={onChange.name}
                    isInvalid={invalidFields.name}
                    isLoading={isLoadingPackageNames}
                    disabled={isLoadingPackageNames}
                  />
                </EuiFormRow>
              </EuiPanel>
            </StepContentWrapper>
          </EuiFlexItem>

          <EuiFlexItem>
            <StepContentWrapper
              title={i18n.DATA_STREAM_TITLE}
              subtitle={i18n.DATA_STREAM_DESCRIPTION}
            >
              <EuiPanel hasShadow={false} hasBorder>
                <EuiFormRow label={i18n.DATA_STREAM_TITLE_LABEL}>
                  <EuiFieldText
                    name="dataStreamTitle"
                    data-test-subj="dataStreamTitleInput"
                    value={integrationSettings?.dataStreamTitle ?? ''}
                    onChange={onChange.dataStreamTitle}
                  />
                </EuiFormRow>
                <EuiFormRow label={i18n.DATA_STREAM_DESCRIPTION_LABEL}>
                  <EuiFieldText
                    name="dataStreamDescription"
                    data-test-subj="dataStreamDescriptionInput"
                    value={integrationSettings?.dataStreamDescription ?? ''}
                    onChange={onChange.dataStreamDescription}
                  />
                </EuiFormRow>
                <EuiFormRow
                  label={i18n.DATA_STREAM_NAME_LABEL}
                  helpText={!invalidFields.dataStreamName ? i18n.NO_SPACES_HELP : undefined}
                  isInvalid={invalidFields.dataStreamName}
                  error={[i18n.NO_SPACES_HELP]}
                >
                  <EuiFieldText
                    name="dataStreamName"
                    data-test-subj="dataStreamNameInput"
                    value={dataStreamName}
                    onChange={onChange.dataStreamName}
                    isInvalid={invalidFields.dataStreamName}
                  />
                </EuiFormRow>
                <EuiFormRow label={i18n.DATA_COLLECTION_METHOD_LABEL}>
                  <EuiComboBox
                    data-test-subj="dataCollectionMethodInput"
                    options={InputTypeOptions}
                    selectedOptions={selectedInputTypeOptions}
                    onChange={onChange.inputTypes}
                    fullWidth
                  />
                </EuiFormRow>
                {showCelOpenApiSpecButton && (
                  <EuiFormRow
                    label={
                      <EuiFlexGroup direction="row" gutterSize="s">
                        {i18n.ADD_OPEN_API_SPEC_LABEL}
                        <EuiBetaBadge
                          iconType="beaker"
                          label={i18n.TECH_PREVIEW}
                          tooltipContent={i18n.TECH_PREVIEW_TOOLTIP}
                          size="s"
                          color="hollow"
                          data-test-subj="techPreviewBadge"
                        />
                      </EuiFlexGroup>
                    }
                    labelAppend={
                      <EuiText size="xs" color="subdued">
                        <p>{i18n.ADD_OPEN_API_SPEC_OPTIONAL_LABEL}</p>
                      </EuiText>
                    }
                  >
                    <EuiFlexGroup direction="column">
                      <EuiText size="xs">
                        <p>{i18n.ADD_OPEN_API_SPEC_DESCRIPTION}</p>
                      </EuiText>
                      <EuiFlexGroup>
                        {celInputResult ? (
                          <EuiFlexGroup direction="column" gutterSize="s">
                            <EuiFlexGroup>
                              <EuiFlexItem grow={false}>
                                <EuiButton
                                  iconType="check"
                                  color="success"
                                  data-test-subj="openApiConfigured"
                                >
                                  <EuiText size="xs">
                                    {i18n.OPEN_API_SPEC_BUTTON_CONFIGURED}
                                  </EuiText>
                                </EuiButton>
                              </EuiFlexItem>
                            </EuiFlexGroup>
                            <EuiTitle size="xxxs">
                              <h5>{integrationSettings?.apiSpecFileName}</h5>
                            </EuiTitle>
                            <EuiText size="xs">{integrationSettings?.celPath}</EuiText>
                            <EuiFlexGroup>
                              <EuiFlexItem grow={false}>
                                <EuiButtonEmpty
                                  iconType="pencil"
                                  onClick={() => setShowCelCreateFlyout(true)}
                                >
                                  <EuiText size="xs">{i18n.EDIT_OPEN_API_SPEC_BUTTON}</EuiText>
                                </EuiButtonEmpty>
                              </EuiFlexItem>
                            </EuiFlexGroup>
                          </EuiFlexGroup>
                        ) : (
                          <EuiFlexItem grow={false}>
                            <EuiButton
                              iconType="plusInCircle"
                              onClick={() => setShowCelCreateFlyout(true)}
                              data-test-subj="addOpenApiSpecButton"
                            >
                              <EuiText size="xs">{i18n.ADD_OPEN_API_SPEC_BUTTON}</EuiText>
                            </EuiButton>
                          </EuiFlexItem>
                        )}
                      </EuiFlexGroup>
                    </EuiFlexGroup>
                  </EuiFormRow>
                )}
                <EuiSpacer size="m" />
                <SampleLogsInput integrationSettings={integrationSettings} />
              </EuiPanel>
            </StepContentWrapper>
            {isGenerating && (
              <GenerationModal
                integrationSettings={integrationSettings}
                connector={connector}
                onComplete={onGenerationCompleted}
                onClose={onGenerationClosed}
              />
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiForm>
    );
  }
);
DataStreamStep.displayName = 'DataStreamStep';
