/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCode, EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

const readMore = i18n.translate(
  'xpack.datasetQuality.details.qualityIssue.failedDocs.erros.message.readMore',
  {
    defaultMessage: 'Read more',
  }
);

const readLess = i18n.translate(
  'xpack.datasetQuality.details.qualityIssue.failedDocs.erros.message.readLess',
  {
    defaultMessage: 'Read less',
  }
);

const MAX_CHAR_LENGTH = 200;

const readMoreMessageContent = (message: string) => {
  return `${message.slice(0, MAX_CHAR_LENGTH)}...`;
};

export const ErrorMessage = ({ errorMessage }: { errorMessage: string }) => {
  const showReadMoreOrLess = errorMessage.length > MAX_CHAR_LENGTH;
  const [message, setMessage] = React.useState(
    showReadMoreOrLess ? readMoreMessageContent(errorMessage) : errorMessage
  );

  const handleReadMore = () => {
    setMessage((prev) => {
      return prev.length === errorMessage.length
        ? readMoreMessageContent(errorMessage)
        : errorMessage;
    });
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiCode language="js" style={{ fontWeight: 'normal' }}>
        {message}
      </EuiCode>
      {showReadMoreOrLess && (
        <EuiCode>
          <button onClick={handleReadMore} style={{ fontWeight: 'bold' }}>
            {message.length === errorMessage.length ? readLess : readMore}
          </button>
        </EuiCode>
      )}
    </EuiFlexGroup>
  );
};
