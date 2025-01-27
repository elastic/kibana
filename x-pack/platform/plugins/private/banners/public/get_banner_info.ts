/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from '@kbn/core/public';
import { BannerInfoResponse } from '../common';

export const getBannerInfo = async (http: HttpStart): Promise<BannerInfoResponse> => {
  return await http.get<BannerInfoResponse>('/api/banners/info');
};
