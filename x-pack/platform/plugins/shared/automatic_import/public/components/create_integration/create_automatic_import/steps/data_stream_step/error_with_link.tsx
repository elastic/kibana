/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiLink } from '@elastic/eui';
import type { ErrorMessageWithLink } from '../../../../../../common/api/generation_error';

interface ErrorMessageProps {
  error: string | null | ErrorMessageWithLink;
}

interface MessageLinkProps {
  link: string;
  linkText: string;
}

export const isErrorMessageWithLink = (
  error: string | ErrorMessageWithLink | null
): error is ErrorMessageWithLink => {
  return (
    (error as ErrorMessageWithLink).link !== undefined &&
    (error as ErrorMessageWithLink).linkText !== undefined &&
    (error as ErrorMessageWithLink).errorMessage !== undefined
  );
};

export const MessageLink = React.memo<MessageLinkProps>(({ link, linkText }) => {
  return (
    <EuiLink href={link} target="_blank">
      {linkText}
    </EuiLink>
  );
});
MessageLink.displayName = 'MessageLink';

export const ErrorMessage = React.memo<ErrorMessageProps>(({ error }) => {
  return (
    <>
      {isErrorMessageWithLink(error) ? (
        <FormattedMessage
          id="xpack.automaticImport.createIntegration.generateErrorWithLink"
          defaultMessage="{errorMessage} {link}"
          values={{
            errorMessage: error.errorMessage,
            link: <MessageLink link={error.link} linkText={error.linkText} />,
          }}
        />
      ) : typeof error === 'string' ? (
        <>{error}</>
      ) : null}
    </>
  );
});
ErrorMessage.displayName = 'ErrorMessage';
