/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiHorizontalRule,
  EuiPopover,
  EuiText,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { ReactNode } from 'react';
import React, { useEffect, useState } from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import type { ChangeHistoryPreviewModeOption } from './change_history_compare_mode_setting';
import { ChangeHistoryCompareModeSetting } from './change_history_compare_mode_setting';
import { changeHistoryPreviewTypography } from './change_history_preview_typography';

const PANEL_SECTION_PADDING = 16;

const PANEL_CLASS = 'changeHistoryPreviewSettingsPopoverPanel';
const SETTINGS_BUTTON_TEST_SUBJ = 'changeHistoryPreviewSettingsButton';

const settingsPopoverStyles = {
  panel: ({ euiTheme }: UseEuiTheme) =>
    css(changeHistoryPreviewTypography, {
      width: 'fit-content',
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      borderRadius: euiTheme.border.radius.medium,
      overflow: 'hidden',
    }),
  sections: ({ euiTheme }: UseEuiTheme) =>
    css({
      '& > * + *': {
        borderTop: euiTheme.border.thin,
      },
    }),
  section: css({
    padding: `${PANEL_SECTION_PADDING}px`,
  }),
};

export interface ChangeHistoryPreviewSettingsPopoverProps {
  /** Modes the user can pick from. The mode setting is only rendered when there is more than one. */
  modes: readonly ChangeHistoryPreviewModeOption[];
  selectedModeId: string;
  onModeChange: (modeId: string) => void;
  /** Additional settings rendered below the compare mode setting; compose `ChangeHistoryPreviewSettingsSection`s. */
  children?: ReactNode;
}

/**
 * Settings button + popover for the preview footer. Always starts with the compare mode setting
 * (diff mode); sections are separated by a divider.
 */
export const ChangeHistoryPreviewSettingsPopover = ({
  modes,
  selectedModeId,
  onModeChange,
  children,
}: ChangeHistoryPreviewSettingsPopoverProps): JSX.Element => {
  const styles = useMemoCss(settingsPopoverStyles);
  const [isOpen, setIsOpen] = useState(false);
  const popoverTitleId = useGeneratedHtmlId({
    prefix: 'changeHistoryPreviewSettingsTitle',
  });

  const settingsLabel = i18n.translate('xpack.changeHistoryUi.preview.settings.label', {
    defaultMessage: 'Settings',
  });

  // Monaco can swallow bubble-phase outside clicks; close only on true outside mousedown.
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handler = (event: MouseEvent): void => {
      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }
      if (target.closest(`[data-test-subj="${SETTINGS_BUTTON_TEST_SUBJ}"]`)) {
        return;
      }
      if (target.closest(`.${PANEL_CLASS}`)) {
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handler, true);
    return () => document.removeEventListener('mousedown', handler, true);
  }, [isOpen]);

  return (
    <EuiPopover
      data-test-subj="changeHistoryPreviewSettingsPopover"
      aria-labelledby={popoverTitleId}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="upRight"
      panelPaddingSize="none"
      panelClassName={PANEL_CLASS}
      panelStyle={{ width: 'auto' }}
      repositionOnScroll={false}
      button={
        <EuiToolTip content={settingsLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            size="s"
            iconType="controls"
            color="primary"
            data-test-subj={SETTINGS_BUTTON_TEST_SUBJ}
            onClick={() => setIsOpen(!isOpen)}
            aria-label={settingsLabel}
          />
        </EuiToolTip>
      }
    >
      <EuiText component="div" css={styles.panel}>
        <EuiHorizontalRule margin="none" />

        <div css={styles.sections}>
          {modes.length > 1 ? (
            <ChangeHistoryCompareModeSetting
              modes={modes}
              selectedModeId={selectedModeId}
              onModeChange={onModeChange}
            />
          ) : null}
          {children}
        </div>
      </EuiText>
    </EuiPopover>
  );
};

/** Padded block for a group of related settings inside the popover. */
export const ChangeHistoryPreviewSettingsSection = ({
  children,
}: {
  children: ReactNode;
}): JSX.Element => {
  const styles = useMemoCss(settingsPopoverStyles);
  return (
    <EuiText component="div" css={styles.section}>
      {children}
    </EuiText>
  );
};
