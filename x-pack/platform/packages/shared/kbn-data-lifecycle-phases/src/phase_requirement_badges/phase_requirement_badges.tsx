/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface BaseRequirementBadgeProps {
  onClick?: () => void;
  'data-test-subj'?: string;
}

export const EnterpriseLicenseRequiredBadge = ({
  onClick,
  'data-test-subj': dataTestSubj = 'enterpriseLicenseRequiredBadge',
}: BaseRequirementBadgeProps) => {
  const label = i18n.translate('xpack.dataLifecyclePhases.requirements.enterpriseRequiredBadge', {
    defaultMessage: 'Enterprise required',
  });

  const onClickAriaLabel = i18n.translate(
    'xpack.dataLifecyclePhases.requirements.enterpriseRequiredBadge.onClickAriaLabel',
    { defaultMessage: 'Open enterprise license requirement modal' }
  );

  if (onClick) {
    return (
      <EuiBadge
        color="hollow"
        iconType="lock"
        data-test-subj={dataTestSubj}
        onClick={onClick}
        onClickAriaLabel={onClickAriaLabel}
      >
        {label}
      </EuiBadge>
    );
  }

  return (
    <EuiBadge color="hollow" iconType="lock" data-test-subj={dataTestSubj}>
      {label}
    </EuiBadge>
  );
};

export const DefaultRepositoryRequiredBadge = ({
  onClick,
  'data-test-subj': dataTestSubj = 'defaultRepositoryRequiredBadge',
}: BaseRequirementBadgeProps) => {
  const label = i18n.translate('xpack.dataLifecyclePhases.requirements.defaultRepositoryRequired', {
    defaultMessage: 'Default repository required',
  });

  const onClickAriaLabel = i18n.translate(
    'xpack.dataLifecyclePhases.requirements.defaultRepositoryRequired.onClickAriaLabel',
    { defaultMessage: 'Open default repository requirement modal' }
  );

  if (onClick) {
    return (
      <EuiBadge
        color="hollow"
        iconType="warning"
        data-test-subj={dataTestSubj}
        onClick={onClick}
        onClickAriaLabel={onClickAriaLabel}
      >
        {label}
      </EuiBadge>
    );
  }

  return (
    <EuiBadge color="hollow" iconType="warning" data-test-subj={dataTestSubj}>
      {label}
    </EuiBadge>
  );
};
