/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink, EuiSpacer } from '@elastic/eui';
import { KbnSuccessCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { useKibana } from '../../hooks/use_kibana';

interface AiIndexCreatedCalloutProps {
  onDismiss: () => void;
  showMemory: boolean;
}

export const AiIndexCreatedCallout = ({ onDismiss, showMemory }: AiIndexCreatedCalloutProps) => {
  const {
    services: { docLinks },
  } = useKibana();

  const documentationLink = (
    <EuiLink
      href={docLinks.links.contextEngine.overview}
      target="_blank"
      data-test-subj="contextAiIndexCreatedCalloutDocumentationLink"
    >
      <FormattedMessage
        id="xpack.contextEngine.aiIndexDetail.createdCallout.documentation"
        defaultMessage="Documentation"
      />
    </EuiLink>
  );

  return (
    <>
      <KbnSuccessCallout
        data-test-subj="contextAiIndexCreatedCallout"
        onDismiss={onDismiss}
        dismissButtonProps={{
          'aria-label': i18n.translate('xpack.contextEngine.aiIndexDetail.createdCallout.dismiss', {
            defaultMessage: 'Dismiss AI index created message',
          }),
        }}
        title={i18n.translate('xpack.contextEngine.aiIndexDetail.createdCallout.title', {
          defaultMessage: 'Your AI index is ready',
        })}
        text={
          showMemory ? (
            <FormattedMessage
              id="xpack.contextEngine.aiIndexDetail.createdCallout.body"
              defaultMessage="Add sources to build agent context from your data, or use it to store agent memory. Refer to {documentationLink} to learn more."
              values={{ documentationLink }}
            />
          ) : (
            <FormattedMessage
              id="xpack.contextEngine.aiIndexDetail.createdCallout.bodyWithoutMemory"
              defaultMessage="Add sources to build agent context from your data. Refer to {documentationLink} to learn more."
              values={{ documentationLink }}
            />
          )
        }
      />
      <EuiSpacer size="m" />
    </>
  );
};
