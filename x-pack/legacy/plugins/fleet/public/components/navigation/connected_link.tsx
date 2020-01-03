/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiLink } from '@elastic/eui';
import { Link, withRouter } from 'react-router-dom';

export function ConnectedLinkComponent({
  location,
  path,
  query,
  disabled,
  children,
  ...props
}: {
  location: any;
  path: string;
  disabled: boolean;
  query: any;
  [key: string]: any;
}) {
  if (disabled) {
    return <EuiLink aria-disabled="true" {...props} />;
  }

  // Shorthand for pathname
  const pathname = path || _.get(props.to, 'pathname') || location.pathname;

  return (
    <Link
      children={children}
      to={{ ...location, ...props.to, pathname, query }}
      className={`euiLink euiLink--primary ${props.className || ''}`}
    />
  );
}

export const ConnectedLink = withRouter<any, typeof ConnectedLinkComponent>(ConnectedLinkComponent);
