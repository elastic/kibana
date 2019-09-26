/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiIcon } from '@elastic/eui';
import { REPOSITORY_TYPES } from '../../../common/constants';
import { RepositoryType } from '../../../common/types';

interface Props {
  type: RepositoryType;
  [key: string]: any;
}

export const RepositoryTypeLogo: React.SFC<Props> = ({ type, ...rest }) => {
  const typeLogoMap: { [key: string]: any } = {
    [REPOSITORY_TYPES.fs]: 'storage',
    [REPOSITORY_TYPES.url]: 'eye',
    [REPOSITORY_TYPES.azure]: 'logoAzure',
    [REPOSITORY_TYPES.gcs]: 'logoGCP',
    [REPOSITORY_TYPES.hdfs]: 'logoApache',
    [REPOSITORY_TYPES.s3]: 'logoAWS',
  };

  return <EuiIcon type={typeLogoMap[type] || 'folderOpen'} {...rest} />;
};
