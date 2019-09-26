/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiBadge /* , EuiLink*/ } from '@elastic/eui';
import React from 'react';
// import { DIFF } from '../routes';

interface Props {
  repoUri: string;
  commit: string;
  children?: any;
}

export const CommitLink = ({ repoUri, commit, children }: Props) => {
  // const href = DIFF.replace(':resource/:org/:repo', repoUri).replace(':commitId', commit);
  return (
    // <EuiLink href={`#${href}`}>
    <EuiBadge color="hollow">{children || commit}</EuiBadge>
    // </EuiLink>
  );
};
