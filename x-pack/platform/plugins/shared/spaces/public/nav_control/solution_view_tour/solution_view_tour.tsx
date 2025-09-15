/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiButtonEmpty, EuiLink, EuiText, EuiTourStep } from '@elastic/eui';
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
    defaultMessage: 'Security',
  }),
  oblt: i18n.translate('xpack.spaces.navControl.tour.obltSolution', {
    defaultMessage: 'Observability',
  }),
  chat: i18n.translate('xpack.spaces.navControl.tour.chatSolution', {
    defaultMessage: 'Workchat',
  }),
};

interface Props extends PropsWithChildren<{}> {
  solution?: SolutionView;
  isTourOpen: boolean;
  onFinishTour: () => void;
  manageSpacesDocsLink: string;
  manageSpacesLink: string;
}

export const SolutionViewTour: FC<Props> = ({
  children,
  solution,
  isTourOpen,
  onFinishTour,
  manageSpacesLink,
  manageSpacesDocsLink,
}) => {
  const solutionLabel = solution && solution !== SOLUTION_VIEW_CLASSIC ? solutionMap[solution] : '';
  if (!solutionLabel) {
    return children;
  }

  return (
    <EuiTourStep
      content={
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.spaces.navControl.tour.content"
              defaultMessage="Only {solution} features are visible. To access other solution features, you can change this from your {spacesLink}.{br}{learnMore}"
              values={{
                solution: solutionLabel,
                spacesLink: (
                  <EuiLink href={manageSpacesLink} target="_blank" external>
                    {i18n.translate('xpack.spaces.navControl.tour.spaceSettingsLink', {
                      defaultMessage: 'spaces settings',
                    })}
                  </EuiLink>
                ),
                learnMore: (
                  <EuiLink href={manageSpacesDocsLink} target="_blank" external>
                    {i18n.translate('xpack.spaces.navControl.tour.learnMore', {
                      defaultMessage: 'Learn more',
                    })}
                  </EuiLink>
                ),
                br: <br />,
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
      stepsTotal={4}
      repositionOnScroll
      title={i18n.translate('xpack.spaces.navControl.tour.title', {
        defaultMessage: 'This space uses the {solution} solution view',
        values: { solution: solutionLabel },
      })}
      anchorPosition="downCenter"
      footerAction={[
        <EuiButtonEmpty size="s" color="text" onClick={onFinishTour} data-test-subj="closeTourBtn">
          {i18n.translate('xpack.spaces.navControl.tour.closeBtn', {
            defaultMessage: 'Skip tour',
          })}
        </EuiButtonEmpty>,
        <EuiButton size="s" color="success" onClick={onFinishTour} data-test-subj="nextTourBtn">
          {i18n.translate('xpack.spaces.navControl.tour.nextBtn', {
            defaultMessage: 'Next',
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
