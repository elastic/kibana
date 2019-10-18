/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useContext, useState } from 'react';
import {
  EuiSpacer,
  EuiText,
  EuiFlexItem,
  EuiIcon,
  EuiFlexGroup,
  EuiButton,
  EuiPopover,
  EuiContextMenuPanel,
  EuiContextMenuItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { ActionsContext } from '../../../context/actions_context';

interface Props {
  actionTypes: any;
}

export const AlertingActionsDropdown: React.FunctionComponent<Props> = ({ actionTypes }) => {
  const { addAction } = useContext(ActionsContext);

  const [isPopoverOpen, setIsPopOverOpen] = useState<boolean>(false);

  const actionTypesSettings = (val: string) => {
    let res;
    switch (val) {
      case '.email':
        res = {
          iconClass: 'email',
          selectMessage: i18n.translate(
            'xpack.alertingUI.sections.actions.emailAction.selectMessageText',
            {
              defaultMessage: 'Send an email from your server.',
            }
          ),
          simulatePrompt: i18n.translate(
            'xpack.alertingUI.sections.actions.emailAction.simulateButtonLabel',
            {
              defaultMessage: 'Send test email',
            }
          ),
        };
        break;
      case '.slack':
        res = {
          iconClass: 'logoSlack',
          selectMessage: i18n.translate(
            'xpack.alertingUI.sections.actions.slackAction.selectMessageText',
            {
              defaultMessage: 'Send a message to a Slack user or channel.',
            }
          ),
          simulatePrompt: i18n.translate(
            'xpack.alertingUI.sections.actions.slackAction.simulateButtonLabel',
            {
              defaultMessage: 'Send a sample message',
            }
          ),
        };
        break;
      case '.server-log':
        res = {
          iconClass: 'loggingApp',
          selectMessage: i18n.translate(
            'xpack.alertingUI.sections.actions.serverLogAction.selectMessageText',
            {
              defaultMessage: 'Add an item to the logs.',
            }
          ),
          simulatePrompt: i18n.translate(
            'xpack.alertingUI.sections.actions.serverLogAction.simulateButtonLabel',
            {
              defaultMessage: 'Log a sample message',
            }
          ),
        };
        break;
      default:
        res = { typeName: '', iconClass: 'apps', selectMessage: '' };
    }
    return res;
  };

  const actions = Object.entries(!actionTypes ? [] : actionTypes).map(
    ([actionType, { id, name }]: any) => {
      const actionSettings = actionTypesSettings(id);
      const typeName = name;
      const iconClass = actionSettings.iconClass;
      const selectMessage = !actionSettings.selectMessage ? name : actionSettings.selectMessage;
      return {
        name,
        typeName,
        iconClass,
        selectMessage,
      };
    }
  );

  const button = (
    <EuiButton
      data-test-subj="addWatchActionButton"
      fill
      iconType="arrowDown"
      iconSide="right"
      onClick={() => setIsPopOverOpen(!isPopoverOpen)}
    >
      <FormattedMessage
        id="xpack.alertingUI.sections.actions.addActionButtonLabel"
        defaultMessage="Add action"
      />
    </EuiButton>
  );

  return (
    <EuiPopover
      id="watchActionPanel"
      button={button}
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopOverOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenuPanel
        items={actions.map((action, index) => {
          const isActionDisabled = false;
          const description = action.selectMessage;
          return (
            <EuiContextMenuItem
              key={`${action.name}-${index}`}
              disabled={isActionDisabled}
              data-test-subj={`${action.name}ActionButton`}
              onClick={() => {
                addAction({ type: action.name, defaults: { isNew: true } });
                setIsPopOverOpen(false);
              }}
            >
              <EuiFlexGroup>
                <EuiFlexItem grow={false} className="watcherThresholdWatchActionContextMenuItem">
                  <EuiIcon type={action.iconClass} />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <strong>{action.typeName}</strong>
                  <EuiSpacer size="xs" />
                  <EuiText size="s">
                    <p>{description}</p>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiContextMenuItem>
          );
        })}
      />
    </EuiPopover>
  );
};
