/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import numeral from '@elastic/numeral';
import { useUiSetting$ } from '@kbn/kibana-react-plugin/public';
import { EuiButtonEmpty, EuiPopover } from '@elastic/eui';
import { SELECT_SHOW_BULK_ACTIONS_ARIA_LABEL, SELECTED_RULES } from '../../rules_list/translations';
import { DEFAULT_NUMBER_FORMAT } from '../../../constants';

export interface BulkOperationPopoverProps {
  numberOfSelectedRules?: number;
  canModifySelectedRules: boolean;
  children: JSX.Element;
}

export const BulkOperationPopover = (props: BulkOperationPopoverProps) => {
  const { children, numberOfSelectedRules = 0, canModifySelectedRules } = props;

  const [defaultNumberFormat] = useUiSetting$<string>(DEFAULT_NUMBER_FORMAT);
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  const formattedSelectedRules = useMemo(() => {
    return numeral(numberOfSelectedRules).format(defaultNumberFormat);
  }, [numberOfSelectedRules, defaultNumberFormat]);

  return (
    <EuiPopover
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      data-test-subj="bulkAction"
      panelPaddingSize="s"
      button={
        <EuiButtonEmpty
          size="xs"
          iconSide="right"
          iconType={canModifySelectedRules ? 'arrowDown' : undefined}
          disabled={!canModifySelectedRules}
          aria-label={SELECT_SHOW_BULK_ACTIONS_ARIA_LABEL}
          data-test-subj="showBulkActionButton"
          onClick={() => setIsPopoverOpen(!isPopoverOpen)}
        >
          {SELECTED_RULES(formattedSelectedRules, numberOfSelectedRules)}
        </EuiButtonEmpty>
      }
    >
      {children &&
        React.Children.map(children, (child) =>
          React.isValidElement(child) ? <>{React.cloneElement(child, {})}</> : child
        )}
    </EuiPopover>
  );
};
