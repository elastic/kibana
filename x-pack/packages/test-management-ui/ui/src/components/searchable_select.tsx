/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useRef, useEffect } from 'react';

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allLabel?: string;
}

export const SearchableSelect = ({
  options,
  value,
  onChange,
  placeholder = 'Search...',
  allLabel = 'All',
}: SearchableSelectProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const selectedLabel =
    value === 'all' ? allLabel : options.find((o) => o.value === value)?.label ?? value;

  const handleSelect = (v: string) => {
    onChange(v);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} className="searchable-select">
      <button
        className="searchable-select-trigger"
        onClick={() => setOpen(!open)}
        type="button"
      >
        <span className="searchable-select-value">{selectedLabel}</span>
        <span className="searchable-select-arrow">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="searchable-select-dropdown">
          <input
            ref={inputRef}
            className="searchable-select-input"
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setOpen(false);
                setQuery('');
              }
            }}
          />
          <div className="searchable-select-options">
            <div
              className={`searchable-select-option ${value === 'all' ? 'selected' : ''}`}
              onClick={() => handleSelect('all')}
            >
              {allLabel}
            </div>
            {filtered.map((o) => (
              <div
                key={o.value}
                className={`searchable-select-option ${value === o.value ? 'selected' : ''}`}
                onClick={() => handleSelect(o.value)}
              >
                {o.label}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="searchable-select-option" style={{ color: '#98a2b3', fontStyle: 'italic' }}>
                No matches
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
