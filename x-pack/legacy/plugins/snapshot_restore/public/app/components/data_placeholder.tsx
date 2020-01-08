/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { useAppDependencies } from '../index';

interface Props {
  data: any;
  children: React.ReactNode;
}

export const DataPlaceholder: React.FC<Props> = ({ data, children }) => {
  const {
    core: { i18n },
  } = useAppDependencies();

  if (data != null) {
    return children;
  }

  return i18n.translate('xpack.snapshotRestore.dataPlaceholderLabel', {
    defaultMessage: '-',
  });
};
