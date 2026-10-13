/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiFieldSearch, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface CanvasSearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
}

export function CanvasSearchBar({ query, onQueryChange }: CanvasSearchBarProps) {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      css={css`
        flex: 0 0 auto;
        padding: ${euiTheme.size.m} ${euiTheme.size.m} ${euiTheme.size.s};
      `}
    >
      <EuiFieldSearch
        fullWidth
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder={i18n.translate('xpack.streams.canvas.searchPlaceholder', {
          defaultMessage: 'Search streams — e.g. nginx, otel, archive',
        })}
        aria-label={i18n.translate('xpack.streams.canvas.searchAriaLabel', {
          defaultMessage: 'Search streams on the canvas',
        })}
        data-test-subj="streamsCanvasSearch"
      />
    </div>
  );
}
