/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import type { FC } from 'react';
import React from 'react';
import { useFileUploadContext } from '../../use_file_upload';

export const ImportErrors: FC = () => {
  const { uploadStatus } = useFileUploadContext();
  return (
    <>
      <EuiSpacer />
      {uploadStatus.errors.map((error, index) => (
        <React.Fragment key={index}>
          <EuiSpacer size="m" />
          <EuiCallOut title={error.title} color="danger" iconType="alert">
            <p>{JSON.stringify(error)}</p>
          </EuiCallOut>
        </React.Fragment>
      ))}
    </>
  );
};
