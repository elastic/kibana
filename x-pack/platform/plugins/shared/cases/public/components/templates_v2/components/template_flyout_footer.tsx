/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlyoutFooter,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import * as i18n from '../translations';

export interface TemplateFlyoutFooterProps {
  isFirstStep: boolean;
  isLastStep: boolean;
  isNextDisabled: boolean;
  isNextLoading: boolean;
  isImportDisabled: boolean;
  isImportLoading?: boolean;
  selectedCount: number;
  onCancel: () => void;
  onBack: () => void;
  onNext: () => void;
  onImport: () => void;
}

export const TemplateFlyoutFooter = React.memo<TemplateFlyoutFooterProps>(
  ({
    isFirstStep,
    isLastStep,
    isNextDisabled,
    isNextLoading,
    isImportDisabled,
    isImportLoading,
    selectedCount,
    onCancel,
    onBack,
    onNext,
    onImport,
  }) => (
    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          {isFirstStep ? (
            <EuiButtonEmpty
              color="primary"
              onClick={onCancel}
              data-test-subj="template-flyout-cancel"
            >
              {i18n.CANCEL}
            </EuiButtonEmpty>
          ) : (
            <EuiButtonEmpty
              color="primary"
              iconType="arrowLeft"
              onClick={onBack}
              data-test-subj="template-flyout-back"
            >
              {i18n.BACK}
            </EuiButtonEmpty>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {isLastStep ? (
            <EuiButton
              onClick={onImport}
              fill
              isDisabled={isImportDisabled}
              isLoading={isImportLoading}
              data-test-subj="template-flyout-import"
            >
              {i18n.IMPORT_SELECTED(selectedCount)}
            </EuiButton>
          ) : (
            <EuiButton
              onClick={onNext}
              fill
              isDisabled={isNextDisabled}
              isLoading={isNextLoading}
              data-test-subj="template-flyout-next"
            >
              {i18n.NEXT}
            </EuiButton>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  )
);

TemplateFlyoutFooter.displayName = 'TemplateFlyoutFooter';
