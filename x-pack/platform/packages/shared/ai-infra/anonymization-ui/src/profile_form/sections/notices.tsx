/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiCallOut, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useProfileFormContext } from '../profile_form_context';

export const ProfileFormNotices = () => {
  const { submitError, hasConflict, conflictProfileId, onOpenConflictProfile } =
    useProfileFormContext();
  const showSubmitError = submitError && submitError.kind !== 'conflict' && !hasConflict;

  return (
    <>
      {showSubmitError && (
        <>
          <EuiCallOut
            announceOnMount
            color="danger"
            iconType="warning"
            size="s"
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
            size="s"
            title={i18n.translate('anonymizationUi.profiles.flyout.conflict.title', {
              defaultMessage: 'A profile already exists for this target',
            })}
          />
          {conflictProfileId && onOpenConflictProfile && (
            <>
              <EuiSpacer size="s" />
              <EuiButtonEmpty
                size="s"
                iconType="arrowRight"
                onClick={() => onOpenConflictProfile(conflictProfileId)}
                data-test-subj="anonymizationProfilesOpenConflictProfile"
              >
                {i18n.translate('anonymizationUi.profiles.flyout.conflict.openExisting', {
                  defaultMessage: 'Open existing profile',
                })}
              </EuiButtonEmpty>
            </>
          )}
          <EuiSpacer size="m" />
        </>
      )}
    </>
  );
};
