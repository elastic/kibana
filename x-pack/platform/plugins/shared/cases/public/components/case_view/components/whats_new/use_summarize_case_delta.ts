/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import { getCaseDeltaSummary } from '../../../../containers/api';

export const useSummarizeCaseDelta = (caseId: string) =>
  useMutation(() => getCaseDeltaSummary(caseId));
