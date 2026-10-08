/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n as I18N } from '@kbn/i18n';
import type { ReactNode } from 'react';

declare global {
  interface CanvasFunctionComponent<Props> {
    (props: Props): ReactNode;
    defaultProps?: Partial<Props>;
    displayName?: string;
    propTypes?: object;
  }

  const canvas: {
    i18n: typeof I18N;
  };
}
