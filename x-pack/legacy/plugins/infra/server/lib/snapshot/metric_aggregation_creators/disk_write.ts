/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraNodeType } from '../../../graphql/types';
import { rate } from './rate';

const FIELDS = {
  [InfraNodeType.host]: '',
  [InfraNodeType.pod]: '',
  [InfraNodeType.container]: '',
  [InfraNodeType.ec2]: 'aws.ec2.diskio.write.bytes',
};

export const diskWrite = (nodeType: InfraNodeType) => {
  return rate('diskWrite', FIELDS)(nodeType);
};
