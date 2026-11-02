/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBanner, EuiImage } from '@elastic/eui';
import { useKibana } from '../../../common/lib/kibana';
import illustrationRelevance from '../../../assets/illustration-relevance-hand-touch-128.svg';
import * as i18n from '../translations';
import { START_TOUR } from '../tour/translations';

interface Props {
  /** When provided, renders a "Start tour" button that launches the templates guided tour. */
  onStartTour?: () => void;
  /** When provided, renders a dismiss button that hides the panel. */
  onDismiss?: () => void;
}

const TemplatesInfoPanelComponent: React.FC<Props> = ({ onStartTour, onDismiss }) => {
  const { docLinks } = useKibana().services;

  const learnMoreAction = {
    children: i18n.LEARN_MORE,
    href: docLinks.links.cases.manageCaseTemplates,
    target: '_blank' as const,
    iconType: 'external' as const,
    iconSide: 'right' as const,
  };

  return (
    <EuiBanner
      data-test-subj="templates-info-panel"
      title={i18n.TEMPLATES_INFO_TITLE}
      headingElement="h4"
      text={i18n.TEMPLATES_INFO_DESCRIPTION}
      media={
        <EuiImage
          src={illustrationRelevance}
          alt=""
          data-test-subj="templates-info-panel-illustration"
        />
      }
      onDismiss={onDismiss}
      dismissButtonProps={{
        'aria-label': i18n.TEMPLATES_INFO_PANEL_DISMISS,
      }}
      actionProps={
        onStartTour
          ? {
              primary: {
                children: START_TOUR,
                onClick: onStartTour,
              },
              secondary: learnMoreAction,
            }
          : {
              primary: learnMoreAction,
            }
      }
    />
  );
};

TemplatesInfoPanelComponent.displayName = 'TemplatesInfoPanelComponent';

export const TemplatesInfoPanel = React.memo(TemplatesInfoPanelComponent);
