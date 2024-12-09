/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiLink } from '@elastic/eui';
import { useMlLocator } from '../../../../contexts/kibana';
import { ML_PAGES } from '../../../../../../common/constants/locator';
import type { AnomalyDetectionQueryState } from '../../../../../../common/types/locator';
// @ts-ignore
import { JobGroup } from '../job_group';

interface JobIdLink {
  id: string;
}

interface GroupIdLink {
  groupId: string;
  children: string;
}

type AnomalyDetectionJobIdLinkProps = JobIdLink | GroupIdLink;

function isGroupIdLink(props: JobIdLink | GroupIdLink): props is GroupIdLink {
  return (props as GroupIdLink).groupId !== undefined;
}
export const AnomalyDetectionJobIdLink = (props: AnomalyDetectionJobIdLinkProps) => {
  const mlLocator = useMlLocator();
  const [href, setHref] = useState<string>('');

  useEffect(() => {
    let isCancelled = false;
    const generateLink = async () => {
      const pageState: AnomalyDetectionQueryState = {};
      if (isGroupIdLink(props)) {
        pageState.groupIds = [props.groupId];
      } else {
        pageState.jobId = props.id;
      }
      if (mlLocator) {
        const url = await mlLocator.getUrl({
          page: ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE,
          // TODO: Fix this any.
          pageState: pageState as any,
        });
        if (!isCancelled) {
          setHref(url);
        }
      }
    };
    generateLink();
    return () => {
      isCancelled = true;
    };
  }, [props, mlLocator]);

  if (isGroupIdLink(props)) {
    return (
      <EuiLink key={props.groupId} href={href}>
        <JobGroup name={props.groupId} />
      </EuiLink>
    );
  } else {
    return (
      <EuiLink
        key={props.id}
        href={href}
        css={{ overflow: 'hidden', textOverflow: 'ellipsis' }}
        title={props.id}
      >
        {props.id}
      </EuiLink>
    );
  }
};
