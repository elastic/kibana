/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiToolTip,
  EuiTitle,
} from '@elastic/eui';
import { useDataPhasesFlyoutStyles } from './use_data_phases_flyout_styles';

export interface FlyoutShellProps {
  dataTestSubj: string;
  flyoutTitleId: string;
  formId: string;
  onClose: () => void;
  title: React.ReactNode;
  tabsRow: React.ReactNode;
  children: React.ReactNode;
  isSubmitting: boolean;
  isSaving?: boolean;
  isSaveDisabledDueToInvalid: boolean;
}

export const FlyoutShell = ({
  dataTestSubj,
  flyoutTitleId,
  formId,
  onClose,
  title,
  tabsRow,
  children,
  isSubmitting,
  isSaving,
  isSaveDisabledDueToInvalid,
}: FlyoutShellProps) => {
  const { headerStyles, footerStyles } = useDataPhasesFlyoutStyles();
  const isSaveDisabled = isSaveDisabledDueToInvalid || isSubmitting;

  const button = (
    <EuiButton
      fill
      size="s"
      type="submit"
      form={formId}
      isLoading={Boolean(isSaving) || isSubmitting}
      data-test-subj={`${dataTestSubj}SaveButton`}
      disabled={isSaveDisabled}
    >
      {i18n.translate('xpack.streams.flyoutShell.apply', { defaultMessage: 'Apply' })}
    </EuiButton>
  );

  const saveButton = isSaveDisabledDueToInvalid ? (
    <EuiToolTip
      content={i18n.translate('xpack.streams.flyoutShell.saveDisabledTooltip', {
        defaultMessage: 'Fix the form errors before applying.',
      })}
    >
      {button}
    </EuiToolTip>
  ) : (
    button
  );

  return (
    <EuiFlyout
      type="push"
      size={400}
      paddingSize="none"
      ownFocus={false}
      onClose={onClose}
      aria-labelledby={flyoutTitleId}
      data-test-subj={dataTestSubj}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup direction="column" gutterSize="s" responsive={false} css={headerStyles}>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
              <EuiFlexItem grow={true}>
                <EuiTitle size="s">
                  <h2 id={flyoutTitleId}>{title}</h2>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>{tabsRow}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>{children}</EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup
          justifyContent="spaceBetween"
          alignItems="center"
          responsive={false}
          css={footerStyles}
        >
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              type="button"
              data-test-subj={`${dataTestSubj}CancelButton`}
              onClick={onClose}
              flush="left"
              size="s"
            >
              {i18n.translate('xpack.streams.flyoutShell.cancel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{saveButton}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
