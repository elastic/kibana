/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPageTemplate } from '@elastic/eui';
import { useKibana } from '../../hooks/use_kibana';

export function StreamsAppPageTemplate({ children }: { children: React.ReactNode }) {
  const {
    services: { PageTemplate },
  } = useKibana();

  /**
   * This template wrapper only serves the purpose of adding the o11y sidebar to the app.
   * Due to the dependency inversion used to get the template and the constrain on the dependencies imports,
   * we cannot get the right types for this template unless its definition gets moved into a more generic package.
   */
  return <PageTemplate>{children}</PageTemplate>;
}

StreamsAppPageTemplate.Header = EuiPageTemplate.Header;
StreamsAppPageTemplate.Body = EuiPageTemplate.Section;
StreamsAppPageTemplate.EmptyPrompt = EuiPageTemplate.EmptyPrompt;
