/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiPopover,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { AnonymizationSettingsModal } from '../anonymization_settings_modal';

import * as i18n from './translations';

const SettingsPopoverComponent: React.FC<{ isDisabled?: boolean }> = ({ isDisabled = false }) => {
  const [showAnonymizationSettingsModal, setShowAnonymizationSettingsModal] = useState(false);
  const closeAnonymizationSettingsModal = useCallback(
    () => setShowAnonymizationSettingsModal(false),
    []
  );

  const contextMenuPopoverId = useGeneratedHtmlId();

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const onButtonClick = useCallback(() => setIsPopoverOpen((prev) => !prev), []);
  const button = useMemo(
    () => (
      <EuiButtonIcon
        isDisabled={isDisabled}
        aria-label={i18n.SETTINGS}
        data-test-subj="settings"
        iconType="gear"
        onClick={onButtonClick}
      />
    ),
    [isDisabled, onButtonClick]
  );

  const panels: EuiContextMenuPanelDescriptor[] = useMemo(
    () => [
      {
        id: 0,
        items: [
          {
            icon: 'eyeClosed',
            name: i18n.ANONYMIZATION,
            onClick: () => {
              closePopover();

              setShowAnonymizationSettingsModal(true);
            },
          },
        ],
        size: 's',
        width: 150,
      },
    ],
    [closePopover]
  );

  return (
    <>
      <EuiPopover
        anchorPosition="downLeft"
        button={button}
        closePopover={closePopover}
        id={contextMenuPopoverId}
        isOpen={isPopoverOpen}
        panelPaddingSize="none"
      >
        <EuiContextMenu initialPanelId={0} panels={panels} size="s" />
      </EuiPopover>

      {showAnonymizationSettingsModal && (
        <AnonymizationSettingsModal closeModal={closeAnonymizationSettingsModal} />
      )}
    </>
  );
};

SettingsPopoverComponent.displayName = 'SettingsPopoverComponent';

export const SettingsPopover = React.memo(SettingsPopoverComponent);
