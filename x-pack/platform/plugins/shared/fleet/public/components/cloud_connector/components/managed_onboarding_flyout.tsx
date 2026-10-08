/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFieldPassword,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { useManagedOnboardingCredentials } from '../hooks/use_managed_onboarding_credentials';
import { sendGetAwsOnboardingBootstrapTemplate } from '../../../hooks/use_request/aws_onboarding';

const getCloudFormationCreateUrl = (region: string) =>
  `https://console.aws.amazon.com/cloudformation/home?region=${encodeURIComponent(
    region.trim() || 'us-east-1'
  )}#/stacks/create`;

/** Fetches the bootstrap YAML from Kibana and saves it as a file the console's "Upload a template file" accepts. */
const downloadBootstrapTemplate = async (): Promise<string | undefined> => {
  const { data, error } = await sendGetAwsOnboardingBootstrapTemplate();
  if (error || !data) {
    const fetchError = error as { body?: { message?: string }; message?: string } | null;
    const detail = fetchError?.body?.message ?? fetchError?.message;
    return detail ? `Could not load the template: ${detail}` : 'Could not load the template';
  }
  const blob = new Blob([data.template], { type: 'text/yaml' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = data.filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  return undefined;
};

interface ManagedOnboardingFlyoutProps {
  onClose: () => void;
  defaultRegion?: string;
}

/**
 * One-time setup for Kibana-managed AWS onboarding. The user launches the bootstrap stack in
 * their account, reads the generated access key from Secrets Manager once, and pastes it here.
 * The secret is sent to the server once and stored encrypted; this component keeps it only in
 * local form state until Save.
 */
export const ManagedOnboardingFlyout: React.FC<ManagedOnboardingFlyoutProps> = ({
  onClose,
  defaultRegion = 'us-east-1',
}) => {
  const titleId = useGeneratedHtmlId();
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [region, setRegion] = useState(defaultRegion);
  const [bootstrapStackArn, setBootstrapStackArn] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | undefined>(undefined);
  const { save } = useManagedOnboardingCredentials();

  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadError(await downloadBootstrapTemplate());
    setIsDownloading(false);
  };

  const canSave =
    accessKeyId.trim().length >= 16 && secretAccessKey.length > 0 && region.trim().length > 0;

  const handleSave = () => {
    save.mutate(
      {
        accessKeyId: accessKeyId.trim(),
        region: region.trim(),
        ...(bootstrapStackArn.trim() ? { bootstrapStackArn: bootstrapStackArn.trim() } : {}),
        secrets: { secretAccessKey },
      },
      {
        onSuccess: () => {
          setSecretAccessKey('');
          onClose();
        },
      }
    );
  };

  return (
    <EuiFlyout
      onClose={onClose}
      size="s"
      aria-labelledby={titleId}
      data-test-subj="managedOnboardingFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>
            <FormattedMessage
              id="xpack.fleet.cloudConnector.managedOnboarding.flyoutTitle"
              defaultMessage="Set up managed onboarding"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText size="s">
          <ol>
            <li>
              <FormattedMessage
                id="xpack.fleet.cloudConnector.managedOnboarding.step1"
                defaultMessage="Download the bootstrap template, then open the CloudFormation console and create a stack from it (Create stack → Upload a template file). It creates a least-privilege identity that can only manage CloudFormation stacks named elastic-onboarding-*."
              />
            </li>
            <li>
              <FormattedMessage
                id="xpack.fleet.cloudConnector.managedOnboarding.step2"
                defaultMessage="When the stack is complete, open the Secrets Manager secret named in its outputs and copy the access key id and secret."
              />
            </li>
            <li>
              <FormattedMessage
                id="xpack.fleet.cloudConnector.managedOnboarding.step3"
                defaultMessage="Paste them below. Kibana stores them encrypted and never displays the secret again."
              />
            </li>
          </ol>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="s" wrap responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButton
              iconType="download"
              isLoading={isDownloading}
              onClick={handleDownload}
              data-test-subj="managedOnboardingFlyout-downloadTemplate"
            >
              <FormattedMessage
                id="xpack.fleet.cloudConnector.managedOnboarding.downloadTemplate"
                defaultMessage="Download bootstrap template"
              />
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              iconType="popout"
              href={getCloudFormationCreateUrl(region)}
              target="_blank"
              data-test-subj="managedOnboardingFlyout-openConsole"
            >
              <FormattedMessage
                id="xpack.fleet.cloudConnector.managedOnboarding.openConsole"
                defaultMessage="Open CloudFormation console"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
        {downloadError && (
          <>
            <EuiSpacer size="s" />
            <EuiCallOut
              announceOnMount
              color="danger"
              size="s"
              title={downloadError}
              data-test-subj="managedOnboardingFlyout-downloadError"
            />
          </>
        )}
        <EuiSpacer size="m" />
        <EuiFormRow
          fullWidth
          label={i18n.translate('xpack.fleet.cloudConnector.managedOnboarding.accessKeyIdLabel', {
            defaultMessage: 'Access key ID',
          })}
        >
          <EuiFieldText
            fullWidth
            value={accessKeyId}
            onChange={(e) => setAccessKeyId(e.target.value)}
            data-test-subj="managedOnboardingFlyout-accessKeyId"
          />
        </EuiFormRow>
        <EuiFormRow
          fullWidth
          label={i18n.translate('xpack.fleet.cloudConnector.managedOnboarding.secretLabel', {
            defaultMessage: 'Secret access key',
          })}
        >
          <EuiFieldPassword
            fullWidth
            type="dual"
            value={secretAccessKey}
            onChange={(e) => setSecretAccessKey(e.target.value)}
            data-test-subj="managedOnboardingFlyout-secretAccessKey"
          />
        </EuiFormRow>
        <EuiFormRow
          fullWidth
          label={i18n.translate('xpack.fleet.cloudConnector.managedOnboarding.regionLabel', {
            defaultMessage: 'AWS region for the stacks',
          })}
        >
          <EuiFieldText
            fullWidth
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            data-test-subj="managedOnboardingFlyout-region"
          />
        </EuiFormRow>
        <EuiFormRow
          fullWidth
          label={i18n.translate(
            'xpack.fleet.cloudConnector.managedOnboarding.bootstrapStackArnLabel',
            { defaultMessage: 'Bootstrap stack ARN (optional)' }
          )}
          helpText={i18n.translate(
            'xpack.fleet.cloudConnector.managedOnboarding.bootstrapStackArnHelp',
            {
              defaultMessage:
                'The BootstrapStackId output (also in the secret). With it, removing the credentials deletes the bootstrap stack, its user and its key.',
            }
          )}
        >
          <EuiFieldText
            fullWidth
            value={bootstrapStackArn}
            onChange={(e) => setBootstrapStackArn(e.target.value)}
            data-test-subj="managedOnboardingFlyout-bootstrapStackArn"
          />
        </EuiFormRow>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} data-test-subj="managedOnboardingFlyout-cancel">
              <FormattedMessage
                id="xpack.fleet.cloudConnector.managedOnboarding.cancel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              isDisabled={!canSave}
              isLoading={save.isLoading}
              onClick={handleSave}
              data-test-subj="managedOnboardingFlyout-save"
            >
              <FormattedMessage
                id="xpack.fleet.cloudConnector.managedOnboarding.save"
                defaultMessage="Save"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
