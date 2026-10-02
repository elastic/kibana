/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactNode } from 'react';

import type { EsqlFailureTooltip } from '@kbn/lens-common';

/** Renders title + message for Convert-to-ES|QL failure tooltips. */
export const renderEsqlFailureTooltipContent = (tooltip: EsqlFailureTooltip): ReactNode => {
  if (!tooltip.title) {
    return tooltip.message;
  }

  return (
    <>
      <div>{tooltip.title}</div>
      <div>{tooltip.message}</div>
    </>
  );
};
