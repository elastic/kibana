/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { EuiBreadcrumbs } from '@elastic/eui';
import React from 'react';
import { MainRouteParams } from '../../common/types';
import { encodeRevisionString } from '../../../common/uri_util';

interface Props {
  routeParams: MainRouteParams;
}
export class Breadcrumb extends React.PureComponent<Props> {
  public render() {
    const { resource, org, repo, revision, path } = this.props.routeParams;
    const repoUri = `${resource}/${org}/${repo}`;

    const breadcrumbs: Array<{
      text: string;
      href: string;
      className?: string;
      ['data-test-subj']: string;
    }> = [];
    const pathSegments = path ? path.split('/') : [];

    pathSegments.forEach((p, index, array) => {
      const paths = pathSegments.slice(0, index + 1);
      const href = `#${repoUri}/tree/${encodeRevisionString(revision)}/${paths.join('/')}`;
      const breadcrumb = {
        text: p,
        href,
        className: 'codeNoMinWidth',
        ['data-test-subj']: `codeFileBreadcrumb-${p}`,
      };
      if (index === array.length - 1) {
        delete breadcrumb.href;
      }
      breadcrumbs.push(breadcrumb);
    });
    return <EuiBreadcrumbs max={Number.MAX_VALUE} breadcrumbs={breadcrumbs} />;
  }
}
