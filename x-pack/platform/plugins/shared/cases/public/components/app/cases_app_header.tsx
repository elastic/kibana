/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderProps } from '@kbn/app-header';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { useCasesPageLayout } from './cases_page_layout';

// EUI's `pencil` glyph, inlined as a mask so it can be attached to a node this plugin does not
// render. See `useEditableTitleAffordance` for why that is necessary.
const PENCIL_MASK_URL =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M10 2.293a1 1 0 0 1 1.414 0l2.293 2.293a1 1 0 0 1 0 1.414l-7 7H11v1H2v-3.707l8-8Zm-7 8.414V13h2.293l5.5-5.5L8.5 5.207l-5.5 5.5ZM9.207 4.5 11.5 6.793l1.5-1.5L10.707 3l-1.5 1.5Z'/%3E%3Cpath d='M14 14h-2v-1h2v1Z'/%3E%3C/svg%3E\")";

/**
 * A pencil beside an editable page title, so it reads as a control rather than a heading.
 *
 * `AppHeader` renders its editable title itself and exposes no icon prop, so the affordance is
 * attached to the heading it renders rather than composed. It hangs off the `h1` and not the title
 * button because that button is a single-cell grid whose own `::before`/`::after` are its hover
 * background and focus ring — a pseudo-element there would both overwrite the focus ring and land
 * in the same grid cell as the text. The `:has()` guard keeps the pencil out of edit mode, where
 * the button is replaced by an input. Remove all of this once `@kbn/app-header` can show the
 * affordance natively.
 */
const useEditableTitleAffordance = () => {
  const { euiTheme } = useEuiTheme();

  return useMemo(
    () =>
      css({
        "& h1:has([data-test-subj='appHeaderTitleButton'])": {
          display: 'inline-flex',
          alignItems: 'center',
          gap: euiTheme.size.s,
        },
        "& h1:has([data-test-subj='appHeaderTitleButton'])::after": {
          content: '""',
          flex: '0 0 auto',
          inlineSize: euiTheme.size.base,
          blockSize: euiTheme.size.base,
          backgroundColor: euiTheme.colors.textSubdued,
          maskImage: PENCIL_MASK_URL,
          maskSize: 'contain',
          maskRepeat: 'no-repeat',
          pointerEvents: 'none',
        },
      }),
    [euiTheme]
  );
};

const isEditableTitle = (title: AppHeaderProps['title']): boolean =>
  typeof title === 'object' && title != null && typeof title.onSave === 'function';

export const CasesAppHeader = (props: AppHeaderProps) => {
  const { variant } = useCasesPageLayout();
  const spacing = props.spacing ?? (variant === 'legacy' ? 'flush' : 'standard');
  const affordanceStyles = useEditableTitleAffordance();

  return (
    <div css={isEditableTitle(props.title) ? affordanceStyles : undefined}>
      <AppHeader {...props} spacing={spacing} />
    </div>
  );
};

CasesAppHeader.displayName = 'CasesAppHeader';
