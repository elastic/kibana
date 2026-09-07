/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopoverTitle,
  EuiToolTip,
} from '@elastic/eui';

interface ClosablePopoverTitleProps {
  children: JSX.Element;
  onClose: () => void;
  dataTestSubj?: string;
}

export const ClosablePopoverTitle = ({
  children,
  onClose,
  dataTestSubj,
}: ClosablePopoverTitleProps) => {
  return (
    <EuiPopoverTitle>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem data-test-subj={dataTestSubj}>{children}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={i18n.translate(
              'xpack.triggersActionsUI.common.expressionItems.components.closablePopoverTitle.closeLabel',
              {
                defaultMessage: 'Close',
              }
            )}
            disableScreenReaderOutput
          >
            <EuiButtonIcon
              iconType="cross"
              color="danger"
              aria-label={i18n.translate(
                'xpack.triggersActionsUI.common.expressionItems.components.closablePopoverTitle.closeLabel',
                {
                  defaultMessage: 'Close',
                }
              )}
              onClick={() => onClose()}
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPopoverTitle>
  );
};
