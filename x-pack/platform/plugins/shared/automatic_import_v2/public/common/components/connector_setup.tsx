/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import {
  useEuiTheme,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiLoadingSpinner,
  EuiText,
  EuiLink,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';
import type { ActionType } from '@kbn/actions-plugin/common';
import { useKibana } from '..';
import * as i18n from './translations';

const ALLOWED_ACTION_TYPE_IDS = ['.bedrock', '.gen-ai', '.gemini', '.inference'];

const usePanelCss = () => {
  const { euiTheme } = useEuiTheme();
  return css`
    &.euiPanel:hover {
      background-color: ${euiTheme.colors.lightestShade};
      cursor: pointer;
    }
  `;
};

interface ConnectorSetupProps {
  onConnectorCreated?: (connector: ActionConnector) => void;
  onClose: () => void;
}

export const ConnectorSetup: React.FC<ConnectorSetupProps> = ({ onConnectorCreated, onClose }) => {
  const panelCss = usePanelCss();
  const {
    http,
    triggersActionsUi,
    notifications: { toasts },
  } = useKibana().services;

  const actionTypeRegistry = triggersActionsUi?.actionTypeRegistry;

  const [actionTypes, setActionTypes] = useState<ActionType[]>();
  const [selectedActionType, setSelectedActionType] = useState<ActionType | null>(null);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);

  useEffect(() => {
    const loadActionTypes = async () => {
      try {
        setIsLoadingTypes(true);
        const types = await http.get<ActionType[]>('/api/actions/connector_types');
        const aiTypes = types.filter((type) => ALLOWED_ACTION_TYPE_IDS.includes(type.id));
        setActionTypes(aiTypes);
      } catch (e) {
        toasts.addDanger({
          title: 'Unable to load connector types',
          text: e instanceof Error ? e.message : 'Unknown error',
        });
      } finally {
        setIsLoadingTypes(false);
      }
    };
    loadActionTypes();
  }, [http, toasts]);

  const handleConnectorCreated = useCallback(
    (connector: ActionConnector) => {
      setSelectedActionType(null);
      onConnectorCreated?.(connector);
    },
    [onConnectorCreated]
  );

  const handleModalClose = useCallback(() => {
    setSelectedActionType(null);
  }, []);

  const getIconForActionType = (actionTypeId: string) => {
    try {
      return actionTypeRegistry?.get(actionTypeId)?.iconClass ?? 'plugs';
    } catch {
      return 'plugs';
    }
  };

  if (isLoadingTypes) {
    return (
      <EuiFlyout
        aria-label={i18n.CREATE_AI_CONNECTOR_TITLE}
        onClose={onClose}
        size="s"
        data-test-subj="connectorSetupFlyout"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>{i18n.CREATE_AI_CONNECTOR_TITLE}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiFlexGroup justifyContent="center" alignItems="center" style={{ height: '200px' }}>
            <EuiLoadingSpinner size="xl" data-test-subj="connectorSetupLoading" />
          </EuiFlexGroup>
        </EuiFlyoutBody>
      </EuiFlyout>
    );
  }

  return (
    <>
      <EuiFlyout
        onClose={onClose}
        size="s"
        aria-label={i18n.CREATE_AI_CONNECTOR_TITLE}
        data-test-subj="connectorSetupFlyout"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>{i18n.CREATE_AI_CONNECTOR_TITLE}</h2>
          </EuiTitle>
          <EuiText size="s" color="subdued">
            {i18n.SELECT_CONNECTOR_TYPE_DESCRIPTION}
          </EuiText>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiFlexGroup direction="column" gutterSize="s" data-test-subj="connectorSetupPage">
            {actionTypes?.map((actionType: ActionType) => (
              <EuiFlexItem key={actionType.id}>
                <EuiLink
                  onClick={() => setSelectedActionType(actionType)}
                  data-test-subj={`actionType-${actionType.id}`}
                >
                  <EuiPanel hasShadow={false} hasBorder paddingSize="l" css={panelCss}>
                    <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
                      <EuiFlexItem grow={false}>
                        <Suspense fallback={<EuiLoadingSpinner size="m" />}>
                          <EuiIcon
                            size="xl"
                            color="text"
                            type={getIconForActionType(actionType.id)}
                          />
                        </Suspense>
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiText size="s">{actionType.name}</EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiPanel>
                </EuiLink>
              </EuiFlexItem>
            ))}
            {(!actionTypes || actionTypes.length === 0) && (
              <EuiText color="subdued" textAlign="center" data-test-subj="noConnectorTypes">
                {i18n.NO_CONNECTOR_TYPES_AVAILABLE}
              </EuiText>
            )}
          </EuiFlexGroup>
        </EuiFlyoutBody>
      </EuiFlyout>

      {selectedActionType &&
        triggersActionsUi?.getAddConnectorFlyout &&
        triggersActionsUi.getAddConnectorFlyout({
          onClose: handleModalClose,
          onConnectorCreated: handleConnectorCreated,
          initialConnector: { actionTypeId: selectedActionType.id },
        })}
    </>
  );
};

ConnectorSetup.displayName = 'ConnectorSetup';
