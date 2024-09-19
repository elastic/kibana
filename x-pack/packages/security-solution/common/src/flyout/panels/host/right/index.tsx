/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FlyoutPanelProps } from '@kbn/expandable-flyout';
import React from 'react';
import {
  FlyoutBody,
  FlyoutFooter,
  FlyoutHeader,
  FlyoutNavigation,
} from '../../../common/components';
// import { getEntityTableColumns } from './columns';
// import type { BasicEntityData, EntityTableRows } from './types';

export interface HostRightPanelParamProps extends Record<string, unknown> {
  hostName: string;
}

export interface HostRightPanelProps extends FlyoutPanelProps {
  key: 'host';
  params: HostRightPanelParamProps;
}

export const HostRightPanel = (props: HostRightPanelParamProps) => {
  return (
    <>
      <FlyoutNavigation flyoutIsExpandable={true} />
      <FlyoutHeader>{`Host Flyout Header - ${props.hostName}`}</FlyoutHeader>
      <FlyoutBody>{'Host Flyout'}</FlyoutBody>
      <FlyoutFooter>{'Host Flyout Footer'}</FlyoutFooter>
    </>
  );
};
