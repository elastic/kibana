/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetKiResponse } from '../../../../common/http_api/knowledge_indicators';

export const getKiPageTitle = (ki: GetKiResponse | undefined, kiId: string): string => {
  if (!ki || !ki.document.title) {
    return kiId;
  }

  return ki.document.title;
};
