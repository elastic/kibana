/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { FALLBACK_OSQUERY_VERSION } from '../../common/constants';

interface OsquerySchemaLinkProps {
  osqueryVersion?: string;
}

export const OsquerySchemaLink = React.memo<OsquerySchemaLinkProps>(
  ({ osqueryVersion = FALLBACK_OSQUERY_VERSION }) => (
    <EuiText size="xs">
      <EuiLink
        href={`https://osquery.io/schema/${osqueryVersion}`}
        target="_blank"
        rel="noopener nofollow noreferrer"
      >
        <FormattedMessage
          id="xpack.osquery.osquerySchemaLinkLabel"
          defaultMessage="Osquery schema"
        />
      </EuiLink>
    </EuiText>
  )
);

OsquerySchemaLink.displayName = 'OsquerySchemaLink';
