/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FocusEventHandler } from 'react';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { EuiLink } from '@elastic/eui';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';

/** The path of a boost rule's details page. */
export const getRuleDetailsPath = (name: string) => `/rules/${encodeURIComponent(name)}`;

/** The path of a boost profile's details page. */
export const getProfileDetailsPath = (name: string) => `/profiles/${encodeURIComponent(name)}`;

interface DetailsLinkProps {
  kind: 'rule' | 'profile';
  name: string;
  'data-test-subj'?: string;
  // A tooltip around the link opens when it's focused, and describes it.
  onFocus?: FocusEventHandler<HTMLAnchorElement>;
  onBlur?: FocusEventHandler<HTMLAnchorElement>;
  'aria-describedby'?: string;
}

/** A rule's or profile's name, linking to its details page. */
export const DetailsLink = ({ kind, name, ...rest }: DetailsLinkProps) => {
  const history = useHistory();
  const path = kind === 'rule' ? getRuleDetailsPath(name) : getProfileDetailsPath(name);
  return (
    <EuiLink {...reactRouterNavigate(history, path)} {...rest}>
      {name}
    </EuiLink>
  );
};
