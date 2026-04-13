/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { RunOption } from '../types.js';

interface RunOptionsModalProps {
  title: string;
  options: RunOption[];
  onRun: (extraArgs: string[]) => void;
  onCancel: () => void;
}

const SearchableDropdown = ({
  choices,
  value,
  onChange,
  placeholder,
}: {
  choices: Array<{ value: string; label: string }>;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) => {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useMemo(() => {
    if (!search) return choices.slice(0, 100);
    const lower = search.toLowerCase();
    return choices.filter((c) => c.label.toLowerCase().includes(lower)).slice(0, 100);
  }, [choices, search]);

  const selectedLabel = choices.find((c) => c.value === value)?.label;

  return (
    <div className="modal-searchable" ref={ref}>
      <div
        className="modal-searchable-trigger"
        onClick={() => {
          setOpen(!open);
          setSearch('');
        }}
      >
        <span className={`modal-searchable-value ${value ? '' : 'text-muted'}`}>
          {selectedLabel ?? placeholder ?? '— none (run all) —'}
        </span>
        <span className="modal-searchable-arrow">▾</span>
      </div>
      {open && (
        <div className="modal-searchable-dropdown">
          <input
            className="modal-searchable-input"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type to filter..."
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && filtered.length === 1) {
                onChange(filtered[0].value);
                setOpen(false);
              }
            }}
          />
          <div className="modal-searchable-options">
            <div
              className={`modal-searchable-option ${!value ? 'selected' : ''}`}
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
            >
              — none (run all) —
            </div>
            {filtered.map((c) => (
              <div
                key={c.value}
                className={`modal-searchable-option ${c.value === value ? 'selected' : ''}`}
                onClick={() => {
                  onChange(c.value);
                  setOpen(false);
                }}
              >
                {c.label}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="modal-searchable-empty">No matches</div>
            )}
            {filtered.length === 100 && choices.length > 100 && (
              <div className="modal-searchable-empty">
                Type to narrow results ({choices.length} total)
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const RunOptionsModal = ({ title, options, onRun, onCancel }: RunOptionsModalProps) => {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const opt of options) {
      initial[opt.key] = opt.defaultValue ?? '';
    }
    return initial;
  });

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    },
    [onCancel]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const setValue = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    const args: string[] = [];
    for (const opt of options) {
      const val = values[opt.key] ?? '';
      if (opt.type === 'boolean') {
        if (val === 'true') {
          args.push(opt.flag);
        }
      } else if (val.trim()) {
        args.push(opt.flag, val.trim());
      }
    }
    onRun(args);
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Run: {title}</h3>
          <button className="modal-close" onClick={onCancel}>×</button>
        </div>
        <div className="modal-body">
          {options.map((opt) => (
            <div key={opt.key} className="modal-field">
              <label className="modal-label">{opt.label}</label>
              {opt.type === 'boolean' && (
                <label className="modal-checkbox">
                  <input
                    type="checkbox"
                    checked={values[opt.key] === 'true'}
                    onChange={(e) => setValue(opt.key, e.target.checked ? 'true' : '')}
                  />
                  <span>Enable {opt.flag}</span>
                </label>
              )}
              {opt.type === 'text' && (
                <input
                  type="text"
                  className="modal-input"
                  value={values[opt.key] ?? ''}
                  onChange={(e) => setValue(opt.key, e.target.value)}
                  placeholder={opt.placeholder}
                  autoFocus
                />
              )}
              {opt.type === 'select' && (
                <SearchableDropdown
                  choices={opt.choices ?? []}
                  value={values[opt.key] ?? ''}
                  onChange={(v) => setValue(opt.key, v)}
                  placeholder={opt.placeholder}
                />
              )}
            </div>
          ))}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit}>Run</button>
        </div>
      </div>
    </div>
  );
};
