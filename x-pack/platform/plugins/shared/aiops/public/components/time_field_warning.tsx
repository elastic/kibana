/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export const TimeFieldWarning = () => {
  return (
    <>
      <EuiCallOut
        size="s"
        title={i18n.translate('xpack.aiops.embeddableMenu.timeFieldWarning.title', {
          defaultMessage: 'The selected data view does not contain a time field.',
        })}
        color="warning"
        iconType="warning"
      >
        <p>
          {i18n.translate('xpack.aiops.embeddableMenu.timeFieldWarning.title.description', {
            defaultMessage: 'The analysis can only be run on data views with a time field.',
          })}
        </p>
      </EuiCallOut>
      <EuiSpacer />
    </>
  );
};
