/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElementTarget } from '@elastic/eui';
import { EuiButton, EuiButtonEmpty, EuiText, EuiTourStep } from '@elastic/eui';
import React from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { SupportedSolutionView } from '../../solution_view_switch';
import { SOLUTION_VIEW_CONFIG } from '../../solution_view_switch';

export interface SolutionViewSwitchTourComponentProps {
  anchor: ElementTarget;
  solution: SupportedSolutionView;
  isOpen: boolean;
  onFinish: () => void;
  onClickSpaceSettings: () => void;
}

export const SolutionViewSwitchTourComponent = ({
  anchor,
  solution,
  isOpen,
  onFinish,
  onClickSpaceSettings,
}: SolutionViewSwitchTourComponentProps) => {
  return (
    <EuiTourStep
      anchor={anchor}
      isStepOpen={isOpen}
      step={1}
      stepsTotal={1}
      onFinish={onFinish}
      title={i18n.translate('xpack.spaces.navControl.solutionViewSwitchTour.title', {
        defaultMessage: 'New {solution} navigation',
        values: { solution: SOLUTION_VIEW_CONFIG[solution].name },
      })}
      content={
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.spaces.navControl.solutionViewSwitchTour.content"
              defaultMessage="You can switch back anytime, create multiple spaces, and change any space type whenever you need."
            />
          </p>
        </EuiText>
      }
      minWidth={240}
      maxWidth={320}
      footerAction={[
        <EuiButtonEmpty
          key="close"
          size="s"
          color="text"
          onClick={onFinish}
          data-test-subj="solutionViewSwitchTourDismissButton"
        >
          {i18n.translate('xpack.spaces.navControl.solutionViewSwitchTour.closeBtn', {
            defaultMessage: 'Close',
          })}
        </EuiButtonEmpty>,
        <EuiButton
          data-test-subj="solutionViewSwitchTourSpaceSettingsButton"
          key="spaceSettings"
          size="s"
          color="text"
          onClick={onClickSpaceSettings}
        >
          {i18n.translate('xpack.spaces.navControl.solutionViewSwitchTour.spaceSettingsBtn', {
            defaultMessage: 'Space settings',
          })}
        </EuiButton>,
      ]}
      panelProps={{
        'data-test-subj': 'solutionViewSwitchTour',
      }}
    />
  );
};
