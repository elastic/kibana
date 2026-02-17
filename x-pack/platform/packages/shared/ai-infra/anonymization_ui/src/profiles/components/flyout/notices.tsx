/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useProfileFlyoutContext } from './context';

export const ProfileFlyoutNotices = () => {
  const { submitError, hasConflict } = useProfileFlyoutContext();

  return (
    <>
      {submitError && (
        <>
          <EuiCallOut
            announceOnMount
            color="danger"
            iconType="warning"
            title={submitError.message}
            data-test-subj="anonymizationProfilesFormError"
          />
          <EuiSpacer size="m" />
        </>
      )}
      {hasConflict && (
        <>
          <EuiCallOut
            announceOnMount
            color="warning"
            iconType="warning"
            title={i18n.translate('anonymizationUi.profiles.flyout.conflict.title', {
              defaultMessage: 'A profile already exists for this target',
            })}
          />
          <EuiSpacer size="m" />
        </>
      )}
    </>
  );
};
