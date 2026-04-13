/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';

interface RepeatRunModalProps {
  configName: string;
  onRun: (count: number) => void;
  onCancel: () => void;
}

export const RepeatRunModal = ({ configName, onRun, onCancel }: RepeatRunModalProps) => {
  const [count, setCount] = useState(5);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onCancel]);

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" style={{ width: 400 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Run Multiple Times (Flaky Detection)</h3>
          <button className="modal-close" onClick={onCancel}>×</button>
        </div>
        <div className="modal-body">
          <p className="text-muted" style={{ margin: '0 0 16px' }}>
            Run <strong>{configName}</strong> multiple times to detect flaky tests.
            Execution stops on first failure.
          </p>
          <div className="modal-field">
            <label className="modal-label">Number of runs</label>
            <div className="repeat-count-selector">
              {[3, 5, 10, 20, 50].map((n) => (
                <button
                  key={n}
                  className={`repeat-count-btn ${count === n ? 'repeat-count-active' : ''}`}
                  onClick={() => setCount(n)}
                >
                  {n}×
                </button>
              ))}
              <input
                type="number"
                className="modal-input"
                style={{ width: 80, textAlign: 'center' }}
                min={2}
                max={100}
                value={count}
                onChange={(e) => setCount(Math.max(2, Math.min(100, parseInt(e.target.value, 10) || 2)))}
              />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onRun(count)}>
            Run {count}× Times
          </button>
        </div>
      </div>
    </div>
  );
};
