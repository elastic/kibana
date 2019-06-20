/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { i18n } from '@kbn/i18n';

interface Props {
  data: any;
  children: React.ReactNode;
}

export const DataPlaceholder: React.FunctionComponent<Props> = ({ data, children }) => {
  if (data != null) {
    return <Fragment>{children}</Fragment>;
  }

  const label = i18n.translate('xpack.snapshotRestore.dataPlaceholderLabel', {
    defaultMessage: '-',
  });

  return <span>{label}</span>;
};
