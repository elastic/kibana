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
  EuiLink,
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
import { FormattedMessage } from '@kbn/i18n-react';

import { BenefitRow } from './benefit_row';
import { SolutionSelector } from './solution_selector';
import { SOLUTION_VIEW_CONFIG } from '../../constants';
import type { SolutionViewSwitchModalProps, SupportedSolutionView } from '../../types';

export const SolutionViewSwitchModal = ({
  onClose,
  onSwitch,
  currentSolution,
  isLoading,
  manageSpacesUrl,
}: SolutionViewSwitchModalProps) => {
  const [selectedSolution, setSelectedSolution] = useState<SupportedSolutionView>(currentSolution);
  const modalTitleId = useGeneratedHtmlId();

  return (
    <EuiModal onClose={onClose} aria-labelledby={modalTitleId}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          {i18n.translate('xpack.spaces.solutionViewSwitch.modal.title', {
            defaultMessage: 'Get the new {solutionName} navigation',
            values: { solutionName: SOLUTION_VIEW_CONFIG[selectedSolution].name },
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFlexGroup gutterSize="xl">
          <EuiFlexItem grow={1}>
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('xpack.spaces.solutionViewSwitch.modal.benefitsTitle', {
                  defaultMessage: 'What changes',
                })}
              </h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={3}>
            <EuiFlexGroup direction="column" gutterSize="s">
              <BenefitRow
                iconType="brush"
                text={
                  <FormattedMessage
                    id="xpack.spaces.solutionViewSwitch.modal.benefitFocus"
                    defaultMessage="<strong>Focused left navigation</strong>. Only the tools you need for {solutionName}, with no clutter from other solutions."
                    values={{
                      strong: (...chunks: React.ReactNode[]) => <strong>{chunks}</strong>,
                      solutionName: SOLUTION_VIEW_CONFIG[selectedSolution].name,
                    }}
                  />
                }
              />
              <BenefitRow
                iconType="popper"
                text={
                  <FormattedMessage
                    id="xpack.spaces.solutionViewSwitch.modal.benefitClicks"
                    defaultMessage="<strong>Fewer clicks</strong>. Hover to expand menus and navigate between items without extra clicks."
                    values={{
                      strong: (...chunks: React.ReactNode[]) => <strong>{chunks}</strong>,
                    }}
                  />
                }
              />
              <BenefitRow
                iconType="grid"
                text={
                  <FormattedMessage
                    id="xpack.spaces.solutionViewSwitch.modal.benefitSpace"
                    defaultMessage="<strong>More room for your work</strong>. A narrower navigation bar gives more space to the content that matters."
                    values={{
                      strong: (...chunks: React.ReactNode[]) => <strong>{chunks}</strong>,
                    }}
                  />
                }
              />
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="l" />

        <EuiFlexGroup gutterSize="xl">
          <EuiFlexItem grow={1}>
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('xpack.spaces.solutionViewSwitch.modal.usersTitle', {
                  defaultMessage: 'Affects all users',
                })}
              </h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={3}>
            <EuiText>
              <FormattedMessage
                id="xpack.spaces.solutionViewSwitch.modal.currentSpaceOnly"
                defaultMessage="This only affects the current space you're in. Switching will change the navigation for all users in this space."
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="l" />

        <EuiFlexGroup gutterSize="xl">
          <EuiFlexItem grow={1}>
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('xpack.spaces.solutionViewSwitch.modal.revertTitle', {
                  defaultMessage: 'Fully reversible',
                })}
              </h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={3}>
            <EuiFlexGroup direction="column" gutterSize="m">
              <EuiText>
                <FormattedMessage
                  id="xpack.spaces.solutionViewSwitch.modal.revertDescription"
                  defaultMessage="You can switch back anytime in <manageSpacesLink>Manage spaces</manageSpacesLink>."
                  values={{
                    manageSpacesLink: (...chunks: React.ReactNode[]) => (
                      <EuiLink href={manageSpacesUrl} target="_blank">
                        {chunks}
                      </EuiLink>
                    ),
                  }}
                />
              </EuiText>
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
          data-test-subj="solutionViewSwitchModalSwitchButton"
          isLoading={isLoading}
          onClick={() => onSwitch(selectedSolution)}
          fill
          iconType="merge"
        >
          {i18n.translate('xpack.spaces.solutionViewSwitch.modal.switchButton', {
            defaultMessage: 'Switch now',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
