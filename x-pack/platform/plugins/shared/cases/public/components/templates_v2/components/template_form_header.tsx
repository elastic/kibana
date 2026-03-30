/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonTitle,
  EuiSwitch,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import * as i18n from '../translations';

interface TemplateFormHeaderProps {
  title: string;
  isLoading?: boolean;
  isSaving?: boolean;
  hasChanges: boolean;
  isEdit: boolean;
  submitError: string | null;
  isEnabled: boolean;
  onBack: () => void;
  onReset: () => void;
  onSave: () => void;
  onIsEnabledChange: (isEnabled: boolean) => void;
}

export const TemplateFormHeader: React.FC<TemplateFormHeaderProps> = ({
  title,
  isLoading,
  isSaving,
  hasChanges,
  isEdit,
  submitError,
  isEnabled,
  onBack,
  onReset,
  onSave,
  onIsEnabledChange,
}) => {
  const { euiTheme } = useEuiTheme();
  const saveTooltipContent = submitError ?? undefined;

  return (
    <header>
      <EuiButtonEmpty
        iconType="sortLeft"
        size="xs"
        flush="left"
        onClick={onBack}
        aria-label={i18n.BACK_TO_TEMPLATES}
      >
        {i18n.BACK_TO_TEMPLATES}
      </EuiButtonEmpty>
      <EuiFlexGroup
        alignItems="center"
        gutterSize="s"
        css={css`
          margin-bottom: ${euiTheme.size.l};
        `}
      >
        <EuiFlexItem
          css={css`
            overflow: hidden;
            display: block;
          `}
        >
          <EuiFlexGroup alignItems="center" responsive={false} gutterSize="m">
            <EuiFlexItem grow={false}>
              <EuiSkeletonTitle size="l" isLoading={!!isLoading} contentAriaLabel={title}>
                <EuiTitle size="l">
                  <h1>{title}</h1>
                </EuiTitle>
              </EuiSkeletonTitle>
            </EuiFlexItem>
            {hasChanges && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="warning">{i18n.UNSAVED_CHANGES}</EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup justifyContent="flexEnd" alignItems="center" gutterSize="s">
            {hasChanges && (
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={isEdit ? i18n.REVERT_TO_LAST_SAVED : i18n.REVERT_TO_DEFAULT}
                  disableScreenReaderOutput
                >
                  <EuiButtonIcon
                    iconType="refresh"
                    onClick={onReset}
                    disabled={isLoading || isSaving}
                    aria-label={isEdit ? i18n.REVERT_TO_LAST_SAVED : i18n.REVERT_TO_DEFAULT}
                    data-test-subj="resetTemplateButton"
                    display="base"
                    size="s"
                  />
                </EuiToolTip>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={
                  isEnabled
                    ? i18n.TEMPLATE_ENABLED_CAN_CREATE_CASES
                    : i18n.TEMPLATE_DISABLED_CANNOT_CREATE_CASES
                }
              >
                <EuiSwitch
                  label={i18n.TEMPLATE_ENABLED}
                  checked={isEnabled}
                  onChange={(e) => onIsEnabledChange(e.target.checked)}
                  disabled={isLoading || isSaving}
                  data-test-subj="templateEnabledSwitch"
                />
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip content={saveTooltipContent}>
                <EuiButton
                  fill
                  color="primary"
                  size="s"
                  onClick={onSave}
                  disabled={isLoading || isSaving}
                  isLoading={isSaving}
                  data-test-subj="saveTemplateHeaderButton"
                >
                  {isEdit ? i18n.SAVE_TEMPLATE : i18n.CREATE_TEMPLATE}
                </EuiButton>
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </header>
  );
};

TemplateFormHeader.displayName = 'TemplateFormHeader';
