/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiButton,
  EuiButtonEmpty,
  EuiCheckableCard,
  EuiCodeBlock,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiIconTip,
  EuiLink,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiSuperSelect,
  EuiSwitch,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import type { DestinationStorage } from '../../stream_list_view/canvas/types';
import {
  ADD_DESTINATION_MODAL_NAME_HELP,
  ADD_DESTINATION_MODAL_NAME_LABEL,
  ADD_DESTINATION_MODAL_NAME_PLACEHOLDER,
  ADD_DESTINATION_MODAL_SUBMIT,
  ADD_DESTINATION_MODAL_TITLE,
  CANCEL_BUTTON_LABEL,
} from './translations';

/** Object-store / streaming provider backing an external destination. */
export type ExternalProvider = 'amazon_s3' | 'azure_blob' | 'google_cloud' | 'kafka';

/** Serialization format for objects written to an external destination. */
export type ExternalFormat = 'json' | 'ndjson' | 'parquet';

/** Everything the modal collects for a new (or canvas-configured) destination. */
export interface AddDestinationDetails {
  name: string;
  storage: DestinationStorage;
  provider?: ExternalProvider;
  region?: string;
  bucket?: string;
  roleArn?: string;
  autoOptimize?: boolean;
  format?: ExternalFormat;
  externalId?: string;
}

const PROVIDER_OPTIONS: Array<{ value: ExternalProvider; label: string; icon: string }> = [
  {
    value: 'amazon_s3',
    icon: 'logoAWS',
    label: i18n.translate('xpack.streams.addDestinationModal.providerAmazonS3', {
      defaultMessage: 'Amazon S3',
    }),
  },
  {
    value: 'azure_blob',
    icon: 'logoAzure',
    label: i18n.translate('xpack.streams.addDestinationModal.providerAzureBlob', {
      defaultMessage: 'Azure Blob',
    }),
  },
  {
    value: 'google_cloud',
    icon: 'logoGCP',
    label: i18n.translate('xpack.streams.addDestinationModal.providerGoogleCloud', {
      defaultMessage: 'Google Cloud',
    }),
  },
  {
    value: 'kafka',
    icon: 'logoKafka',
    label: i18n.translate('xpack.streams.addDestinationModal.providerKafka', {
      defaultMessage: 'Kafka',
    }),
  },
];

const FORMAT_OPTIONS: Array<{ value: ExternalFormat; label: string }> = [
  { value: 'json', label: 'JSON' },
  { value: 'ndjson', label: 'NDJSON' },
  { value: 'parquet', label: 'Parquet' },
];

const LOCAL_LABEL = i18n.translate('xpack.streams.addDestinationModal.localLabel', {
  defaultMessage: 'Local Elasticsearch',
});

const EXTERNAL_LABEL = i18n.translate('xpack.streams.addDestinationModal.externalLabel', {
  defaultMessage: 'External storage',
});

const PREVIEW_PATH_TEMPLATE =
  's3://bucket/<signal>/project={id}/year=YYYY/month=MM/day=DD/hour=HH/<uuid>.json';

export function AddDestinationModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (details: AddDestinationDetails) => void;
}) {
  const { euiTheme } = useEuiTheme();
  const titleId = useGeneratedHtmlId({ prefix: 'addDestinationModalTitle' });
  const typeGroupId = useGeneratedHtmlId({ prefix: 'addDestinationType' });
  const advancedAccordionId = useGeneratedHtmlId({ prefix: 'addDestinationAdvanced' });

  const [name, setName] = useState('');
  const [storage, setStorage] = useState<DestinationStorage>('local');
  const [provider, setProvider] = useState<ExternalProvider>('amazon_s3');
  const [region, setRegion] = useState('');
  const [bucket, setBucket] = useState('');
  const [roleArn, setRoleArn] = useState('');
  const [autoOptimize, setAutoOptimize] = useState(true);
  const [format, setFormat] = useState<ExternalFormat>('json');
  const [externalId, setExternalId] = useState('');

  const trimmedName = name.trim();

  const handleSubmit = () => {
    onAdd(
      storage === 'external'
        ? {
            name: trimmedName,
            storage,
            provider,
            region: region.trim() || undefined,
            bucket: bucket.trim() || undefined,
            roleArn: roleArn.trim() || undefined,
            autoOptimize,
            format: autoOptimize ? undefined : format,
            externalId: autoOptimize ? undefined : externalId.trim() || undefined,
          }
        : { name: trimmedName, storage }
    );
  };

  const externalFields = (
    <>
      <EuiFormRow
        label={i18n.translate('xpack.streams.addDestinationModal.providerLabel', {
          defaultMessage: 'Provider',
        })}
        fullWidth
      >
        <EuiSuperSelect
          fullWidth
          valueOfSelected={provider}
          onChange={setProvider}
          data-test-subj="streamsDestinationsAddModalProvider"
          options={PROVIDER_OPTIONS.map((option) => ({
            value: option.value,
            inputDisplay: (
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiIcon type={option.icon} title={option.label} />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>{option.label}</EuiFlexItem>
              </EuiFlexGroup>
            ),
          }))}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow
        label={i18n.translate('xpack.streams.addDestinationModal.regionLabel', {
          defaultMessage: 'Region',
        })}
        labelAppend={
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.streams.addDestinationModal.regionInferred', {
              defaultMessage: 'inferred',
            })}
          </EuiText>
        }
        helpText={i18n.translate('xpack.streams.addDestinationModal.regionHelp', {
          defaultMessage: 'AWS region of the bucket. Detected automatically if not set.',
        })}
        fullWidth
      >
        <EuiFieldText
          fullWidth
          value={region}
          onChange={(event) => setRegion(event.target.value)}
          placeholder="us-east-1"
          data-test-subj="streamsDestinationsAddModalRegion"
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow
        label={i18n.translate('xpack.streams.addDestinationModal.bucketLabel', {
          defaultMessage: 'Bucket',
        })}
        helpText={i18n.translate('xpack.streams.addDestinationModal.bucketHelp', {
          defaultMessage: 'The S3 bucket data is written to.',
        })}
        fullWidth
      >
        <EuiFieldText
          fullWidth
          value={bucket}
          onChange={(event) => setBucket(event.target.value)}
          data-test-subj="streamsDestinationsAddModalBucket"
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow
        label={
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              {i18n.translate('xpack.streams.addDestinationModal.roleArnLabel', {
                defaultMessage: 'Role ARN',
              })}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiIconTip
                type="info"
                color="subdued"
                content={i18n.translate('xpack.streams.addDestinationModal.roleArnTooltip', {
                  defaultMessage:
                    "Customer-managed IAM role ARN. Managed inputs assumes this role via AssumeRoleWithWebIdentity to obtain credentials for delivery. Bucket and key-prefix restrictions are enforced by this role's IAM policy.",
                })}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        fullWidth
      >
        <EuiFieldText
          fullWidth
          value={roleArn}
          onChange={(event) => setRoleArn(event.target.value)}
          data-test-subj="streamsDestinationsAddModalRoleArn"
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiAccordion
        id={advancedAccordionId}
        buttonContent={i18n.translate('xpack.streams.addDestinationModal.advancedLabel', {
          defaultMessage: 'Advanced',
        })}
        data-test-subj="streamsDestinationsAddModalAdvanced"
      >
        <EuiSpacer size="m" />
        <EuiSwitch
          checked={autoOptimize}
          onChange={(event) => setAutoOptimize(event.target.checked)}
          label={i18n.translate('xpack.streams.addDestinationModal.autoOptimizeLabel', {
            defaultMessage: 'Let Elastic work out the best design',
          })}
          data-test-subj="streamsDestinationsAddModalAutoOptimize"
        />
        {!autoOptimize && (
          <>
            <EuiSpacer size="m" />
            <EuiFormRow
              label={i18n.translate('xpack.streams.addDestinationModal.formatLabel', {
                defaultMessage: 'Format',
              })}
              labelAppend={
                <EuiText size="xs" color="subdued">
                  {i18n.translate('xpack.streams.addDestinationModal.formatDefault', {
                    defaultMessage: 'default: json',
                  })}
                </EuiText>
              }
              helpText={i18n.translate('xpack.streams.addDestinationModal.formatHelp', {
                defaultMessage: 'Serialization format for objects written to S3.',
              })}
              fullWidth
            >
              <EuiSuperSelect
                fullWidth
                valueOfSelected={format}
                onChange={setFormat}
                data-test-subj="streamsDestinationsAddModalFormat"
                options={FORMAT_OPTIONS.map((option) => ({
                  value: option.value,
                  inputDisplay: option.label,
                }))}
              />
            </EuiFormRow>
            <EuiSpacer size="m" />
            <EuiFormRow
              label={i18n.translate('xpack.streams.addDestinationModal.externalIdLabel', {
                defaultMessage: 'External ID',
              })}
              helpText={i18n.translate('xpack.streams.addDestinationModal.externalIdHelp', {
                defaultMessage: 'Recommended for third-party / cross-account roles.',
              })}
              fullWidth
            >
              <EuiFieldText
                fullWidth
                value={externalId}
                onChange={(event) => setExternalId(event.target.value)}
                data-test-subj="streamsDestinationsAddModalExternalId"
              />
            </EuiFormRow>
            <EuiSpacer size="m" />
            <EuiFormRow
              label={
                <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    {i18n.translate('xpack.streams.addDestinationModal.previewLabel', {
                      defaultMessage: 'Preview resulting object path',
                    })}
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiIconTip
                      type="info"
                      color="subdued"
                      content={i18n.translate('xpack.streams.addDestinationModal.previewTooltip', {
                        defaultMessage:
                          'The template Elastic uses to lay out written objects in your bucket.',
                      })}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              }
              labelAppend={
                <EuiLink href="#" external={false}>
                  {i18n.translate('xpack.streams.addDestinationModal.previewReadMore', {
                    defaultMessage: 'Read more',
                  })}
                </EuiLink>
              }
              fullWidth
            >
              <EuiCodeBlock
                paddingSize="s"
                fontSize="s"
                transparentBackground={false}
                data-test-subj="streamsDestinationsAddModalPreviewPath"
                css={css`
                  color: ${euiTheme.colors.textSubdued};
                `}
              >
                {PREVIEW_PATH_TEMPLATE}
              </EuiCodeBlock>
            </EuiFormRow>
          </>
        )}
      </EuiAccordion>
    </>
  );

  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby={titleId}
      style={{ width: 500 }}
      data-test-subj="streamsDestinationsAddModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>{ADD_DESTINATION_MODAL_TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFormRow
          label={ADD_DESTINATION_MODAL_NAME_LABEL}
          helpText={ADD_DESTINATION_MODAL_NAME_HELP}
          fullWidth
        >
          <EuiFieldText
            fullWidth
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={ADD_DESTINATION_MODAL_NAME_PLACEHOLDER}
            aria-label={ADD_DESTINATION_MODAL_NAME_LABEL}
            data-test-subj="streamsDestinationsAddModalName"
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiCheckableCard
          id={`${typeGroupId}-local`}
          name={typeGroupId}
          label={LOCAL_LABEL}
          value="local"
          checked={storage === 'local'}
          onChange={() => setStorage('local')}
          data-test-subj="streamsDestinationsAddModalTypeLocal"
        />
        <EuiSpacer size="s" />
        <EuiCheckableCard
          id={`${typeGroupId}-external`}
          name={typeGroupId}
          label={EXTERNAL_LABEL}
          value="external"
          checked={storage === 'external'}
          onChange={() => setStorage('external')}
          data-test-subj="streamsDestinationsAddModalTypeExternal"
        >
          {storage === 'external' ? externalFields : undefined}
        </EuiCheckableCard>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="m" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} data-test-subj="streamsDestinationsAddModalCancel">
              {CANCEL_BUTTON_LABEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              disabled={trimmedName.length === 0}
              onClick={handleSubmit}
              data-test-subj="streamsDestinationsAddModalSubmit"
            >
              {ADD_DESTINATION_MODAL_SUBMIT}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
}
