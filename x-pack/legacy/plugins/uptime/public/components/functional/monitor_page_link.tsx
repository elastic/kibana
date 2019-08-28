/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink } from '@elastic/eui';
import { Link } from 'react-router-dom';
import React, { FunctionComponent } from 'react';

interface DetailPageLinkProps {
  id: string;
  location: string | undefined;
  linkParameters: string | undefined;
}

export const MonitorPageLink: FunctionComponent<DetailPageLinkProps> = ({
  children,
  id,
  location,
  linkParameters,
}) => (
  <EuiLink>
    <Link
      data-test-subj={`monitor-page-link-${id}`}
      to={
        // encode monitorid param as 64 base string to make it a valid URL, since it can be a url
        location === undefined
          ? `/monitor/${btoa(id)}${linkParameters}`
          : `/monitor/${btoa(id)}/${encodeURI(location)}/${linkParameters}`
      }
    >
      {children}
    </Link>
  </EuiLink>
);
