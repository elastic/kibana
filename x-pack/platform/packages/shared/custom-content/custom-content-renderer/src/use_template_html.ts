/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { useEuiTheme } from '@elastic/eui';
import type { ESQLColumn } from '@kbn/es-types';
import { stripMarkdownFences } from '@kbn/custom-content-common';
import { fillTemplate } from './fill_template';
import { applyHtmlTheme, sanitizeHtml } from './prepare_html';

type TemplateHtml = { html: string } | { error: string } | undefined;

/**
 * The template filled with rows that are already there, cleaned and themed. It is undefined while
 * it is being made, and says why when it cannot be.
 */
export const useTemplateHtml = (
  template: string,
  data: { columns: ESQLColumn[]; rows: ReadonlyArray<ReadonlyArray<unknown>> }
): TemplateHtml => {
  const { euiTheme, colorMode } = useEuiTheme();
  const [rendered, setRendered] = useState<TemplateHtml>();

  useEffect(() => {
    let isCurrent = true;
    fillTemplate(
      stripMarkdownFences(template),
      data.columns,
      data.rows.map((row) => [...row]) as never
    )
      .then((filled) => {
        if (isCurrent) {
          setRendered({ html: applyHtmlTheme(sanitizeHtml(filled), colorMode, euiTheme) });
        }
      })
      .catch((error: Error) => {
        if (isCurrent) setRendered({ error: error.message });
      });
    return () => {
      isCurrent = false;
    };
  }, [template, data, colorMode, euiTheme]);

  return rendered;
};
