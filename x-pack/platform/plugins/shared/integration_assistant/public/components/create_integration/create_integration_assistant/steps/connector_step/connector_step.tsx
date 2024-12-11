/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useLoadConnectors } from '@kbn/elastic-assistant';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPopover,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiIcon,
  useEuiTheme,
} from '@elastic/eui';
import {
  AuthorizationWrapper,
  MissingPrivilegesTooltip,
} from '../../../../../common/components/authorization';
import { useAuthorization } from '../../../../../common/hooks/use_authorization';
import { useKibana } from '../../../../../common/hooks/use_kibana';
import { StepContentWrapper } from '../step_content_wrapper';
import { ConnectorSelector } from './connector_selector';
import { ConnectorSetup } from './connector_setup';
import type { AIConnector } from '../../types';
import { useActions } from '../../state';
import * as i18n from './translations';

/**
 * List of allowed action type IDs for the integrations assistant.
 */
const AllowedActionTypeIds = ['.bedrock', '.gen-ai', '.gemini'];

interface ConnectorStepProps {
  connector: AIConnector | undefined;
}
export const ConnectorStep = React.memo<ConnectorStepProps>(({ connector }) => {
  const { euiTheme } = useEuiTheme();
  const { http, notifications } = useKibana().services;
  const { setConnector } = useActions();
  const [connectors, setConnectors] = useState<AIConnector[]>();
  const {
    isLoading,
    data: aiConnectors,
    refetch: refetchConnectors,
  } = useLoadConnectors({ http, toasts: notifications.toasts });

  useEffect(() => {
    if (aiConnectors != null) {
      // filter out connectors, this is temporary until we add support for more models
      const filteredAiConnectors = aiConnectors.filter(({ actionTypeId }) =>
        AllowedActionTypeIds.includes(actionTypeId)
      );
      setConnectors(filteredAiConnectors);
      if (filteredAiConnectors && filteredAiConnectors.length === 1) {
        // pre-select the connector if there is only one
        setConnector(filteredAiConnectors[0]);
      }
    }
  }, [aiConnectors, setConnector]);

  const onConnectorSaved = useCallback(() => refetchConnectors(), [refetchConnectors]);

  const hasConnectors = !isLoading && connectors?.length;

  return (
    <StepContentWrapper
      title={i18n.TITLE}
      subtitle={i18n.DESCRIPTION}
      right={hasConnectors ? <CreateConnectorPopover onConnectorSaved={onConnectorSaved} /> : null}
    >
      <EuiFlexGroup direction="column" alignItems="stretch">
        <EuiFlexItem>
          {isLoading ? (
            <EuiLoadingSpinner />
          ) : (
            <>
              {hasConnectors ? (
                <ConnectorSelector connectors={connectors} selectedConnectorId={connector?.id} />
              ) : (
                <AuthorizationWrapper canCreateConnectors>
                  <ConnectorSetup
                    actionTypeIds={AllowedActionTypeIds}
                    onConnectorSaved={onConnectorSaved}
                  />
                </AuthorizationWrapper>
              )}
            </>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiText size="s" color="subdued">
        <EuiFlexGroup direction="row" gutterSize="xs" alignItems="flexStart">
          <EuiFlexItem grow={false} css={{ margin: euiTheme.size.xxs }}>
            <EuiIcon type="iInCircle" />
          </EuiFlexItem>
          <EuiFlexItem>{i18n.SUPPORTED_MODELS_INFO}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiText>
    </StepContentWrapper>
  );
});
ConnectorStep.displayName = 'ConnectorStep';

interface CreateConnectorPopoverProps {
  onConnectorSaved: () => void;
}
const CreateConnectorPopover = React.memo<CreateConnectorPopoverProps>(({ onConnectorSaved }) => {
  const { canCreateConnectors } = useAuthorization();
  const [isOpen, setIsPopoverOpen] = useState(false);
  const openPopover = useCallback(() => setIsPopoverOpen(true), []);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const onConnectorSavedAndClose = useCallback(() => {
    onConnectorSaved();
    closePopover();
  }, [onConnectorSaved, closePopover]);

  if (!canCreateConnectors) {
    return (
      <MissingPrivilegesTooltip canCreateConnectors>
        <EuiLink data-test-subj="createConnectorPopoverButtonDisabled" disabled>
          {i18n.CREATE_CONNECTOR}
        </EuiLink>
      </MissingPrivilegesTooltip>
    );
  }
  return (
    <EuiPopover
      button={
        <EuiText size="s">
          <EuiLink data-test-subj="createConnectorPopoverButton" onClick={openPopover}>
            {i18n.CREATE_CONNECTOR}
          </EuiLink>
        </EuiText>
      }
      isOpen={isOpen}
      closePopover={closePopover}
      data-test-subj="createConnectorPopover"
    >
      <ConnectorSetup
        actionTypeIds={AllowedActionTypeIds}
        onConnectorSaved={onConnectorSavedAndClose}
        onClose={closePopover}
        compressed
      />
    </EuiPopover>
  );
});
CreateConnectorPopover.displayName = 'CreateConnectorPopover';
