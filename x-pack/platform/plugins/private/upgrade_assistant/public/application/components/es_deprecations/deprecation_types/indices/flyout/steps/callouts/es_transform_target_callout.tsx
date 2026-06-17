/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import React, { Fragment } from 'react';
import type { EnrichedDeprecationInfo } from '../../../../../../../../../common/types';

interface Props {
  deprecation: EnrichedDeprecationInfo;
}

/**
 * We get copy directly from ES. This contains information that applies to indices
 * that are read-only or not.
 */
export const ESTransformsTargetCallout = ({ deprecation }: Props) => {
  return (
    <Fragment>
      <EuiCallOut
        title={i18n.translate(
          'xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.esTransform.calloutTitle',
          { defaultMessage: 'Transforms detected' }
        )}
        data-test-subj="esTransformsGuidance"
      >
        {deprecation.details}
      </EuiCallOut>
      <EuiSpacer size="m" />
    </Fragment>
  );
};
