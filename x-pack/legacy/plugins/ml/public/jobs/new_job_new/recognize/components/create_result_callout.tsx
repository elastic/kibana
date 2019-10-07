/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, memo } from 'react';
import { EuiCallOut, EuiButton, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { SAVE_STATE } from '../page';

interface CreateResultCalloutProps {
  saveState: SAVE_STATE;
  resultsUrl: string;
  onReset: () => {};
}

export const CreateResultCallout: FC<CreateResultCalloutProps> = memo(
  ({ saveState, resultsUrl, onReset }) => {
    return (
      <>
        {saveState === SAVE_STATE.SAVED && (
          <EuiCallOut
            title={
              <FormattedMessage
                id="xpack.ml.newJob.simple.recognize.jobsCreatedTitle"
                defaultMessage="Jobs created"
              />
            }
            color="success"
            iconType="checkInCircleFilled"
          />
        )}
        {saveState === SAVE_STATE.FAILED && (
          <EuiCallOut
            title={
              <FormattedMessage
                id="xpack.ml.newJob.simple.recognize.jobsCreationFailed.saveFailedAriaLabel"
                defaultMessage="Save failed"
              />
            }
            color="danger"
            iconType="alert"
          >
            <EuiButton
              color="danger"
              aria-label={i18n.translate(
                'xpack.ml.newJi18n(ob.simple.recognize.jobsCreationFailed.resetButtonAriaLabel',
                { defaultMessage: 'Reset' }
              )}
              onClick={onReset}
            >
              <FormattedMessage
                id="xpack.ml.newJob.simple.recognize.jobsCreationFailed.resetButtonLabel"
                defaultMessage="Jobs creation failed"
              />
            </EuiButton>
          </EuiCallOut>
        )}
        {saveState === SAVE_STATE.PARTIAL_FAILURE && (
          <EuiCallOut
            title={
              <FormattedMessage
                id="xpack.ml.newJob.simple.recognize.someJobsCreationFailedTitle"
                defaultMessage="Some jobs failed to be created"
              />
            }
            color="warning"
            iconType="alert"
            aria-label={i18n.translate(
              'xpack.ml.newJob.simple.recognize.someJobsCreationFailed.saveFailedAriaLabel',
              { defaultMessage: 'Save failed' }
            )}
          >
            <EuiButton
              color="warning"
              aria-label={i18n.translate(
                'xpack.ml.newJi18n(ob.simple.recognize.jobsCreationFailed.resetButtonAriaLabel',
                { defaultMessage: 'Reset' }
              )}
              onClick={onReset}
            >
              <FormattedMessage
                id="xpack.ml.newJob.simple.recognize.someJobsCreationFailed.resetButtonLabel"
                defaultMessage="Reset"
              />
            </EuiButton>
            <EuiLink
              href={resultsUrl}
              aria-label={i18n.translate('xpack.ml.newJob.simple.recognize.viewResultsAriaLabel', {
                defaultMessage: 'View Results',
              })}
            >
              <FormattedMessage
                id="xpack.ml.newJob.simple.recognize.viewResultsLinkText"
                defaultMessage="View Results"
              />
            </EuiLink>
          </EuiCallOut>
        )}
      </>
    );
  }
);
