/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiButtonEmpty, EuiText, EuiTourStep } from '@elastic/eui';
import React from 'react';
import type { FC, PropsWithChildren } from 'react';

import type { SolutionId } from '@kbn/core-chrome-browser';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { SolutionView } from '../../../common';
import { SOLUTION_VIEW_CLASSIC } from '../../../common/constants';

const solutionMap: Record<SolutionId, string> = {
  es: i18n.translate('xpack.spaces.navControl.tour.esSolution', {
    defaultMessage: 'Elasticsearch',
  }),
  security: i18n.translate('xpack.spaces.navControl.tour.securitySolution', {
    defaultMessage: 'Elastic Security',
  }),
  oblt: i18n.translate('xpack.spaces.navControl.tour.obltSolution', {
    defaultMessage: 'Elastic Observability',
  }),
  workplaceai: i18n.translate('xpack.spaces.navControl.tour.workplaceAiSolution', {
    defaultMessage: 'Elastic Workplace AI',
  }),
};

interface Props extends PropsWithChildren<{}> {
  solution?: SolutionView;
  isTourOpen: boolean;
  onFinishTour: () => void;
  manageSpacesDocsLink: string;
  manageSpacesLink: string;
  navigateToUrl: (url: string) => void;
}

export const SolutionViewTour: FC<Props> = ({
  children,
  solution,
  isTourOpen,
  onFinishTour,
  manageSpacesLink,
  manageSpacesDocsLink,
  navigateToUrl,
}) => {
  const solutionLabel = solution && solution !== SOLUTION_VIEW_CLASSIC ? solutionMap[solution] : '';
  if (!solutionLabel) {
    return children;
  }

  const handleSpaceSettingsClick = () => {
    onFinishTour();
    navigateToUrl(manageSpacesLink);
  };

  return (
    <EuiTourStep
      content={
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.spaces.navControl.tour.content"
              defaultMessage="Only {solution} features are visible. To access features from other solutions, edit your Space settings to select a Solution view."
              values={{
                solution: solutionLabel,
              }}
            />
          </p>
        </EuiText>
      }
      isStepOpen={isTourOpen}
      minWidth={300}
      maxWidth={360}
      onFinish={onFinishTour}
      step={1}
      stepsTotal={1}
      repositionOnScroll
      title={i18n.translate('xpack.spaces.navControl.tour.title', {
        defaultMessage: 'This space uses the {solution} Solution view',
        values: { solution: solutionLabel },
      })}
      anchorPosition="downCenter"
      footerAction={[
        <EuiButtonEmpty size="s" color="text" onClick={onFinishTour} data-test-subj="closeTourBtn">
          {i18n.translate('xpack.spaces.navControl.tour.closeBtn', {
            defaultMessage: 'Close',
          })}
        </EuiButtonEmpty>,
        <EuiButton
          size="s"
          color="text"
          onClick={handleSpaceSettingsClick}
          data-test-subj="spaceSettingsTourBtn"
        >
          {i18n.translate('xpack.spaces.navControl.tour.spaceSettingsBtn', {
            defaultMessage: 'Space settings',
          })}
        </EuiButton>,
      ]}
      panelProps={{
        'data-test-subj': 'spaceSolutionTour',
      }}
    >
      <>{children}</>
    </EuiTourStep>
  );
};
