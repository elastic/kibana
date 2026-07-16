/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';

/**
 * Shared style override for an `EuiSelect` used as the `append` of an
 * `EuiFieldNumber` (e.g. splay unit, frequency repeat-unit). EUI's default
 * append styling does not stretch the select to the field's full height or
 * square off the shared border — this makes the two controls read as one.
 */
export const selectAppendCss = (borderRadius: string | number) => css`
  && .euiFormControlLayout__append {
    padding: 0;
    align-items: stretch;
  }

  && .euiFormControlLayout__append,
  && .euiFormControlLayout__append .euiFormControlLayout,
  && .euiFormControlLayout__append .euiFormControlLayout__childrenWrapper,
  && .euiFormControlLayout__append .euiSelect {
    block-size: 100%;
  }

  && .euiFormControlLayout__append .euiSelect {
    border-start-start-radius: 0;
    border-end-start-radius: 0;
    border-start-end-radius: ${borderRadius};
    border-end-end-radius: ${borderRadius};
  }
`;
