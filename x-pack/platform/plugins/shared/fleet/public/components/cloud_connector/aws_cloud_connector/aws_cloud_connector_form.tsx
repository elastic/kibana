/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiAccordion,
  EuiSpacer,
  EuiButton,
  EuiLink,
  EuiFieldText,
  EuiFormRow,
} from '@elastic/eui';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';

import {
  CLOUD_CONNECTOR_NAME_INPUT_TEST_SUBJ,
  CLOUD_CONNECTOR_TEMPLATE_GENERATION_ERROR_CALLOUT_TEST_SUBJ,
  CLOUD_CONNECTOR_STACK_ARN_INPUT_TEST_SUBJ,
  CLOUD_CONNECTOR_STALE_TEMPLATE_CALLOUT_TEST_SUBJ,
} from '../../../../common/services/cloud_connectors/test_subjects';
import {
  extractRawCredentialVars,
  getCredentialKeyFromVarName,
  parseAwsRegionFromArn,
} from '../../../../common/services/cloud_connectors';
import { getEnabledInputsByPolicyTemplate } from '../../../../common/services/policy_template';
import type { RenderIacTemplateIntegration } from '../../../../common/types/rest_spec/iac_provisioner';
import { type CloudConnectorFormProps } from '../types';

import {
  updateInputVarsWithCredentials,
  isAwsCredentials,
  isSameTemplateSet,
  INVALID_STACK_ARN_MESSAGE,
} from '../utils';
import { AWS_PROVIDER, ORGANIZATION_ACCOUNT } from '../constants';

import { CloudConnectorInputFields } from '../form/cloud_connector_input_fields';
import { CloudConnectorNameField } from '../form/cloud_connector_name_field';
import { useCloudConnectorTemplate } from '../hooks/use_cloud_connector_template';

import { getAwsCloudConnectorsCredentialsFormOptions } from './aws_cloud_connector_options';
import { CloudFormationCloudCredentialsGuide } from './aws_cloud_formation_guide';

interface AWSCloudConnectorFormProps extends CloudConnectorFormProps {
  /** Reports whether this form allows submission; false while the rendered template is out of date. */
  onValidityChange?: (isValid: boolean) => void;
}

export const AWSCloudConnectorForm: React.FC<AWSCloudConnectorFormProps> = ({
  newPolicy,
  packageInfo,
  cloud,
  hasInvalidRequiredVars = false,
  credentials,
  setCredentials,
  accountType = ORGANIZATION_ACCOUNT,
  iacTemplateUrl,
  onValidityChange,
}) => {
  // The rendered template must cover every input the user enabled — no more.
  const inputs = newPolicy?.inputs;
  const enabledPolicyTemplates = useMemo(
    () => getEnabledInputsByPolicyTemplate({ inputs }),
    [inputs]
  );

  // Always keep a ref to the latest credentials, setCredentials and package name so that
  // onTemplateRendered (called after an async render) never closes over a
  // stale snapshot. Without this, a name edit made while the render is in
  // flight would be silently reverted when the callback fires.
  const packageName = packageInfo?.name;
  const latestRef = useRef({ credentials, setCredentials, packageName });
  latestRef.current = { credentials, setCredentials, packageName };

  const onTemplateRendered = useCallback(
    ({ key, integrations }: { key?: string; integrations: RenderIacTemplateIntegration[] }) => {
      const {
        credentials: current,
        setCredentials: set,
        packageName: currentPackageName,
      } = latestRef.current;
      if (key && current && isAwsCredentials(current) && set) {
        set({
          ...current,
          iacKey: key,
          // The wizard renders a single package — the one being configured. Left undefined when
          // it cannot be found so the stale check stays off rather than blocking Save for good.
          iacRenderedPolicyTemplates: integrations.find(
            (integration) => integration.name === currentPackageName
          )?.policyTemplates,
        });
      }
    },
    []
  );

  const {
    launchButtonProps,
    isDisabled,
    isGeneratingTemplate,
    templateGenerationError,
    isIacProvisionerEnabled,
  } = useCloudConnectorTemplate({
    provider: AWS_PROVIDER,
    cloud,
    accountType,
    iacTemplateUrl,
    packageName,
    policyTemplates: enabledPolicyTemplates,
    onTemplateRendered,
  });

  const awsCredentials = credentials && isAwsCredentials(credentials) ? credentials : undefined;
  const renderedPolicyTemplates = awsCredentials?.iacRenderedPolicyTemplates;
  // The Launch button renders the template from the inputs enabled at click time, but the input
  // selection sits below it, so the user can widen or narrow the selection afterwards. Saving then
  // stores a key describing a stack that no longer matches the integration.
  const renderedSetIsStale = Boolean(
    awsCredentials?.iacKey &&
      renderedPolicyTemplates &&
      !isSameTemplateSet(renderedPolicyTemplates, enabledPolicyTemplates)
  );

  // Report validity only when it changes. The wizard's updatePolicy is re-created on every policy
  // update, so depending on the callback identity here would re-fire this effect after each update
  // it causes — an infinite render loop.
  const onValidityChangeRef = useRef(onValidityChange);
  onValidityChangeRef.current = onValidityChange;
  const lastReportedValidityRef = useRef<boolean | undefined>(undefined);
  useEffect(() => {
    const isValid = !renderedSetIsStale;
    if (lastReportedValidityRef.current === isValid) {
      return;
    }
    lastReportedValidityRef.current = isValid;
    onValidityChangeRef.current?.(isValid);
  }, [renderedSetIsStale]);

  // Use accessor to get vars from the correct location (package-level or input-level)
  const inputVars = extractRawCredentialVars(newPolicy, packageInfo);

  // Update inputVars with current credentials using utility function or inputVars if no credentials are provided
  const updatedInputVars = credentials
    ? updateInputVarsWithCredentials(inputVars, credentials)
    : inputVars;

  const fields = getAwsCloudConnectorsCredentialsFormOptions(updatedInputVars);

  // Derive the stack ARN field state from the credentials object.
  const stackArn = awsCredentials?.iacDeploymentId ?? '';
  const stackArnInvalid = stackArn !== '' && parseAwsRegionFromArn(stackArn) === undefined;

  return (
    <>
      <CloudConnectorNameField
        value={credentials?.name || ''}
        onChange={(name, isValid, error) => {
          if (credentials && setCredentials) {
            setCredentials({
              ...credentials,
              name,
            });
          }
        }}
        data-test-subj={CLOUD_CONNECTOR_NAME_INPUT_TEST_SUBJ}
      />
      <EuiSpacer size="m" />
      <EuiAccordion
        id="cloudFormationAccordianInstructions"
        data-test-subj={''}
        buttonContent={<EuiLink>{'Steps to assume role'}</EuiLink>}
        paddingSize="l"
      >
        <CloudFormationCloudCredentialsGuide accountType={accountType} />
      </EuiAccordion>
      <EuiSpacer size="l" />
      <EuiButton
        data-test-subj="launchCloudFormationAgentlessButton"
        iconSide="left"
        iconType="rocket"
        isLoading={isGeneratingTemplate}
        isDisabled={isDisabled}
        {...launchButtonProps}
      >
        <FormattedMessage
          id="xpack.fleet.cloudConnector.aws.launchCloudFormationButton"
          defaultMessage="Launch CloudFormation"
        />
      </EuiButton>
      {templateGenerationError && (
        <>
          <EuiSpacer size="m" />
          <KbnDangerCallout
            announceOnMount
            data-test-subj={CLOUD_CONNECTOR_TEMPLATE_GENERATION_ERROR_CALLOUT_TEST_SUBJ}
            title={templateGenerationError}
            size="s"
          />
        </>
      )}
      {renderedSetIsStale && (
        <>
          <EuiSpacer size="m" />
          <KbnWarningCallout
            announceOnMount
            data-test-subj={CLOUD_CONNECTOR_STALE_TEMPLATE_CALLOUT_TEST_SUBJ}
            title={i18n.translate('xpack.fleet.cloudConnector.aws.staleTemplateTitle', {
              defaultMessage: 'Selected services changed after the template was generated',
            })}
            // Medium, not small: EUI renders a small callout's `text` inline (title · text).
            size="m"
            text={i18n.translate('xpack.fleet.cloudConnector.aws.staleTemplateBody', {
              defaultMessage:
                'The CloudFormation template you launched was generated for a different set of services. Launch CloudFormation again so the stack grants exactly what this integration needs, then save.',
            })}
          />
        </>
      )}
      {isIacProvisionerEnabled && (
        <>
          <EuiSpacer size="m" />
          <EuiFormRow
            fullWidth
            label={i18n.translate('xpack.fleet.cloudConnector.aws.stackArnLabel', {
              defaultMessage: 'CloudFormation stack ARN',
            })}
            helpText={i18n.translate('xpack.fleet.cloudConnector.aws.stackArnHelp', {
              defaultMessage:
                'Copy the StackId output of the stack you just created so Kibana can link straight to it when its template needs an update.',
            })}
            isInvalid={stackArnInvalid}
            error={stackArnInvalid ? INVALID_STACK_ARN_MESSAGE : undefined}
          >
            <EuiFieldText
              fullWidth
              value={stackArn}
              isInvalid={stackArnInvalid}
              onChange={(e) => {
                if (!credentials || !isAwsCredentials(credentials) || !setCredentials) return;
                setCredentials({
                  ...credentials,
                  iacDeploymentId: e.target.value.trim() || undefined,
                });
              }}
              data-test-subj={CLOUD_CONNECTOR_STACK_ARN_INPUT_TEST_SUBJ}
            />
          </EuiFormRow>
        </>
      )}
      <EuiSpacer size="m" />

      {fields && (
        <CloudConnectorInputFields
          fields={fields}
          packageInfo={packageInfo}
          onChange={(key, value) => {
            if (!credentials || !isAwsCredentials(credentials) || !setCredentials) return;

            const credentialKey = getCredentialKeyFromVarName('aws', key);
            if (credentialKey) {
              setCredentials({ ...credentials, [credentialKey]: value });
            }
          }}
          hasInvalidRequiredVars={hasInvalidRequiredVars}
        />
      )}
    </>
  );
};
