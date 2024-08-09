/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import * as i18n from './translations';

interface Props {
  children: React.ReactNode;
  title: string;
  flyoutVisible: boolean;
  onClose: () => void;
  onSaveCancelled: () => void;
  onSaveConfirmed: () => void;
  saveButtonDisabled?: boolean;
}

const FlyoutComponent: React.FC<Props> = ({
  title,
  flyoutVisible,
  children,
  onClose,
  onSaveCancelled,
  onSaveConfirmed,
  saveButtonDisabled = false,
}) => {
  return flyoutVisible ? (
    <EuiFlyout
      ownFocus
      onClose={onClose}
      css={css`
        max-width: 656px;
      `}
    >
      <EuiFlyoutHeader>
        <EuiTitle size={'s'}>
          <h2>{title}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>{children}</EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="m"
              color="text"
              iconType="cross"
              data-test-subj="cancel-button"
              onClick={onSaveCancelled}
            >
              {i18n.FLYOUT_CANCEL_BUTTON_TITLE}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              size="m"
              type="submit"
              data-test-subj="save-button"
              onClick={onSaveConfirmed}
              iconType="check"
              disabled={saveButtonDisabled}
              fill
            >
              {i18n.FLYOUT_SAVE_BUTTON_TITLE}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  ) : null;
};

export const Flyout = React.memo(FlyoutComponent);
