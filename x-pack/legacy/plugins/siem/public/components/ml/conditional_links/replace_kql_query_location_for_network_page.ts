/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RisonValue, encode } from 'rison-node';
import { decodeRison, isRisonObject } from './rison_helpers';
import { CONSTANTS } from '../../url_state/constants';
import { NetworkType } from '../../../store/network/model';

export const replaceKqlQueryLocationForNetworkPage = (kqlQuery: string): string => {
  const value: RisonValue = decodeRison(kqlQuery);
  if (isRisonObject(value)) {
    value.queryLocation = CONSTANTS.networkPage;
    value.type = NetworkType.page;
    return encode(value);
  } else {
    return kqlQuery;
  }
};
