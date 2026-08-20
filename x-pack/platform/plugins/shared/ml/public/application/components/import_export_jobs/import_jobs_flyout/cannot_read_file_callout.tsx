/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { EuiSpacer } from '@elastic/eui';
import { KbnWarningCallout } from '@kbn/ui-callout';

export const CannotReadFileCallout: FC = () => {
  return (
    <>
      <EuiSpacer size="l" />
      <KbnWarningCallout
        title={i18n.translate('xpack.ml.importExport.importFlyout.cannotReadFileCallout.title', {
          defaultMessage: 'File cannot be read',
        })}
        data-test-subj="mlJobMgmtImportJobsFileReadErrorCallout"
        text={
          <FormattedMessage
            id="xpack.ml.importExport.importFlyout.cannotReadFileCallout.body"
            defaultMessage="Please select a file containing Machine Learning jobs which have been exported from Kibana using the Export Jobs option"
          />
        }
      />
    </>
  );
};
