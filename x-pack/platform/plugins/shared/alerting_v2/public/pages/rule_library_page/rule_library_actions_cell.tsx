/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiToolTip,
  type EuiContextMenuPanelDescriptor,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';

const INSTALL_ACTION_NAME = i18n.translate('xpack.alertingV2.ruleLibrary.installButtonLabel', {
  defaultMessage: 'Install',
});

const INSTALL_RESTRICTED_REASON = i18n.translate(
  'xpack.alertingV2.ruleLibrary.installRestrictedTooltip',
  {
    defaultMessage: 'You do not have permission to install rule templates',
  }
);

const MORE_ACTIONS_LABEL = i18n.translate('xpack.alertingV2.ruleLibrary.moreActionsButtonLabel', {
  defaultMessage: 'More actions',
});

const REVIEW_AND_CREATE_ACTION_NAME = i18n.translate(
  'xpack.alertingV2.ruleLibrary.reviewAndCreateDropDownOptionLabel',
  {
    defaultMessage: 'Review and Create',
  }
);

export interface RuleLibraryActionsCellProps {
  canWrite: boolean;
  isInstalling: boolean;
  onInstall: () => void;
  onReviewAndCreate: () => void;
}

export const RuleLibraryActionsCell = ({
  canWrite,
  isInstalling,
  onInstall,
  onReviewAndCreate,
}: RuleLibraryActionsCellProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const popoverTitleId = useGeneratedHtmlId();

  const closePopover = () => setIsPopoverOpen(false);

  const panels: EuiContextMenuPanelDescriptor[] = [
    {
      id: 0,
      items: [
        {
          name: REVIEW_AND_CREATE_ACTION_NAME,
          icon: 'inspect',
          disabled: !canWrite,
          onClick: () => {
            closePopover();
            onReviewAndCreate();
          },
          'data-test-subj': 'ruleLibraryReviewAndCreateAction',
        },
      ],
    },
  ];

  const installButton = (
    <EuiButtonEmpty
      size="s"
      onClick={onInstall}
      isDisabled={!canWrite || isInstalling}
      data-test-subj="ruleLibraryInstallAction"
    >
      {INSTALL_ACTION_NAME}
    </EuiButtonEmpty>
  );

  return (
    <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center" justifyContent="flexEnd">
      <EuiFlexItem grow={false}>
        {canWrite ? (
          installButton
        ) : (
          <EuiToolTip content={INSTALL_RESTRICTED_REASON} disableScreenReaderOutput>
            {installButton}
          </EuiToolTip>
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPopover
          aria-labelledby={popoverTitleId}
          button={
            <EuiToolTip content={MORE_ACTIONS_LABEL} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="boxesVertical"
                color="text"
                aria-label={MORE_ACTIONS_LABEL}
                onClick={() => setIsPopoverOpen((open) => !open)}
                data-test-subj="ruleLibraryMoreActions"
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
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
