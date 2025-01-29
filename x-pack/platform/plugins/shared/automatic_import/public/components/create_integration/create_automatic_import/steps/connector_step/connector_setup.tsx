/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  useEuiTheme,
  EuiFlexGroup,
  EuiFlexItem,
  EuiListGroup,
  EuiIcon,
  EuiPanel,
  EuiLoadingSpinner,
  EuiText,
  EuiLink,
} from '@elastic/eui';
import { css } from '@emotion/react';
import {
  ConnectorAddModal,
  type ActionConnector,
} from '@kbn/triggers-actions-ui-plugin/public/common/constants';
import { useLoadActionTypes } from '@kbn/elastic-assistant/impl/connectorland/use_load_action_types';
import type { ActionType } from '@kbn/actions-plugin/common';
import { useKibana } from '../../../../../common/hooks/use_kibana';

const usePanelCss = () => {
  const { euiTheme } = useEuiTheme();
  return css`
    &.euiPanel:hover {
      background-color: ${euiTheme.colors.lightestShade};
    }
  `;
};

interface ConnectorSetupProps {
  onConnectorSaved?: (savedAction: ActionConnector) => void;
  onClose?: () => void;
  actionTypeIds?: string[];
  compressed?: boolean;
}
export const ConnectorSetup = React.memo<ConnectorSetupProps>(
  ({ onConnectorSaved, onClose, actionTypeIds, compressed = false }) => {
    const panelCss = usePanelCss();
    const {
      http,
      triggersActionsUi: { actionTypeRegistry },
      notifications: { toasts },
    } = useKibana().services;
    const [selectedActionType, setSelectedActionType] = useState<ActionType | null>(null);
    const onModalClose = useCallback(() => {
      setSelectedActionType(null);
      onClose?.();
    }, [onClose]);

    const { data } = useLoadActionTypes({ http, toasts });

    const actionTypes = useMemo(() => {
      if (actionTypeIds && data) {
        return data.filter((actionType) => actionTypeIds.includes(actionType.id));
      }
      return data;
    }, [data, actionTypeIds]);

    if (!actionTypes) {
      return <EuiLoadingSpinner />;
    }

    return (
      <>
        {compressed ? (
          <EuiListGroup
            flush
            data-test-subj="connectorSetupCompressed"
            listItems={actionTypes.map((actionType) => ({
              id: actionType.id,
              label: actionType.name,
              size: 's',
              icon: (
                <EuiIcon
                  size="l"
                  color="text"
                  type={actionTypeRegistry.get(actionType.id).iconClass}
                />
              ),
              isDisabled: !actionType.enabled,
              onClick: () => setSelectedActionType(actionType),
            }))}
          />
        ) : (
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
                        <EuiIcon
                          size="xl"
                          color="text"
                          type={actionTypeRegistry.get(actionType.id).iconClass}
                          data-test-subj="connectorActionId"
                        />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiText size="s" data-test-subj="connectorActionName">
                          {actionType.name}
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiPanel>
                </EuiLink>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        )}

        {selectedActionType && (
          <ConnectorAddModal
            actionTypeRegistry={actionTypeRegistry}
            actionType={selectedActionType}
            onClose={onModalClose}
            postSaveEventHandler={onConnectorSaved}
          />
        )}
      </>
    );
  }
);
ConnectorSetup.displayName = 'ConnectorSetup';
