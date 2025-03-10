/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useServices } from '../app_context';

interface Props {
  data: any;
  children: React.ReactNode;
}

export const DataPlaceholder = ({ data, children }: Props) => {
  const { i18n } = useServices();

  if (data != null) {
    return children as any;
  }

  return (
    <>
      {i18n.translate('xpack.snapshotRestore.dataPlaceholderLabel', {
        defaultMessage: '-',
      })}
    </>
  );
};
