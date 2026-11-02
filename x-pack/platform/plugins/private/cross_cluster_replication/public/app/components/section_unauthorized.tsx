/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, type ReactNode } from 'react';
import { KbnWarningCallout } from '@kbn/ui-callout';

interface Props {
  title: ReactNode;
  children: ReactNode;
}

export function SectionUnauthorized({ title, children }: Props) {
  return (
    <Fragment>
      <KbnWarningCallout title={title}>{children}</KbnWarningCallout>
    </Fragment>
  );
}
