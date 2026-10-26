/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { RequestError } from '../../../../../types';

interface Props {
  saveError: RequestError;
}
export const SaveError: React.FC<Props> = ({ saveError }) => {
  const { message, cause } = saveError;
  const text = cause?.length === 1 ? cause[0] : undefined;

  const renderErrorBody = () => {
    if (!cause || !Array.isArray(cause)) return null;
    return cause.length > 1 ? (
      <ul>
        {cause.map((causeValue, index) => (
          <li key={index}>{causeValue}</li>
        ))}
      </ul>
    ) : null;
  };

  return (
    <>
      <KbnDangerCallout title={message} text={text} data-test-subj="saveErrorBanner">
        {renderErrorBody()}
      </KbnDangerCallout>
      <EuiSpacer />
    </>
  );
};
