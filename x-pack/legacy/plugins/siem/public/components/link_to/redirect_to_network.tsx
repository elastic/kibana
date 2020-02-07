/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { RouteComponentProps } from 'react-router-dom';

import { RedirectWrapper } from './redirect_wrapper';
import { SiemPageName } from '../../pages/home/types';
import { FlowTarget, FlowTargetSourceDest } from '../../graphql/types';

export type NetworkComponentProps = RouteComponentProps<{
  detailName?: string;
  flowTarget?: string;
  search: string;
}>;

export const RedirectToNetworkPage = ({
  match: {
    params: { detailName, flowTarget },
  },
  location: { search },
}: NetworkComponentProps) => (
  <RedirectWrapper
    to={
      detailName
        ? `/${SiemPageName.network}/ip/${detailName}/${flowTarget}${search}`
        : `/${SiemPageName.network}${search}`
    }
  />
);

const baseNetworkUrl = `#/link-to/${SiemPageName.network}`;
export const getNetworkUrl = () => baseNetworkUrl;
export const getIPDetailsUrl = (
  detailName: string,
  flowTarget?: FlowTarget | FlowTargetSourceDest
) => `${baseNetworkUrl}/ip/${detailName}/${flowTarget || FlowTarget.source}`;
