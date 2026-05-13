/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { HttpStart } from '@kbn/core-http-browser';
import type { UserProfileService } from '@kbn/core-user-profile-browser';

export interface AlertEpisodeDetailsServices {
  data: DataPublicPluginStart;
  http: HttpStart;
  expressions: ExpressionsStart;
  userProfile: UserProfileService;
}
