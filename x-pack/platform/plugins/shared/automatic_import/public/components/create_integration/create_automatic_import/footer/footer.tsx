/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React, { useMemo } from 'react';
import { ButtonsFooter } from '../../../../common/components/buttons_footer';
import { type State } from '../state';
import * as i18n from './translations';

// Generation button for Step 3
const AnalyzeButtonText = React.memo<{ isGenerating: boolean }>(({ isGenerating }) => {
  if (!isGenerating) {
    return <>{i18n.ANALYZE_LOGS}</>;
  }
  return (
    <>
      <EuiLoadingSpinner size="s" data-test-subj="generatingLoader" />
      {i18n.LOADING}
    </>
  );
});
AnalyzeButtonText.displayName = 'AnalyzeButtonText';

interface FooterProps {
  isGenerating?: State['isGenerating'];
  isAnalyzeStep?: boolean;
  isLastStep?: boolean;
  isNextStepEnabled?: boolean;
  isNextAddingToElastic?: boolean;
  onBack?: () => void;
  onNext?: () => void;
}

export const Footer = React.memo<FooterProps>(
  ({
    isGenerating = false,
    isAnalyzeStep = false,
    isLastStep = false,
    isNextStepEnabled = false,
    isNextAddingToElastic = false,
    onBack = () => {},
    onNext = () => {},
  }) => {
    const nextButtonText = useMemo(
      () =>
        isNextAddingToElastic ? (
          i18n.ADD_TO_ELASTIC
        ) : isAnalyzeStep ? (
          <AnalyzeButtonText isGenerating={isGenerating} />
        ) : null,
      [isNextAddingToElastic, isAnalyzeStep, isGenerating]
    );

    return isLastStep ? (
      <ButtonsFooter cancelButtonText={i18n.CLOSE} />
    ) : (
      <ButtonsFooter
        nextButtonText={nextButtonText}
        isNextDisabled={!isNextStepEnabled}
        onBack={onBack}
        onNext={onNext}
      />
    );
  }
);
Footer.displayName = 'Footer';
