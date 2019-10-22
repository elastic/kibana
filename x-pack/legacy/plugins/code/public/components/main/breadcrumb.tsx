/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBreadcrumbs, Breadcrumb as EuiBreadcrumb } from '@elastic/eui';
import React from 'react';
import { MainRouteParams } from '../../common/types';
import { encodeRevisionString } from '../../../common/uri_util';
import { trackCodeUiMetric, METRIC_TYPE } from '../../services/ui_metric';
import { CodeUIUsageMetrics } from '../../../model/usage_telemetry_metrics';

interface Props {
  routeParams: MainRouteParams;
}
export class Breadcrumb extends React.PureComponent<Props> {
  public render() {
    const { resource, org, repo, revision, path } = this.props.routeParams;
    const repoUri = `${resource}/${org}/${repo}`;

    const breadcrumbs: EuiBreadcrumb[] = [];
    const pathSegments = path ? path.split('/') : [];

    pathSegments.forEach((p, index, array) => {
      const paths = pathSegments.slice(0, index + 1);
      const href = `#${repoUri}/tree/${encodeRevisionString(revision)}/${paths.join('/')}`;
      const breadcrumb = {
        text: p,
        href,
        ['data-test-subj']: `codeFileBreadcrumb-${p}`,
        onClick: () => {
          // track breadcrumb click count
          trackCodeUiMetric(METRIC_TYPE.COUNT, CodeUIUsageMetrics.BREADCRUMB_CLICK_COUNT);
        },
      };
      if (index === array.length - 1) {
        delete breadcrumb.href;
      }
      breadcrumbs.push(breadcrumb);
    });
    return (
      <EuiBreadcrumbs
        max={3}
        showMaxPopover
        breadcrumbs={breadcrumbs}
        className="codeBreadcrumbs"
      />
    );
  }
}
