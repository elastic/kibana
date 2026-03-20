/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import React, { useState } from 'react';

import { i18n } from '@kbn/i18n';

import { SolutionViewSwitchModal } from './modal';
import { SOLUTION_VIEW_CONFIG, SOLUTION_VIEW_SWITCH_STORAGE_KEY_PREFIX } from '../constants';
import type {
  SolutionViewSwitchCalloutInternalProps,
  SolutionViewSwitchCalloutProps,
  SupportedSolutionView,
} from '../types';

export const SolutionViewSwitchCalloutInternal = ({
  spacesManager,
  getStartServices,
  currentSolution,
}: SolutionViewSwitchCalloutProps & SolutionViewSwitchCalloutInternalProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSwitch = async (selectedSolution: SupportedSolutionView) => {
    setIsLoading(true);
    const [{ notifications }] = await getStartServices();

    try {
      const activeSpace = await spacesManager.getActiveSpace();
      const spaceId = activeSpace.id;

      await spacesManager.updateSpace({
        ...activeSpace,
        solution: selectedSolution,
      });
      try {
        localStorage.setItem(`${SOLUTION_VIEW_SWITCH_STORAGE_KEY_PREFIX}:${spaceId}`, 'true');
      } catch {
        // Ignore storage errors
      }
      window.location.reload();
    } catch (error) {
      const message = error?.body?.message ?? error.toString();
      notifications.toasts.addError(error, {
        title: i18n.translate('xpack.spaces.solutionViewSwitch.errorSwitchingTitle', {
          defaultMessage: 'Error switching solution view: {message}',
          values: { message },
        }),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <strong>
              {i18n.translate('xpack.spaces.solutionViewSwitch.callout.title', {
                defaultMessage: '{solutionViewName} space',
                values: { solutionViewName: SOLUTION_VIEW_CONFIG[currentSolution].name },
              })}
            </strong>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiText size="s">
            {i18n.translate('xpack.spaces.solutionViewSwitch.callout.description', {
              defaultMessage: 'Use dedicated space to benefit from all new features.',
            })}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton size="s" fullWidth onClick={() => setIsModalOpen(true)}>
            {i18n.translate('xpack.spaces.solutionViewSwitch.callout.learnMoreButton', {
              defaultMessage: 'Learn more',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      {isModalOpen && (
        <SolutionViewSwitchModal
          currentSolution={currentSolution}
          onClose={() => setIsModalOpen(false)}
          onSwitch={handleSwitch}
          isLoading={isLoading}
        />
      )}
    </>
  );
};
