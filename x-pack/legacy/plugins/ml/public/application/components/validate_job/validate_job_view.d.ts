/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FC } from 'react';
declare const ValidateJob: FC<{
  getJobConfig: any;
  getDuration: any;
  mlJobService: any;
  embedded?: boolean;
  setIsValid?: (valid: boolean) => void;
  idFilterList?: string[];
}>;
