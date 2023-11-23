/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { EuiSwitch } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

interface UseJobIdAsDestIndexNameSwitchProps {
  destIndexSameAsId: boolean;
  isJobCreated: boolean;
  setDestIndexSameAsId: (d: boolean) => void;
}

export const UseJobIdAsDestIndexNameSwitch: FC<UseJobIdAsDestIndexNameSwitchProps> = ({
  destIndexSameAsId,
  isJobCreated,
  setDestIndexSameAsId,
}) => (
  <EuiSwitch
    disabled={isJobCreated}
    name="mlCreationWizardUtilsJobIdAsDestIndexName"
    label={i18n.translate('xpack.ml.creationWizardUtils.jobIdAsDestIndexNameLabel', {
      defaultMessage: 'Use job ID as destination index name',
    })}
    checked={destIndexSameAsId === true}
    onChange={() => setDestIndexSameAsId(!destIndexSameAsId)}
    data-test-subj="mlCreationWizardUtilsJobIdAsDestIndexNameSwitch"
  />
);
