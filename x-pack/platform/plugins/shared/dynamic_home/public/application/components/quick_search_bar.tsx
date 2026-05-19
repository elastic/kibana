/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { EuiFieldSearch, EuiIcon, EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { HttpStart } from '@kbn/core/public';
import type { SearchResult } from '../../../server/routes/search_route';

interface QuickSearchBarProps {
  http: HttpStart;
}

export const QuickSearchBar: React.FC<QuickSearchBarProps> = ({ http }) => {
  const { euiTheme } = useEuiTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setIsLoading(true);
      http
        .get<{ results: SearchResult[] }>('/internal/dynamic_home/search', {
          query: { q: query },
        })
        .then(({ results: r }) => {
          setResults(r);
          setIsOpen(r.length > 0);
        })
        .catch(() => setResults([]))
        .finally(() => setIsLoading(false));
    }, 250);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, http]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const getHref = (result: SearchResult) => {
    if (result.type === 'dashboard') {
      return http.basePath.prepend(`/app/dashboards#/view/${result.id}`);
    }
    return http.basePath.prepend(`/app/discover#/view/${result.id}`);
  };

  const wrapperStyle = css`
    position: relative;
    max-width: 520px;
    margin-top: ${euiTheme.size.s};
  `;

  const inputWrapStyle = css`
    background: rgba(255, 255, 255, 0.15);
    border-radius: ${euiTheme.border.radius.medium};
    backdrop-filter: blur(6px);

    .euiFieldSearch {
      background: transparent;
      border-color: rgba(255, 255, 255, 0.35);
      color: #fff;
      box-shadow: none;
    }
    .euiFieldSearch::placeholder {
      color: rgba(255, 255, 255, 0.65);
    }
    .euiFormControlLayout__prepend svg,
    .euiFormControlLayout__append svg {
      color: rgba(255, 255, 255, 0.7) !important;
      fill: rgba(255, 255, 255, 0.7) !important;
    }
  `;

  const dropdownStyle = css`
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    z-index: 1000;
    max-height: 320px;
    overflow-y: auto;
    color: ${euiTheme.colors.text};
  `;

  const resultItemStyle = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.s};
    padding: ${euiTheme.size.s} ${euiTheme.size.m};
    border-radius: ${euiTheme.border.radius.small};
    text-decoration: none;
    color: inherit;
    cursor: pointer;
    &:hover {
      background: ${euiTheme.colors.lightShade};
    }
  `;

  return (
    <div ref={containerRef} css={wrapperStyle}>
      <div css={inputWrapStyle}>
        <EuiFieldSearch
          placeholder="Search dashboards, saved searches…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          isLoading={isLoading}
          fullWidth
          aria-label="Quick search"
        />
      </div>

      {isOpen && (
        <EuiPanel css={dropdownStyle} paddingSize="s" hasBorder>
          {results.map((r) => (
            <a key={r.id} href={getHref(r)} css={resultItemStyle}>
              <EuiIcon
                type={r.type === 'dashboard' ? 'dashboardApp' : 'discoverApp'}
                size="s"
                color="primary"
              />
              <EuiText size="s">
                <span>{r.title}</span>
              </EuiText>
              <EuiText
                size="xs"
                color="subdued"
                css={css`
                  margin-left: auto;
                  white-space: nowrap;
                `}
              >
                <span>{r.type}</span>
              </EuiText>
            </a>
          ))}
        </EuiPanel>
      )}
    </div>
  );
};
