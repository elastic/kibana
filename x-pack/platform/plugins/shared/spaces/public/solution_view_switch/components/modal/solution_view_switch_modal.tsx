/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useState } from 'react';

import { i18n } from '@kbn/i18n';

import spaceSelectorImage from './assets/space_selector.png';
import { BenefitRow } from './benefit_row';
import { SolutionSelector } from './solution_selector';
import type { SolutionViewSwitchModalProps, SupportedSolutionView } from '../../types';

export const SolutionViewSwitchModal = ({
  onClose,
  onSwitch,
  currentSolution,
  isLoading,
}: SolutionViewSwitchModalProps) => {
  const [selectedSolution, setSelectedSolution] = useState<SupportedSolutionView>(currentSolution);
  const modalTitleId = useGeneratedHtmlId();

  return (
    <EuiModal onClose={onClose} aria-labelledby={modalTitleId}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          {i18n.translate('xpack.spaces.solutionViewSwitch.modal.title', {
            defaultMessage: 'Switch your space to dedicated solution view',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFlexGroup gutterSize="xl">
          <EuiFlexItem grow={1}>
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('xpack.spaces.solutionViewSwitch.modal.benefitsTitle', {
                  defaultMessage: 'Why switching?',
                })}
              </h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={3}>
            <EuiFlexGroup direction="column" gutterSize="s">
              <BenefitRow
                iconType="brush"
                text={i18n.translate('xpack.spaces.solutionViewSwitch.modal.benefitFocus', {
                  defaultMessage:
                    'Stay focused with a faster, fully customizable navigation that shows only what really matters.',
                })}
              />
              <BenefitRow
                iconType="popper"
                text={i18n.translate('xpack.spaces.solutionViewSwitch.modal.benefitNewFeatures', {
                  defaultMessage:
                    'Benefit from every new feature and improvement we make — they land in the new solution view first.',
                })}
              />
              <BenefitRow
                iconType="grid"
                text={i18n.translate(
                  'xpack.spaces.solutionViewSwitch.modal.benefitMultipleSpaces',
                  {
                    defaultMessage:
                      'Create as many spaces as you need for the same dataset, each tuned to a specific task.',
                  }
                )}
              />
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="l" />

        <EuiFlexGroup gutterSize="xl">
          <EuiFlexItem grow={1}>
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('xpack.spaces.solutionViewSwitch.modal.revertTitle', {
                  defaultMessage: "What if I don't like it?",
                })}
              </h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={3}>
            <EuiFlexGroup direction="column" gutterSize="m">
              <EuiText>
                {i18n.translate('xpack.spaces.solutionViewSwitch.modal.revertDescription', {
                  defaultMessage:
                    "You're never locked in — switch back anytime, create multiple spaces, and change any space type whenever you need.",
                })}
              </EuiText>
              <EuiImage
                src={spaceSelectorImage}
                alt={i18n.translate('xpack.spaces.solutionViewSwitch.modal.spaceSelectorImageAlt', {
                  defaultMessage: 'Space selector showing different space types',
                })}
                size="fullWidth"
              />
              <SolutionSelector
                selectedSolution={selectedSolution}
                onSolutionChange={setSelectedSolution}
              />
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButton
          isLoading={isLoading}
          onClick={() => onSwitch(selectedSolution)}
          fill
          iconType="merge"
        >
          {i18n.translate('xpack.spaces.solutionViewSwitch.modal.switchButton', {
            defaultMessage: 'Switch',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
