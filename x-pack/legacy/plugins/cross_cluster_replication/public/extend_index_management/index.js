/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { extensionsService } from '../../../index_management/public';
import { get } from 'lodash';

const propertyPath = 'isFollowerIndex';
export const followerBadgeExtension = {
  matchIndex: index => {
    return get(index, propertyPath);
  },
  label: i18n.translate('xpack.crossClusterReplication.indexMgmtBadge.followerLabel', {
    defaultMessage: 'Follower',
  }),
  color: 'default',
  filterExpression: 'isFollowerIndex:true',
};

extensionsService.addBadge(followerBadgeExtension);
