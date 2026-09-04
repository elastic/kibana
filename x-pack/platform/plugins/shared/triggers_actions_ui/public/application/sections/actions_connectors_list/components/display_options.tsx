/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButtonGroup,
  EuiButtonIcon,
  EuiFormRow,
  EuiPopover,
  EuiPopoverTitle,
  EuiToolTip,
  useGeneratedHtmlId,
  type UseEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const popoverPanelStyles = ({ euiTheme }: UseEuiTheme) => ({
  minWidth: euiTheme.base * 20,
});

const HIDE_ID = 'connectorsDeprecatedToggleHide';
const SHOW_ID = 'connectorsDeprecatedToggleShow';

const TOGGLE_OPTIONS = [
  {
    id: HIDE_ID,
    label: i18n.translate(
      'xpack.triggersActionsUI.sections.actionsConnectorsList.displayOptions.hideButtonLabel',
      { defaultMessage: 'Hide' }
    ),
    'data-test-subj': HIDE_ID,
  },
  {
    id: SHOW_ID,
    label: i18n.translate(
      'xpack.triggersActionsUI.sections.actionsConnectorsList.displayOptions.showButtonLabel',
      { defaultMessage: 'Show' }
    ),
    'data-test-subj': SHOW_ID,
  },
];

export interface DisplayOptionsProps {
  showDeprecated: boolean;
  onChange: (showDeprecated: boolean) => void;
}

export const DisplayOptions = ({ showDeprecated, onChange }: DisplayOptionsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverTitleId = useGeneratedHtmlId();

  const closePopover = useCallback(() => {
    setIsOpen(false);
  }, []);

  const togglePopover = useCallback(() => {
    setIsOpen((prevIsOpen) => !prevIsOpen);
  }, []);

  const onToggleChange = useCallback(
    (id: string) => {
      onChange(id === SHOW_ID);
    },
    [onChange]
  );

  return (
    <EuiPopover
      id="connectorsDisplayOptions"
      aria-labelledby={popoverTitleId}
      button={
        <EuiToolTip
          content={i18n.translate(
            'xpack.triggersActionsUI.sections.actionsConnectorsList.displayOptionsAriaLabel',
            { defaultMessage: 'Display options' }
          )}
          disableScreenReaderOutput
          data-test-subj="connectorsDisplayOptionsTooltip"
        >
          <EuiButtonIcon
            iconType="controls"
            aria-label={i18n.translate(
              'xpack.triggersActionsUI.sections.actionsConnectorsList.displayOptionsAriaLabel',
              { defaultMessage: 'Display options' }
            )}
            onClick={togglePopover}
            display={isOpen ? 'fill' : 'base'}
            size="m"
            color="text"
            data-test-subj="connectorsDisplayOptionsButton"
          />
        </EuiToolTip>
      }
      isOpen={isOpen}
      closePopover={closePopover}
      anchorPosition="downRight"
      panelPaddingSize="s"
      panelProps={{ css: popoverPanelStyles }}
    >
      <EuiPopoverTitle paddingSize="s" id={popoverTitleId}>
        {i18n.translate(
          'xpack.triggersActionsUI.sections.actionsConnectorsList.displayOptionsTitle',
          { defaultMessage: 'Display options' }
        )}
      </EuiPopoverTitle>
      <EuiFormRow
        label={i18n.translate(
          'xpack.triggersActionsUI.sections.actionsConnectorsList.displayOptions.deprecatedConnectorsLabel',
          { defaultMessage: 'Deprecated' }
        )}
        display="columnCompressed"
        data-test-subj="connectorsDeprecatedToggle"
      >
        <EuiButtonGroup
          isFullWidth
          legend={i18n.translate(
            'xpack.triggersActionsUI.sections.actionsConnectorsList.displayOptions.deprecatedConnectorsLabel',
            { defaultMessage: 'Deprecated' }
          )}
          buttonSize="compressed"
          options={TOGGLE_OPTIONS}
          idSelected={showDeprecated ? SHOW_ID : HIDE_ID}
          onChange={onToggleChange}
          data-test-subj="connectorsDeprecatedToggleButtonGroup"
        />
      </EuiFormRow>
    </EuiPopover>
  );
};
