/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { I18nProvider } from '@kbn/i18n-react';

export const TestProvider = memo(({ children }: { children?: React.ReactNode }) => {
  return <I18nProvider>{children}</I18nProvider>;
});
