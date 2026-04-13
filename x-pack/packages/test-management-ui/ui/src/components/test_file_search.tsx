/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { TestFileSearchResult } from '../types.js';
import { api } from '../api.js';

interface TestFileSearchProps {
  onRun: (testFile: string, configId: string) => void;
  onClose: () => void;
}

export const TestFileSearch = ({ onRun, onClose }: TestFileSearchProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TestFileSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      api
        .get<{ results: TestFileSearchResult[] }>(`/api/test-files/search?q=${encodeURIComponent(q)}`)
        .then((data) => {
          setResults(data.results ?? []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }, 200);
  }, []);

  const handleRun = (result: TestFileSearchResult) => {
    onRun(result.file, result.configId);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ width: 700, maxHeight: '70vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="modal-title">Run Test File</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div style={{ padding: '12px 20px 0' }}>
          <input
            ref={inputRef}
            type="text"
            className="modal-input"
            placeholder="Search test files (e.g. slo, fetcher.test.ts)..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <div style={{ padding: '12px 20px 20px', maxHeight: 400, overflowY: 'auto' }}>
          {loading && (
            <div className="text-muted" style={{ textAlign: 'center', padding: 16 }}>
              Searching...
            </div>
          )}
          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="text-muted" style={{ textAlign: 'center', padding: 16 }}>
              No test files found
            </div>
          )}
          {results.map((r) => (
            <div
              key={r.file}
              className="test-file-result"
              onClick={() => handleRun(r)}
            >
              <div className="test-file-path mono">{r.file}</div>
              <div className="test-file-meta">
                <span className={`config-type-badge type-${r.configType}`}>
                  {r.configType}
                </span>
                <span className="text-muted text-small">{r.configName}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
