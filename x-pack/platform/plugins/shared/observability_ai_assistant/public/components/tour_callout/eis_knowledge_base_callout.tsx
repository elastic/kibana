/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement } from 'react';
import React from 'react';
import type { EuiTourStepProps } from '@elastic/eui';
import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TourCallout } from './tour_callout';
import { useKibana } from '../../hooks/use_kibana';

export const EisKnowledgeBaseCallout = ({
  children,
  isOpen = true,
  zIndex,
  anchorPosition = 'downCenter',
  dismissCallout,
}: {
  children: ReactElement;
  isOpen?: boolean;
  zIndex?: number;
  anchorPosition?: EuiTourStepProps['anchorPosition'];
  dismissCallout: () => void;
}) => {
  const { docLinks } = useKibana().services;

  return (
    <TourCallout
      title={i18n.translate('xpack.observabilityAiAssistant.eisKnowledgeBase.title', {
        defaultMessage: 'Elastic Inference Service (EIS) now available',
      })}
      content={i18n.translate('xpack.observabilityAiAssistant.eisKnowledgeBase.content', {
        defaultMessage:
          'AI Assistant Knowledge Base semantic search models that use the Elastic Inference Service (EIS) incur additional costs for tokens.',
      })}
      step={1}
      stepsTotal={1}
      anchorPosition={anchorPosition}
      isOpen={isOpen}
      hasArrow
      maxWidth={320}
      zIndex={zIndex}
      dismissTour={dismissCallout}
      footerAction={
        <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty size="s" color="text" onClick={dismissCallout}>
              {i18n.translate('xpack.observabilityAiAssistant.eisKnowledgeBase.dismissButton', {
                defaultMessage: 'Dismiss',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              href={docLinks?.links?.enterpriseSearch?.elasticInferenceServicePricing}
              target="_blank"
              iconType="popout"
              iconSide="right"
            >
              {i18n.translate('xpack.observabilityAiAssistant.eisKnowledgeBase.learnMoreButton', {
                defaultMessage: 'Learn more',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    >
      {children}
    </TourCallout>
  );
};
