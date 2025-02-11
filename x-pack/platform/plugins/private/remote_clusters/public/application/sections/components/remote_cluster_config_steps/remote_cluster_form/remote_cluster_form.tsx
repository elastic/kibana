/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useContext, useCallback, useEffect } from 'react';
import { merge } from 'lodash';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import {
  EuiCallOut,
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiLink,
  EuiSpacer,
  EuiSwitch,
  EuiTitle,
  EuiDelayRender,
  EuiScreenReaderOnly,
  htmlIdGenerator,
  EuiSwitchEvent,
  useEuiTheme,
  EuiText,
} from '@elastic/eui';
import { ReactNode } from 'react-markdown';
import { Cluster, ClusterPayload } from '../../../../../../common/lib';
import { SNIFF_MODE, PROXY_MODE } from '../../../../../../common/constants';
import { AppContext } from '../../../../app_context';
import { skippingDisconnectedClustersUrl } from '../../../../services/documentation';
import { ConnectionMode } from './components';
import {
  ClusterErrors,
  convertCloudRemoteAddressToProxyConnection,
  validateCluster,
  isCloudAdvancedOptionsEnabled,
} from './validators';
import { ActionButtons, SaveError } from '../components';
const defaultClusterValues: ClusterPayload = {
  name: '',
  seeds: [],
  skipUnavailable: true,
  nodeConnections: 3,
  proxyAddress: '',
  proxySocketConnections: 18,
  serverName: '',
};
const ERROR_TITLE_ID = 'removeClustersErrorTitle';
const ERROR_LIST_ID = 'removeClustersErrorList';
interface Props {
  confirmFormAction: (cluster: ClusterPayload) => void;
  onBack?: () => void;
  isSaving?: boolean;
  saveError?: any;
  cluster?: Cluster;
  onConfigChange?: (cluster: ClusterPayload, hasErrors: boolean) => void;
  confirmFormText: ReactNode;
  backFormText: ReactNode;
}
export type FormFields = ClusterPayload & {
  cloudRemoteAddress?: string;
  cloudAdvancedOptionsEnabled: boolean;
};
export const RemoteClusterForm: React.FC<Props> = ({
  confirmFormAction,
  onBack,
  isSaving,
  saveError,
  cluster,
  onConfigChange,
  confirmFormText,
  backFormText,
}) => {
  const context = useContext(AppContext);
  const { euiTheme } = useEuiTheme();
  const { isCloudEnabled } = context;
  const defaultMode = isCloudEnabled ? PROXY_MODE : SNIFF_MODE;
  const initialFieldsState: FormFields = merge(
    {},
    {
      ...defaultClusterValues,
      mode: defaultMode,
      cloudRemoteAddress: cluster?.proxyAddress || '',
      cloudAdvancedOptionsEnabled: isCloudAdvancedOptionsEnabled(cluster),
    },
    cluster
  );
  const [fields, setFields] = useState<FormFields>(initialFieldsState);
  const [fieldsErrors, setFieldsErrors] = useState<ClusterErrors>(
    validateCluster(initialFieldsState, isCloudEnabled)
  );
  const [areErrorsVisible, setAreErrorsVisible] = useState(false);
  const [formHasBeenSubmited, setFormHasBeenSubmited] = useState(false);
  const generateId = htmlIdGenerator();
  const getCluster = useCallback((): ClusterPayload => {
    const {
      name,
      mode,
      seeds,
      nodeConnections,
      proxyAddress,
      proxySocketConnections,
      serverName,
      skipUnavailable,
    } = fields;

    const modeSettings =
      mode === PROXY_MODE
        ? {
            proxyAddress,
            proxySocketConnections,
            serverName,
          }
        : {
            seeds,
            nodeConnections,
          };

    return {
      name,
      skipUnavailable,
      mode,
      hasDeprecatedProxySetting: cluster?.hasDeprecatedProxySetting,
      ...modeSettings,
    };
  }, [fields, cluster]);

  const handleNext = () => {
    if (hasErrors()) {
      setAreErrorsVisible(true);
      return;
    }
    setFormHasBeenSubmited(true);
    confirmFormAction(getCluster());
  };

  const onFieldsChange = useCallback(
    (changedFields: Partial<FormFields>) => {
      // when cloud remote address changes, fill proxy address and server name
      const { cloudRemoteAddress, cloudAdvancedOptionsEnabled } = changedFields;
      if (cloudRemoteAddress) {
        const { proxyAddress, serverName } =
          convertCloudRemoteAddressToProxyConnection(cloudRemoteAddress);
        // Only change the server name if the advanced options are not currently open
        if (fields.cloudAdvancedOptionsEnabled) {
          changedFields = {
            ...changedFields,
            proxyAddress,
          };
        } else {
          changedFields = {
            ...changedFields,
            proxyAddress,
            serverName,
          };
        }
      }
      // If we switch off the advanced options, revert the server name to
      // the host name from the proxy address
      if (cloudAdvancedOptionsEnabled === false) {
        changedFields = {
          ...changedFields,
          serverName: fields.proxyAddress?.split(':')[0],
          proxySocketConnections: defaultClusterValues.proxySocketConnections,
        };
      }
      const newFields = {
        ...fields,
        ...changedFields,
      };
      setFields(newFields);
      setFieldsErrors(validateCluster(newFields, isCloudEnabled));
    },
    [fields, isCloudEnabled]
  );

  const hasErrors = useCallback(() => {
    const errorValues = Object.values(fieldsErrors);
    return errorValues.some((error) => error != null);
  }, [fieldsErrors]);

  useEffect(() => {
    if (onConfigChange && formHasBeenSubmited) {
      const errors = hasErrors();
      setAreErrorsVisible(errors);
      onConfigChange(getCluster(), errors);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields]);

  const onSkipUnavailableChange = useCallback(
    (e: EuiSwitchEvent) => {
      const skipUnavailable = e.target.checked;
      onFieldsChange({ skipUnavailable });
    },
    [onFieldsChange]
  );
  const resetToDefault = useCallback(
    (fieldName: keyof ClusterPayload) => {
      onFieldsChange({
        [fieldName]: defaultClusterValues[fieldName],
      });
    },
    [onFieldsChange]
  );

  const renderSkipUnavailable = () => {
    return (
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h2>
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterForm.sectionSkipUnavailableTitle"
                defaultMessage="Make remote cluster optional"
              />
            </h2>
          </EuiTitle>
        }
        description={
          <EuiText size="s">
            <FormattedMessage
              id="xpack.remoteClusters.remoteClusterForm.sectionSkipUnavailableDescription"
              defaultMessage="If any of the remote clusters are unavailable, the query request fails. To avoid this and continue to send requests to other clusters, enable Skip if unavailable. {learnMoreLink}"
              values={{
                learnMoreLink: (
                  <EuiLink href={skippingDisconnectedClustersUrl} target="_blank">
                    <FormattedMessage
                      id="xpack.remoteClusters.remoteClusterForm.sectionSkipUnavailableDescription.learnMoreLinkLabel"
                      defaultMessage="Learn more."
                    />
                  </EuiLink>
                ),
              }}
            />
          </EuiText>
        }
        fullWidth
      >
        <EuiFormRow
          data-test-subj="remoteClusterFormSkipUnavailableFormRow"
          css={css`
            padding-top: ${euiTheme.size.s};
          `}
          fullWidth
          helpText={
            fields.skipUnavailable !== defaultClusterValues.skipUnavailable ? (
              <EuiLink
                onClick={() => {
                  resetToDefault('skipUnavailable');
                }}
              >
                <FormattedMessage
                  id="xpack.remoteClusters.remoteClusterForm.sectionSkipUnavailableResetLabel"
                  defaultMessage="Reset to default"
                />
              </EuiLink>
            ) : null
          }
        >
          <EuiSwitch
            label={i18n.translate(
              'xpack.remoteClusters.remoteClusterForm.sectionSkipUnavailableLabel',
              {
                defaultMessage: 'Skip if unavailable',
              }
            )}
            checked={!!fields.skipUnavailable}
            onChange={onSkipUnavailableChange}
            data-test-subj="remoteClusterFormSkipUnavailableFormToggle"
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
    );
  };

  const renderErrors = () => {
    const {
      name: errorClusterName,
      seeds: errorsSeeds,
      proxyAddress: errorProxyAddress,
    } = fieldsErrors;
    if (!areErrorsVisible || !hasErrors()) {
      return null;
    }
    const errorExplanations = [];
    if (errorClusterName) {
      errorExplanations.push({
        key: 'nameExplanation',
        field: i18n.translate('xpack.remoteClusters.remoteClusterForm.inputNameErrorMessage', {
          defaultMessage: 'The "Name" field is invalid.',
        }),
        error: errorClusterName,
      });
    }
    if (errorsSeeds) {
      errorExplanations.push({
        key: 'seedsExplanation',
        field: i18n.translate('xpack.remoteClusters.remoteClusterForm.inputSeedsErrorMessage', {
          defaultMessage: 'The "Seed nodes" field is invalid.',
        }),
        error: errorsSeeds,
      });
    }
    if (errorProxyAddress) {
      errorExplanations.push({
        key: 'proxyAddressExplanation',
        field: i18n.translate('xpack.remoteClusters.remoteClusterForm.inputProxyErrorMessage', {
          defaultMessage: 'The "Proxy address" field is invalid.',
        }),
        error: errorProxyAddress,
      });
    }
    const messagesToBeRendered = errorExplanations.length && (
      <EuiScreenReaderOnly>
        <dl id={generateId(ERROR_LIST_ID)} aria-labelledby={generateId(ERROR_TITLE_ID)}>
          {errorExplanations.map(({ key, field, error }) => (
            <div key={key}>
              <dt>{field}</dt>
              <dd>{error}</dd>
            </div>
          ))}
        </dl>
      </EuiScreenReaderOnly>
    );
    return (
      <>
        <EuiCallOut
          title={
            <span id={generateId(ERROR_TITLE_ID)}>
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterForm.errorTitle"
                defaultMessage="Some fields require your attention."
              />
            </span>
          }
          color="danger"
          iconType="error"
        />
        <EuiDelayRender>{messagesToBeRendered}</EuiDelayRender>
        <EuiSpacer size="m" data-test-subj="remoteClusterFormGlobalError" />
      </>
    );
  };
  const isNew = !cluster;
  return (
    <>
      {saveError && <SaveError saveError={saveError} />}
      {renderErrors()}
      <EuiForm data-test-subj="remoteClusterForm">
        <EuiDescribedFormGroup
          title={
            <EuiTitle size="s">
              <h2>
                <FormattedMessage
                  id="xpack.remoteClusters.remoteClusterForm.sectionNameTitle"
                  defaultMessage="Remote cluster name"
                />
              </h2>
            </EuiTitle>
          }
          description={
            isCloudEnabled ? (
              <EuiText size="s">
                <FormattedMessage
                  id="xpack.remoteClusters.remoteClusterForm.cloud.sectionNameDescription"
                  defaultMessage="A unique identifier for the remote cluster. Must match the {remoteClusterName} in this deployment’s Cloud -> Security settings."
                  values={{
                    remoteClusterName: (
                      <strong>
                        <FormattedMessage
                          id="xpack.remoteClusters.remoteClusterForm.cloud.sectionNameDescription.remoteClusterName"
                          defaultMessage="remote cluster name"
                        />
                      </strong>
                    ),
                  }}
                />
              </EuiText>
            ) : (
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterForm.stateful.sectionNameDescription"
                defaultMessage="A unique identifier for the remote cluster."
              />
            )
          }
          fullWidth
        >
          <EuiFormRow
            data-test-subj="remoteClusterFormNameFormRow"
            label={
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterForm.fieldNameLabel"
                defaultMessage="Remote cluster name"
              />
            }
            helpText={
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterForm.fieldNameLabelHelpText"
                defaultMessage="Must contain only letters, numbers, underscores, and dashes."
              />
            }
            error={fieldsErrors.name}
            isInvalid={Boolean(areErrorsVisible && fieldsErrors.name)}
            fullWidth
          >
            <EuiFieldText
              isInvalid={Boolean(areErrorsVisible && fieldsErrors.name)}
              value={fields.name}
              onChange={(e) => onFieldsChange({ name: e.target.value })}
              fullWidth
              disabled={!isNew}
              data-test-subj="remoteClusterFormNameInput"
            />
          </EuiFormRow>
        </EuiDescribedFormGroup>
        <ConnectionMode
          fields={fields}
          fieldsErrors={fieldsErrors}
          onFieldsChange={onFieldsChange}
          areErrorsVisible={areErrorsVisible}
        />
        {renderSkipUnavailable()}
      </EuiForm>
      <EuiSpacer size="xl" />
      <ActionButtons
        showRequest={true}
        disabled={areErrorsVisible && hasErrors()}
        isSaving={isSaving}
        handleNext={handleNext}
        onBack={onBack}
        confirmFormText={confirmFormText}
        backFormText={backFormText}
        cluster={getCluster()}
        nextButtonTestSubj={'remoteClusterFormNextButton'}
        backButtonTestSubj={'remoteClusterFormBackButton'}
        previousClusterMode={cluster?.mode}
      />
    </>
  );
};
