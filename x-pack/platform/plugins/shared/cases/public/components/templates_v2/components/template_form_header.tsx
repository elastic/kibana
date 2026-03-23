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
  EuiPageHeaderSection,
  EuiPageTemplate,
  EuiSkeletonTitle,
  EuiSwitch,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import * as i18n from '../translations';
import { componentStyles } from './template_form_layout.styles';

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
  const styles = useMemoCss(componentStyles);
  const saveTooltipContent = submitError ?? undefined;

  return (
    <EuiPageTemplate offset={0} minHeight={0} grow={false} css={styles.pageTemplate}>
      <EuiPageTemplate.Header
        css={styles.header}
        restrictWidth={false}
        bottomBorder={false}
        paddingSize="m"
        alignItems="bottom"
      >
        <EuiPageHeaderSection css={styles.headerSection}>
          <EuiButtonEmpty
            iconType="sortLeft"
            size="xs"
            flush="left"
            onClick={onBack}
            aria-label={i18n.BACK_TO_TEMPLATES}
          >
            {i18n.BACK_TO_TEMPLATES}
          </EuiButtonEmpty>
          <EuiFlexGroup alignItems="center" responsive={false} gutterSize="m">
            <EuiFlexItem grow={false} css={styles.titleItem}>
              <EuiSkeletonTitle
                size="m"
                isLoading={!!isLoading}
                contentAriaLabel={title}
                css={styles.skeletonTitle}
              >
                <EuiTitle size="m" css={styles.title}>
                  <h2>{title}</h2>
                </EuiTitle>
              </EuiSkeletonTitle>
            </EuiFlexItem>
            {hasChanges && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="warning">{i18n.UNSAVED_CHANGES}</EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiPageHeaderSection>

        <EuiPageHeaderSection>
          <EuiFlexGroup justifyContent="flexEnd" alignItems="center" gutterSize="m">
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
        </EuiPageHeaderSection>
      </EuiPageTemplate.Header>
    </EuiPageTemplate>
  );
};

TemplateFormHeader.displayName = 'TemplateFormHeader';
