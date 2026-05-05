/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiAccordion,
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiCallOut,
  EuiText,
  EuiFormRow,
  EuiButtonEmpty,
  EuiIconTip,
  EuiBetaBadge,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { useActionTypeModel } from '@kbn/alerts-ui-shared';
import { TECH_PREVIEW_DESCRIPTION, TECH_PREVIEW_LABEL } from '../translations';
import type { RuleUiAction, ActionTypeIndex, ActionConnector } from '../../../types';
import { hasSaveActionsCapability } from '../../lib/capabilities';
import type { ActionAccordionFormProps } from './action_form';
import { useKibana } from '../../../common/lib/kibana';
import { getValidConnectors } from '../common/connectors';
import { ConnectorsSelection } from './connectors_selection';

export type AddConnectorInFormProps = {
  actionTypesIndex: ActionTypeIndex;
  actionItem: RuleUiAction;
  connectors: ActionConnector[];
  index: number;
  onAddConnector: () => void;
  onDeleteConnector: () => void;
  onSelectConnector: (connectorId: string) => void;
  emptyActionsIds: string[];
} & Pick<ActionAccordionFormProps, 'actionTypeRegistry'>;

export const AddConnectorInline = ({
  actionTypesIndex,
  actionItem,
  index,
  connectors,
  onAddConnector,
  onDeleteConnector,
  onSelectConnector,
  actionTypeRegistry,
  emptyActionsIds,
}: AddConnectorInFormProps) => {
  const {
    http,
    uiSettings,
    application: { capabilities },
  } = useKibana().services;
  const canSave = hasSaveActionsCapability(capabilities);
  const [hasConnectors, setHasConnectors] = useState<boolean>(false);
  const [isEmptyActionId, setIsEmptyActionId] = useState<boolean>(false);

  const actionTypeName = actionTypesIndex
    ? actionTypesIndex[actionItem.actionTypeId].name
    : actionItem.actionTypeId;

  const {
    actionTypeModel: actionTypeRegistered,
    isLoading: isLoadingActionTypeModel,
    error: actionTypeModelError,
  } = useActionTypeModel({
    actionTypeRegistry,
    actionType: actionTypesIndex[actionItem.actionTypeId] ?? null,
    http,
    uiSettings,
  });

  const allowGroupConnector = (actionTypeRegistered?.subtype ?? []).map((subtype) => subtype.id);
  const connectorDropdownErrors = useMemo(
    () => [`Unable to load ${actionTypeRegistered?.actionTypeTitle ?? actionTypeName} connector`],
    [actionTypeRegistered?.actionTypeTitle, actionTypeName]
  );

  const noConnectorsLabel = (
    <FormattedMessage
      id="xpack.triggersActionsUI.sections.connectorAddInline.emptyConnectorsLabel"
      defaultMessage="No {actionTypeName} connectors"
      values={{
        actionTypeName,
      }}
    />
  );

  const unableToLoadConnectorLabel = (
    <EuiText color="danger">
      <FormattedMessage
        id="xpack.triggersActionsUI.sections.connectorAddInline.unableToLoadConnectorTitle"
        defaultMessage="Unable to load connector"
      />
    </EuiText>
  );

  useEffect(() => {
    const filteredConnectors = getValidConnectors(
      connectors,
      actionItem,
      actionTypesIndex,
      allowGroupConnector
    );

    if (filteredConnectors.length > 0) {
      setHasConnectors(true);
    }

    setIsEmptyActionId(!!emptyActionsIds.find((emptyId: string) => actionItem.id === emptyId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoadingActionTypeModel) {
    return (
      <EuiFlexGroup justifyContent="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" data-test-subj="connectorAddInlineLoading" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (actionTypeModelError || !actionTypeRegistered) {
    return (
      <EuiCallOut
        announceOnMount
        color="danger"
        iconType="error"
        title={i18n.translate(
          'xpack.triggersActionsUI.sections.connectorAddInline.specLoadErrorTitle',
          { defaultMessage: 'Unable to load connector' }
        )}
      >
        <p>
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.connectorAddInline.specLoadErrorDescription"
            defaultMessage="The connector configuration could not be loaded. Try reopening the rule."
          />
        </p>
      </EuiCallOut>
    );
  }

  const connectorsDropdown = (
    <EuiFormRow
      fullWidth
      label={
        <FormattedMessage
          id="xpack.triggersActionsUI.sections.connectorAddInline.connectorAddInline.actionIdLabel"
          defaultMessage="Use another {connectorInstance} connector"
          values={{
            connectorInstance: actionTypeName,
          }}
        />
      }
      labelAppend={
        <EuiButtonEmpty
          size="xs"
          data-test-subj={`addNewActionConnectorButton-${actionItem.actionTypeId}`}
          onClick={onAddConnector}
        >
          <FormattedMessage
            defaultMessage="Add connector"
            id="xpack.triggersActionsUI.sections.connectorAddInline.connectorAddInline.addNewConnectorEmptyButton"
          />
        </EuiButtonEmpty>
      }
      error={connectorDropdownErrors}
      isInvalid
    >
      <ConnectorsSelection
        actionItem={actionItem}
        accordionIndex={index}
        actionTypesIndex={actionTypesIndex}
        actionTypeRegistered={actionTypeRegistered}
        connectors={connectors}
        onConnectorSelected={onSelectConnector}
        allowGroupConnector={allowGroupConnector}
      />
    </EuiFormRow>
  );

  return (
    <>
      <EuiAccordion
        key={index}
        initialIsOpen={true}
        id={index.toString()}
        className="actAccordionActionForm"
        buttonContentClassName="actAccordionActionForm__button"
        data-test-subj={`alertActionAccordion-${index}`}
        buttonContent={
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiIcon type={actionTypeRegistered?.iconClass ?? 'plugs'} size="m" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText>
                <div>
                  <FormattedMessage
                    defaultMessage="{actionConnectorName}"
                    id="xpack.triggersActionsUI.sections.connectorAddInline.newRuleActionTypeEditTitle"
                    values={{
                      actionConnectorName: actionTypeRegistered?.actionTypeTitle ?? actionTypeName,
                    }}
                  />
                </div>
              </EuiText>
            </EuiFlexItem>
            {!isEmptyActionId && (
              <EuiFlexItem grow={false}>
                <EuiIconTip
                  type="warning"
                  size="m"
                  color="danger"
                  data-test-subj={`alertActionAccordionErrorTooltip`}
                  content={
                    <FormattedMessage
                      defaultMessage="Unable to load connector"
                      id="xpack.triggersActionsUI.sections.connectorAddInline.unableToLoadConnectorTitle"
                    />
                  }
                />
              </EuiFlexItem>
            )}
            {actionTypeRegistered?.isExperimental && (
              <EuiFlexItem grow={false}>
                <EuiBetaBadge
                  label={TECH_PREVIEW_LABEL}
                  tooltipContent={TECH_PREVIEW_DESCRIPTION}
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        }
        extraAction={
          <EuiButtonIcon
            iconType="minusCircle"
            color="danger"
            className="actAccordionActionForm__extraAction"
            aria-label={i18n.translate(
              'xpack.triggersActionsUI.sections.connectorAddInline.accordion.deleteIconAriaLabel',
              {
                defaultMessage: 'Delete',
              }
            )}
            onClick={onDeleteConnector}
          />
        }
        paddingSize="l"
      >
        {canSave ? (
          hasConnectors ? (
            connectorsDropdown
          ) : (
            <EuiEmptyPrompt
              title={isEmptyActionId ? noConnectorsLabel : unableToLoadConnectorLabel}
              actions={
                <EuiButton
                  color="primary"
                  fill
                  size="s"
                  data-test-subj={`createActionConnectorButton-${index}`}
                  onClick={onAddConnector}
                >
                  <FormattedMessage
                    id="xpack.triggersActionsUI.sections.connectorAddInline.addConnectorButtonLabel"
                    defaultMessage="Create a connector"
                  />
                </EuiButton>
              }
            />
          )
        ) : (
          <EuiCallOut announceOnMount title={noConnectorsLabel}>
            <p>
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.connectorAddInline.unauthorizedToCreateForEmptyConnectors"
                defaultMessage="Only authorized users can configure a connector. Contact your administrator."
              />
            </p>
          </EuiCallOut>
        )}
      </EuiAccordion>
      <EuiSpacer size="xs" />
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { AddConnectorInline as default };
