/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiPopover, EuiButtonIcon, EuiSelectable, EuiSelectableOption } from '@elastic/eui';

const iconButtonTitle = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.ruleExecutionPercentileSelectButton',
  { defaultMessage: 'select percentile' }
);

interface Props {
  options: EuiSelectableOption[];
  onOptionsChange: (options: EuiSelectableOption[]) => void;
}

const divStyle = { width: 200 };

export const PercentileSelectablePopover = memo((props: Props) => {
  const { options, onOptionsChange } = props;

  const [isOpen, setIsOpen] = useState<boolean>(false);

  const onButtonClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    // stop propagation to prevent clicking on the column header
    // which triggers a sorting call
    e.stopPropagation();
    setIsOpen((currentIsOpen) => !currentIsOpen);
  }, []);

  const onPopoverClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const onOptionsChangeAndClosePopover = useCallback(
    (newOptions: EuiSelectableOption[]) => {
      onPopoverClose();
      onOptionsChange(newOptions);
    },
    [onOptionsChange, onPopoverClose]
  );

  const onDivClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Div to capture click events and stop propagation to
    // prevent clicking on the column header which triggers a sorting call.
    // The div needs to be here because EuiSelectable does not pass the event
    // into the onChange handler
    e.stopPropagation();
  }, []);

  return (
    <EuiPopover
      button={
        <EuiButtonIcon
          iconType="gear"
          size="s"
          data-test-subj={`percentileSelectablePopover-iconButton`}
          title={iconButtonTitle}
          aria-label={iconButtonTitle}
          onClick={onButtonClick}
        />
      }
      panelPaddingSize="s"
      isOpen={isOpen}
      closePopover={onPopoverClose}
      anchorPosition="downRight"
    >
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events */}
      <div style={divStyle} onClick={onDivClick}>
        <EuiSelectable
          data-test-subj="percentileSelectablePopover-selectable"
          singleSelection="always"
          options={options}
          onChange={onOptionsChangeAndClosePopover}
        >
          {(list) => list}
        </EuiSelectable>
      </div>
    </EuiPopover>
  );
});
