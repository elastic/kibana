/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiButtonIcon, EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface SandboxSettingsMenuProps {
  /** When true the base/alert split editor is active; the menu offers merging back. */
  manualSplitEnabled: boolean;
  /** Enable the base/alert split editor (disables automatic split on Apply). */
  onEnableManualSplit: () => void;
  /** Merge base + alert back into the unified editor (re-enables automatic split). */
  onDisableManualSplit: () => void;
}

const SETTINGS_BUTTON_LABEL = i18n.translate(
  'xpack.alertingV2.composeDiscover.querySandbox.settingsButtonLabel',
  { defaultMessage: 'Query settings' }
);

const DEFINE_MANUALLY_LABEL = i18n.translate(
  'xpack.alertingV2.composeDiscover.querySandbox.defineConditionManuallyMenuLabel',
  { defaultMessage: 'Define condition manually' }
);

const USE_SINGLE_EDITOR_LABEL = i18n.translate(
  'xpack.alertingV2.composeDiscover.querySandbox.useSingleEditorButtonLabel',
  { defaultMessage: 'Use single editor' }
);

/**
 * Settings (gear) menu for the query sandbox toolbar. Demotes the base/alert
 * split control behind a menu so it is no longer primary chrome — the unified
 * editor is the default create flow and manual split is an advanced opt-in.
 */
export const SandboxSettingsMenu: React.FC<SandboxSettingsMenuProps> = ({
  manualSplitEnabled,
  onEnableManualSplit,
  onDisableManualSplit,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const closePopover = useCallback(() => setIsOpen(false), []);
  const togglePopover = useCallback(() => setIsOpen((open) => !open), []);

  const handleToggleSplit = useCallback(() => {
    if (manualSplitEnabled) {
      onDisableManualSplit();
    } else {
      onEnableManualSplit();
    }
    closePopover();
  }, [manualSplitEnabled, onEnableManualSplit, onDisableManualSplit, closePopover]);

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downRight"
      button={
        <EuiButtonIcon
          iconType="gear"
          size="s"
          color="text"
          aria-label={SETTINGS_BUTTON_LABEL}
          onClick={togglePopover}
          data-test-subj="querySandboxSettingsButton"
        />
      }
    >
      <EuiContextMenuPanel
        items={[
          manualSplitEnabled ? (
            <EuiContextMenuItem
              key="useSingleEditor"
              icon="querySelector"
              onClick={handleToggleSplit}
              data-test-subj="querySandboxUseSingleEditor"
            >
              {USE_SINGLE_EDITOR_LABEL}
            </EuiContextMenuItem>
          ) : (
            <EuiContextMenuItem
              key="defineConditionManually"
              icon="inputOutput"
              onClick={handleToggleSplit}
              data-test-subj="querySandboxSplitBaseAndAlert"
            >
              {DEFINE_MANUALLY_LABEL}
            </EuiContextMenuItem>
          ),
        ]}
      />
    </EuiPopover>
  );
};
