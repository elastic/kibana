/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBanner, EuiSpacer } from '@elastic/eui';
import { CaseManagementIllustration } from './case_management_illustration';
import * as i18n from './translations';

interface Props {
  onStartTour: () => void;
  onDismiss: () => void;
}

/**
 * A dismissible "what's new" banner shown at the top of the redesigned cases list. Introduces
 * the redesign and offers a guided tour. Modeled on the Attacks page welcome callout.
 */
export const CasesListWelcomeBanner: React.FC<Props> = ({ onStartTour, onDismiss }) => {
  return (
    <>
      <EuiBanner
        data-test-subj="cases-list-welcome-banner"
        title={i18n.BANNER_TITLE}
        text={i18n.BANNER_DESCRIPTION}
        media={<CaseManagementIllustration alt={i18n.BANNER_ILLUSTRATION_ALT} />}
        actionProps={{
          primary: {
            children: i18n.BANNER_START_TOUR,
            onClick: onStartTour,
          },
        }}
        onDismiss={onDismiss}
        dismissButtonProps={{
          'aria-label': i18n.BANNER_DISMISS,
        }}
      />
      <EuiSpacer size="l" />
    </>
  );
};
CasesListWelcomeBanner.displayName = 'CasesListWelcomeBanner';
