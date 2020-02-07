/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink } from '@elastic/eui';
import { Link } from 'react-router-dom';
import React, { FunctionComponent } from 'react';

interface DetailPageLinkProps {
  /**
   * MonitorId to be used to redirect to detail page
   */
  monitorId: string;
  /**
   * Link parameters usually filter states
   */
  linkParameters: string | undefined;
}

export const MonitorPageLink: FunctionComponent<DetailPageLinkProps> = ({
  children,
  monitorId,
  linkParameters,
}) => {
  const getLocationTo = () => {
    // encode monitorId param as 64 base string to make it a valid URL, since it can be a url
    return linkParameters
      ? `/monitor/${btoa(monitorId)}/${linkParameters}`
      : `/monitor/${btoa(monitorId)}`;
  };
  return (
    <EuiLink>
      <Link data-test-subj={`monitor-page-link-${monitorId}`} to={getLocationTo()}>
        {children}
      </Link>
    </EuiLink>
  );
};
