/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiPopover,
  EuiToolTip,
  type EuiContextMenuPanelDescriptor,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';

interface Props {
  policy: ActionPolicyResponse;
  onViewDetails?: (policy: ActionPolicyResponse) => void;
  onEdit?: (id: string) => void;
  onClone: (policy: ActionPolicyResponse) => void;
  onDelete: (policy: ActionPolicyResponse) => void;
  onEnable?: (id: string) => void;
  onDisable?: (id: string) => void;
  isStateLoading?: boolean;
  onUpdateApiKey: (id: string) => void;
  isDisabled?: boolean;
  'data-test-subj'?: string;
}

export const ActionPolicyActionsMenu = ({
  policy,
  onViewDetails,
  onEdit,
  onClone,
  onDelete,
  onEnable,
  onDisable,
  isStateLoading = false,
  onUpdateApiKey,
  isDisabled = false,
  'data-test-subj': dataTestSubj,
}: Props) => {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const popoverTitleId = useGeneratedHtmlId();

  const togglePopover = () => setIsPopoverOpen((prev) => !prev);
  const closePopover = () => setIsPopoverOpen(false);

  const primaryItems = [
    ...(onViewDetails
      ? [
          {
            name: i18n.translate('xpack.alertingV2.actionPoliciesList.action.viewDetails', {
              defaultMessage: 'View details',
            }),
            icon: 'eye',
            onClick: () => {
              closePopover();
              onViewDetails(policy);
            },
          },
        ]
      : []),
    ...(onEdit
      ? [
          {
            name: i18n.translate('xpack.alertingV2.actionPoliciesList.action.edit', {
              defaultMessage: 'Edit',
            }),
            icon: 'pencil',
            onClick: () => {
              closePopover();
              onEdit(policy.id);
            },
          },
        ]
      : []),
    {
      name: i18n.translate('xpack.alertingV2.actionPoliciesList.action.clone', {
        defaultMessage: 'Clone',
      }),
      icon: 'copy',
      onClick: () => {
        closePopover();
        onClone(policy);
      },
    },
    ...(onEnable && onDisable
      ? [
          {
            name: policy.enabled
              ? i18n.translate('xpack.alertingV2.actionPoliciesList.action.disable', {
                  defaultMessage: 'Disable',
                })
              : i18n.translate('xpack.alertingV2.actionPoliciesList.action.enable', {
                  defaultMessage: 'Enable',
                }),
            icon: policy.enabled ? 'stop' : 'play',
            disabled: isStateLoading,
            onClick: () => {
              closePopover();
              if (policy.enabled) {
                onDisable(policy.id);
              } else {
                onEnable(policy.id);
              }
            },
          },
        ]
      : []),
    {
      name: i18n.translate('xpack.alertingV2.actionPoliciesList.action.updateApiKey', {
        defaultMessage: 'Update API key',
      }),
      icon: 'key',
      onClick: () => {
        closePopover();
        onUpdateApiKey(policy.id);
      },
    },
    {
      name: i18n.translate('xpack.alertingV2.actionPoliciesList.action.delete', {
        defaultMessage: 'Delete',
      }),
      icon: 'trash',
      css: css`
        color: ${euiTheme.colors.textDanger};
      `,
      onClick: () => {
        closePopover();
        onDelete(policy);
      },
    },
  ];

  const panels: EuiContextMenuPanelDescriptor[] = [{ id: 0, items: primaryItems }];

  return (
    <EuiPopover
      aria-labelledby={popoverTitleId}
      button={
        <EuiToolTip
          content={i18n.translate('xpack.alertingV2.actionPoliciesList.action.more', {
            defaultMessage: 'More actions',
          })}
          disableScreenReaderOutput
        >
          <EuiButtonIcon
            iconType="boxesVertical"
            color="text"
            aria-label={i18n.translate('xpack.alertingV2.actionPoliciesList.action.more', {
              defaultMessage: 'More actions',
            })}
            onClick={togglePopover}
            isDisabled={isDisabled}
            data-test-subj={dataTestSubj}
          />
        </EuiToolTip>
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      anchorPosition="downRight"
      panelPaddingSize="s"
    >
      <EuiContextMenu initialPanelId={0} panels={panels} />
    </EuiPopover>
  );
};
