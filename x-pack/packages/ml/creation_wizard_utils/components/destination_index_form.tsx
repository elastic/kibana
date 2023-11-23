/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { EuiFieldText, EuiFormRow, EuiLink } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { UseJobIdAsDestIndexNameSwitch } from './use_job_id_as_dest_index_name_switch';

interface DestinationIndexFormProps {
  createIndexLink: string;
  destinationIndex: string;
  destinationIndexNameEmpty: boolean;
  destinationIndexNameExists: boolean;
  destinationIndexNameValid: boolean;
  destIndexSameAsId: boolean;
  indexNameExistsMessage: string;
  isJobCreated: boolean;
  onDestinationIndexChange: (d: string) => void;
  setDestIndexSameAsId: (d: boolean) => void;
}

export const DestinationIndexForm: FC<DestinationIndexFormProps> = ({
  createIndexLink,
  destinationIndex,
  destinationIndexNameEmpty,
  destinationIndexNameExists,
  destinationIndexNameValid,
  destIndexSameAsId,
  indexNameExistsMessage,
  isJobCreated,
  onDestinationIndexChange,
  setDestIndexSameAsId,
}) => (
  <>
    <EuiFormRow
      fullWidth
      helpText={destIndexSameAsId === true && destinationIndexNameExists && indexNameExistsMessage}
    >
      <UseJobIdAsDestIndexNameSwitch
        destIndexSameAsId={destIndexSameAsId}
        isJobCreated={isJobCreated}
        setDestIndexSameAsId={setDestIndexSameAsId}
      />
    </EuiFormRow>
    {destIndexSameAsId === false && (
      <EuiFormRow
        fullWidth
        label={i18n.translate('xpack.ml.dataframe.analytics.create.destinationIndexLabel', {
          defaultMessage: 'Destination index',
        })}
        isInvalid={
          destinationIndexNameEmpty || (!destinationIndexNameEmpty && !destinationIndexNameValid)
        }
        helpText={destinationIndexNameExists && indexNameExistsMessage}
        error={
          !destinationIndexNameEmpty &&
          !destinationIndexNameValid && [
            <>
              {i18n.translate('xpack.ml.dataframe.analytics.create.destinationIndexInvalidError', {
                defaultMessage: 'Invalid destination index name.',
              })}
              <br />
              <EuiLink href={createIndexLink} target="_blank">
                {i18n.translate(
                  'xpack.ml.dataframe.stepDetailsForm.destinationIndexInvalidErrorLink',
                  {
                    defaultMessage: 'Learn more about index name limitations.',
                  }
                )}
              </EuiLink>
            </>,
          ]
        }
      >
        <EuiFieldText
          fullWidth
          disabled={isJobCreated}
          placeholder="destination index"
          value={destinationIndex}
          // onChange={(e) => setFormState({ destinationIndex: e.target.value })}
          onChange={(e) => onDestinationIndexChange(e.target.value)}
          aria-label={i18n.translate(
            'xpack.ml.dataframe.analytics.create.destinationIndexInputAriaLabel',
            {
              defaultMessage: 'Choose a unique destination index name.',
            }
          )}
          isInvalid={!destinationIndexNameEmpty && !destinationIndexNameValid}
          data-test-subj="mlAnalyticsCreateJobFlyoutDestinationIndexInput"
        />
      </EuiFormRow>
    )}
  </>
);
