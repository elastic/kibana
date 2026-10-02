/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactNode } from 'react';

import type { EsqlConversionFailureReason, EsqlFailureTooltip } from '@kbn/lens-common';
import { getFailureTooltip, getFailureTooltipPlainText } from '@kbn/lens-common';

export const buildEsqlFailureTooltip = (
  reasons?: EsqlConversionFailureReason[]
): EsqlFailureTooltip => getFailureTooltip(reasons, { showAllReasons: false });

export const getEsqlFailureTooltipPlainText = (reasons?: EsqlConversionFailureReason[]): string =>
  getFailureTooltipPlainText(reasons, { showAllReasons: false });

/** Renders title + message(s) for Convert-to-ES|QL failure tooltips. */
export const renderEsqlFailureTooltipContent = (tooltip: EsqlFailureTooltip): ReactNode => {
  if (!tooltip.title) {
    return tooltip.messages[0];
  }

  if (tooltip.messages.length === 1) {
    return (
      <>
        <div>{tooltip.title}</div>
        <div>{tooltip.messages[0]}</div>
      </>
    );
  }

  return (
    <>
      <div>{tooltip.title}</div>
      <ul>
        {tooltip.messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </>
  );
};
