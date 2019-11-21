/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';

import { DocumentTitle } from '../../../components/document_title';

export const StreamPageHeader = () => {
  return (
    <>
      <DocumentTitle
        title={(previousTitle: string) =>
          i18n.translate('xpack.infra.logs.streamPage.documentTitle', {
            defaultMessage: '{previousTitle} | Stream',
            values: {
              previousTitle,
            },
          })
        }
      />
    </>
  );
};
