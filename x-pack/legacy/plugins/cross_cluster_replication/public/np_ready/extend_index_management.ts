/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import { IndexMgmtSetup } from '../../../../../plugins/index_management/public';

const propertyPath = 'isFollowerIndex';

const followerBadgeExtension = {
  matchIndex: (index: any) => {
    return get(index, propertyPath);
  },
  label: i18n.translate('xpack.crossClusterReplication.indexMgmtBadge.followerLabel', {
    defaultMessage: 'Follower',
  }),
  color: 'default',
  filterExpression: 'isFollowerIndex:true',
};

export const extendIndexManagement = (indexManagement?: IndexMgmtSetup) => {
  if (indexManagement) {
    indexManagement.extensionsService.addBadge(followerBadgeExtension);
  }
};
