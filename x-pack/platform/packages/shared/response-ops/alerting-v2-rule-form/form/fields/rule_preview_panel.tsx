/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiButton, EuiFlyout, EuiFlyoutBody, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useRuleFormMeta } from '../contexts';
import { RuleResultsPreview } from './rule_results_preview';

/**
 * Layout-aware wrapper for the rule results preview.
 *
 * - **Page layout**: Renders the preview inline (for side-by-side placement).
 * - **Flyout layout**: Renders a trigger button that opens a nested flyout
 *   containing the preview.
 */
export const RulePreviewPanel = () => {
  const { layout } = useRuleFormMeta();

  if (layout === 'page') {
    return <RuleResultsPreview />;
  }

  return <FlyoutPreview />;
};

const FlyoutPreview = () => {
  const [isOpen, setIsOpen] = useState(false);

  const openFlyout = useCallback(() => setIsOpen(true), []);
  const closeFlyout = useCallback(() => setIsOpen(false), []);

  return (
    <>
      <EuiSpacer size="m" />
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.alertingV2.ruleForm.rulePreviewPanel.sectionTitle', {
            defaultMessage: 'Preview Rule results',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiButton
        onClick={openFlyout}
        iconType="inspect"
        color="text"
        data-test-subj="rulePreviewTriggerButton"
      >
        {i18n.translate('xpack.alertingV2.ruleForm.rulePreviewPanel.triggerButton', {
          defaultMessage: 'Preview results',
        })}
      </EuiButton>

      {isOpen && (
        <EuiFlyout
          type="overlay"
          onClose={closeFlyout}
          aria-label={i18n.translate('xpack.alertingV2.ruleForm.rulePreviewPanel.flyoutAriaLabel', {
            defaultMessage: 'Rule results preview',
          })}
          flyoutMenuProps={{
            title: 'Rule results preview',
            hideTitle: true,
          }}
          size="fill"
          minWidth={650}
          ownFocus
          data-test-subj="rulePreviewNestedFlyout"
        >
          <EuiFlyoutBody>
            <EuiSpacer size="m" />
            <RuleResultsPreview />
          </EuiFlyoutBody>
        </EuiFlyout>
      )}
    </>
  );
};
