/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * WHY ARE THE LAYOUTS A SEPERATE FILE?
 *
 * Files with React can not be included on the server without
 * crashing due to the requirement of the `window` object.
 */

import { i18n } from '@kbn/i18n';

import { ReactNode, FunctionComponent } from 'react';
import { Layout as HostLayout } from './host/layout';
import { Layout as PodLayout } from './pod/layout';
import { Layout as ContainerLayout } from './container/layout';
import { Layout as AwsEC2Layout } from './aws_ec2/layout';
import { Layout as AwsS3Layout } from './aws_s3/layout';
import { Layout as AwsRDSLayout } from './aws_rds/layout';
import { Layout as AwsSQSLayout } from './aws_sqs/layout';
import { InventoryItemType } from './types';
import { LayoutProps } from '../../public/pages/metrics/types';

interface Layouts {
  [type: string]: ReactNode;
}

const layouts: Layouts = {
  host: HostLayout,
  pod: PodLayout,
  container: ContainerLayout,
  awsEC2: AwsEC2Layout,
  awsS3: AwsS3Layout,
  awsRDS: AwsRDSLayout,
  awsSQS: AwsSQSLayout,
};

export const findLayout = (type: InventoryItemType) => {
  const Layout = layouts?.[type];
  if (!Layout) {
    throw new Error(
      i18n.translate('xpack.infra.inventoryModels.findLayout.error', {
        defaultMessage: "The layout you've attempted to find does not exist",
      })
    );
  }
  return Layout as FunctionComponent<LayoutProps>;
};
