/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { RequestError } from '../../../../../types';

interface Props {
  saveError: RequestError;
}
export const SaveError: React.FC<Props> = ({ saveError }) => {
  const { message, cause } = saveError;
  const renderErrorBody = () => {
    if (!cause || !Array.isArray(cause)) return null;
    return cause.length === 1 ? (
      <p>{cause[0]}</p>
    ) : (
      <ul>
        {cause.map((causeValue, index) => (
          <li key={index}>{causeValue}</li>
        ))}
      </ul>
    );
  };

  return (
    <>
      <EuiCallOut title={message} color="danger" iconType="error" data-test-subj="saveErrorBanner">
        {renderErrorBody()}
      </EuiCallOut>
      <EuiSpacer />
    </>
  );
};
