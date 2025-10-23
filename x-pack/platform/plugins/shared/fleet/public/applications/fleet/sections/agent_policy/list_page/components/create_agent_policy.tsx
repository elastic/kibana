/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EuiFlyoutProps } from '@elastic/eui';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';

import { useSpaceSettingsContext } from '../../../../../../hooks/use_space_settings_context';
import type { NewAgentPolicy, AgentPolicy } from '../../../../types';
import { MAX_FLYOUT_WIDTH } from '../../../../constants';
import { useAuthz, useStartServices, sendCreateAgentPolicy } from '../../../../hooks';
import { AgentPolicyForm, agentPolicyFormValidation } from '../../components';
import { DevtoolsRequestFlyoutButton } from '../../../../components';
import { generateCreateAgentPolicyDevToolsRequest } from '../../services';
import { generateNewAgentPolicyWithDefaults } from '../../../../../../../common/services/generate_new_agent_policy';

const FlyoutWithHigherZIndex = styled(EuiFlyout)`
  z-index: ${(props) => props.theme.eui.euiZLevel5};
`;

interface Props extends Omit<EuiFlyoutProps, 'onClose'> {
  onClose: (createdAgentPolicy?: AgentPolicy) => void;
}

export const CreateAgentPolicyFlyout: React.FunctionComponent<Props> = ({
  onClose,
  as,
  ...restOfProps
}) => {
  const { notifications } = useStartServices();
  const hasFleetAllAgentPoliciesPrivileges = useAuthz().fleet.allAgentPolicies;
  const spaceSettings = useSpaceSettingsContext();
  const [agentPolicy, setAgentPolicy] = useState<NewAgentPolicy>(
    generateNewAgentPolicyWithDefaults({
      namespace: spaceSettings.defaultNamespace,
    })
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [withSysMonitoring, setWithSysMonitoring] = useState<boolean>(true);
  const validation = agentPolicyFormValidation(agentPolicy, {
    allowedNamespacePrefixes: spaceSettings?.allowedNamespacePrefixes,
  });
  const [hasAdvancedSettingsErrors, setHasAdvancedSettingsErrors] = useState<boolean>(false);
  const [hasInvalidSpaceError, setInvalidSpaceError] = useState<boolean>(false);

  const updateAgentPolicy = (updatedFields: Partial<NewAgentPolicy>) => {
    setAgentPolicy({
      ...agentPolicy,
      ...updatedFields,
    });
  };

  const createAgentPolicy = async () => {
    return await sendCreateAgentPolicy(agentPolicy, { withSysMonitoring });
  };

  const header = (
    <EuiFlyoutHeader hasBorder aria-labelledby="CreateAgentPolicyFlyoutTitle">
      <EuiTitle size="m">
        <h2 id="CreateAgentPolicyFlyoutTitle" data-test-subj="createAgentPolicyFlyoutTitle">
          <FormattedMessage
            id="xpack.fleet.createAgentPolicy.flyoutTitle"
            defaultMessage="Create agent policy"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiText size="s">
        <p>
          <FormattedMessage
            id="xpack.fleet.createAgentPolicy.flyoutTitleDescription"
            defaultMessage="Agent policies are used to manage settings across a group of agents. You can add integrations to your agent policy to specify what data your agents collect. When you edit an agent policy, you can use Fleet to deploy updates to a specified group of agents."
          />
        </p>
      </EuiText>
    </EuiFlyoutHeader>
  );

  const body = (
    <EuiFlyoutBody>
      <AgentPolicyForm
        agentPolicy={agentPolicy}
        updateAgentPolicy={updateAgentPolicy}
        withSysMonitoring={withSysMonitoring}
        updateSysMonitoring={(newValue) => setWithSysMonitoring(newValue)}
        validation={validation}
        updateAdvancedSettingsHasErrors={setHasAdvancedSettingsErrors}
        setInvalidSpaceError={setInvalidSpaceError}
      />
    </EuiFlyoutBody>
  );
  const agentPolicyContent = useMemo(
    () => generateCreateAgentPolicyDevToolsRequest(agentPolicy, withSysMonitoring),
    [agentPolicy, withSysMonitoring]
  );

  const footer = (
    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={() => onClose()} flush="left">
            <FormattedMessage
              id="xpack.fleet.createAgentPolicy.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="none">
            <EuiFlexItem grow={false}>
              <DevtoolsRequestFlyoutButton
                isDisabled={
                  isLoading ||
                  Object.keys(validation).length > 0 ||
                  hasAdvancedSettingsErrors ||
                  hasInvalidSpaceError
                }
                description={i18n.translate(
                  'xpack.fleet.createAgentPolicy.devtoolsRequestDescription',
                  {
                    defaultMessage: 'This Kibana request creates a new agent policy.',
                  }
                )}
                request={agentPolicyContent}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                isLoading={isLoading}
                isDisabled={
                  !hasFleetAllAgentPoliciesPrivileges ||
                  isLoading ||
                  Object.keys(validation).length > 0 ||
                  hasAdvancedSettingsErrors ||
                  hasInvalidSpaceError
                }
                onClick={async () => {
                  setIsLoading(true);
                  try {
                    const { data, error } = await createAgentPolicy();
                    setIsLoading(false);
                    if (data) {
                      notifications.toasts.addSuccess(
                        i18n.translate('xpack.fleet.createAgentPolicy.successNotificationTitle', {
                          defaultMessage: "Agent policy ''{name}'' created",
                          values: { name: agentPolicy.name },
                        })
                      );
                      onClose(data.item);
                    } else {
                      notifications.toasts.addDanger(
                        error
                          ? error.message
                          : i18n.translate('xpack.fleet.createAgentPolicy.errorNotificationTitle', {
                              defaultMessage: 'Unable to create agent policy',
                            })
                      );
                    }
                  } catch (e) {
                    setIsLoading(false);
                    notifications.toasts.addDanger(
                      i18n.translate('xpack.fleet.createAgentPolicy.errorNotificationTitle', {
                        defaultMessage: 'Unable to create agent policy',
                      })
                    );
                  }
                }}
                data-test-subj="createAgentPolicyFlyoutBtn"
              >
                <FormattedMessage
                  id="xpack.fleet.createAgentPolicy.submitButtonLabel"
                  defaultMessage="Create agent policy"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );

  return (
    <FlyoutWithHigherZIndex
      onClose={() => onClose()}
      {...restOfProps}
      maxWidth={MAX_FLYOUT_WIDTH}
      // FIXME: this bypasses an error with styled-components wrapping a component with forwardRef (EuiFlyout)
      // The proper fix is to convert this module to Emotion for styling
      ref={null}
    >
      {header}
      {body}
      {footer}
    </FlyoutWithHigherZIndex>
  );
};
