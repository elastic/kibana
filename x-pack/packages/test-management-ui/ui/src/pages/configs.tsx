/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import type {
  DiscoveredConfigs,
  TestRunResult,
  StreamEvent,
  ServerStatus,
  LogLine,
} from '../types.js';
import { api } from '../api.js';
import { ConfigCard } from '../components/config_card.js';
import { SearchableSelect } from '../components/searchable_select.js';

const readParam = (key: string, fallback: string): string => {
  const url = new URL(window.location.href);
  return url.searchParams.get(key) ?? fallback;
};

const writeParams = (params: Record<string, string>) => {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(params)) {
    if (value === 'all' || value === '') {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, value);
    }
  }
  window.history.replaceState(null, '', url.toString());
};

interface ConfigsPageProps {
  configs: DiscoveredConfigs | null;
  runs: TestRunResult[];
  events: StreamEvent[];
  servers: ServerStatus[];
  esOutput: LogLine[];
  kbnOutput: LogLine[];
  onRunTest: (configId: string) => void;
  onStopRun: (runId: string) => void;
  onStartES: () => void;
  onStartKbn: () => void;
  onStopES: () => void;
  onStopKbn: () => void;
}

export const ConfigsPage = ({
  configs,
  runs,
  events,
  servers,
  esOutput,
  kbnOutput,
  onRunTest,
  onStopRun,
  onStartES,
  onStartKbn,
  onStopES,
  onStopKbn,
}: ConfigsPageProps) => {
  const [search, setSearch] = useState(() => readParam('q', ''));
  const [typeFilter, setTypeFilter] = useState(() => readParam('type', 'all'));
  const [teamFilter, setTeamFilter] = useState(
    () => readParam('team', localStorage.getItem('testmgmt:teamFilter') ?? 'all')
  );
  const [statusFilter, setStatusFilter] = useState(() => readParam('status', 'all'));
  const [moduleFilter, setModuleFilter] = useState<'all' | 'plugin' | 'package'>(
    () => readParam('module', 'all') as 'all' | 'plugin' | 'package'
  );
  const [hideEmpty, setHideEmpty] = useState(() => readParam('hideEmpty', '1') !== '0');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    writeParams({
      q: search,
      type: typeFilter,
      team: teamFilter,
      status: statusFilter,
      module: moduleFilter,
      hideEmpty: hideEmpty ? '' : '0',
    });
  }, [search, typeFilter, teamFilter, statusFilter, moduleFilter, hideEmpty]);

  const handleTeamFilterChange = useCallback((value: string) => {
    setTeamFilter(value);
    localStorage.setItem('testmgmt:teamFilter', value);
  }, []);

  const allConfigs = configs
    ? [...configs.jest, ...configs.jestIntegration, ...configs.scout, ...configs.ftr]
    : [];

  const teams = useMemo(() => {
    const set = new Set<string>();
    for (const c of allConfigs) {
      for (const t of c.owner ?? []) {
        set.add(t);
      }
    }
    return [...set].sort();
  }, [allConfigs]);

  const runsById = useMemo(() => {
    const map = new Map<string, TestRunResult[]>();
    for (const run of runs) {
      const existing = map.get(run.configId) ?? [];
      existing.push(run);
      map.set(run.configId, existing);
    }
    return map;
  }, [runs]);

  const latestStatusOf = useCallback(
    (configId: string): string => {
      const configRuns = runsById.get(configId);
      if (!configRuns || configRuns.length === 0) return 'idle';
      return configRuns[0].status;
    },
    [runsById]
  );

  const moduleTypeOf = (relativePath: string): 'plugin' | 'package' => {
    const parts = relativePath.split('/');
    return parts.includes('plugins') ? 'plugin' : 'package';
  };

  const searchLower = search.toLowerCase();

  const baseFiltered = useMemo(
    () =>
      allConfigs.filter((c) => {
        const matchesTeam = teamFilter === 'all' || (c.owner ?? []).includes(teamFilter);
        const matchesSearch =
          !search ||
          c.name.toLowerCase().includes(searchLower) ||
          c.relativePath.toLowerCase().includes(searchLower) ||
          (c.ownerPackage ?? '').toLowerCase().includes(searchLower) ||
          (c.owner ?? []).some((o) => o.toLowerCase().includes(searchLower));
        return matchesTeam && matchesSearch;
      }),
    [allConfigs, teamFilter, search, searchLower]
  );

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0, jest: 0, 'jest-integration': 0, scout: 0, ftr: 0 };
    for (const c of baseFiltered) {
      counts.all++;
      counts[c.type] = (counts[c.type] ?? 0) + 1;
    }
    return counts;
  }, [baseFiltered]);

  const typeFiltered = useMemo(
    () => (typeFilter === 'all' ? baseFiltered : baseFiltered.filter((c) => c.type === typeFilter)),
    [baseFiltered, typeFilter]
  );

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      running: 0,
      passed: 0,
      failed: 0,
      stopped: 0,
    };
    for (const c of typeFiltered) {
      const status = latestStatusOf(c.id);
      if (status === 'running' || status === 'starting') {
        counts.running++;
      } else if (status === 'passed') {
        counts.passed++;
      } else if (status === 'failed') {
        counts.failed++;
      } else if (status === 'stopped') {
        counts.stopped++;
      }
    }
    return counts;
  }, [typeFiltered, latestStatusOf]);

  const hasAnyRuns = runs.length > 0;

  const moduleCounts = useMemo(() => {
    let plugin = 0;
    let pkg = 0;
    for (const c of typeFiltered) {
      if (moduleTypeOf(c.relativePath) === 'plugin') {
        plugin++;
      } else {
        pkg++;
      }
    }
    return { plugin, package: pkg };
  }, [typeFiltered]);

  const emptyCount = useMemo(
    () => typeFiltered.filter((c) => c.testCount === 0).length,
    [typeFiltered]
  );

  const filtered = useMemo(
    () =>
      typeFiltered.filter((c) => {
        if (hideEmpty && c.testCount === 0) return false;
        if (statusFilter !== 'all') {
          const s = latestStatusOf(c.id);
          if (statusFilter === 'running') {
            if (s !== 'running' && s !== 'starting') return false;
          } else if (s !== statusFilter) {
            return false;
          }
        }
        if (moduleFilter !== 'all' && moduleTypeOf(c.relativePath) !== moduleFilter) return false;
        return true;
      }),
    [typeFiltered, hideEmpty, statusFilter, moduleFilter, latestStatusOf]
  );

  const toggleExpand = useCallback((configId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(configId)) {
        next.delete(configId);
      } else {
        next.add(configId);
      }
      return next;
    });
  }, []);

  const handleRun = useCallback(
    (configId: string) => {
      setExpandedIds((prev) => new Set(prev).add(configId));
      onRunTest(configId);
    },
    [onRunTest]
  );

  const activeRunIds = useMemo(
    () =>
      runs
        .filter((r) => r.status === 'running' || r.status === 'starting')
        .map((r) => r.id),
    [runs]
  );

  const filteredNotRunning = useMemo(
    () =>
      filtered.filter((c) => {
        const s = latestStatusOf(c.id);
        return s !== 'running' && s !== 'starting';
      }),
    [filtered, latestStatusOf]
  );

  const filteredFailed = useMemo(
    () => filtered.filter((c) => latestStatusOf(c.id) === 'failed'),
    [filtered, latestStatusOf]
  );

  const handleRunAllFiltered = useCallback(() => {
    for (const c of filteredNotRunning) {
      onRunTest(c.id);
    }
  }, [filteredNotRunning, onRunTest]);

  const handleRerunFailed = useCallback(() => {
    for (const c of filteredFailed) {
      onRunTest(c.id);
    }
  }, [filteredFailed, onRunTest]);

  const handleStopAll = useCallback(() => {
    for (const id of activeRunIds) {
      onStopRun(id);
    }
  }, [activeRunIds, onStopRun]);

  const isDiscovering = configs?.discoveryStatus === 'discovering';

  if (!configs || (configs.totalCount === 0 && isDiscovering)) {
    return (
      <div>
        <h1 style={{ margin: '0 0 24px 0', fontSize: 24 }}>Test Configs</h1>
        <div className="loading-container">
          <div className="loading-spinner" />
          <div className="text-muted" style={{ marginTop: 16 }}>
            Discovering test configs{configs?.discoveryPhase ? ` — ${configs.discoveryPhase}...` : '...'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex-between mb-16">
        <h1 style={{ margin: 0, fontSize: 24 }}>Test Configs</h1>
        <div className="flex-row">
          {isDiscovering && (
            <div className="discovery-indicator">
              <div className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
              <span className="text-muted text-small">
                Discovering {configs.discoveryPhase ? `${configs.discoveryPhase}` : ''}...
              </span>
            </div>
          )}
          <button
            className="btn btn-secondary"
            onClick={() => api.post('/api/configs/refresh')}
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="type-tabs">
        {([
          { value: 'all', label: 'All' },
          { value: 'jest', label: 'Jest' },
          { value: 'jest-integration', label: 'Jest Integration' },
          { value: 'scout', label: 'Scout' },
          { value: 'ftr', label: 'FTR' },
        ] as const).map((tab) => (
          <button
            key={tab.value}
            className={`type-tab type-tab-${tab.value}${typeFilter === tab.value ? ' type-tab-active' : ''}`}
            onClick={() => setTypeFilter(tab.value)}
          >
            {tab.label}
            <span className="type-tab-count">{typeCounts[tab.value] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Search configs by name, path, package, or team..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <SearchableSelect
          options={teams.map((team) => ({ value: team, label: team }))}
          value={teamFilter}
          onChange={handleTeamFilterChange}
          placeholder="Search teams..."
          allLabel="All Teams"
        />
      </div>

      <div className="quick-filters mb-8">
        <span className="quick-filter-label">Module</span>
        <button
          className={`quick-filter ${moduleFilter === 'all' ? 'quick-filter-active' : ''}`}
          onClick={() => setModuleFilter('all')}
        >
          All
        </button>
        <button
          className={`quick-filter quick-filter-plugin ${moduleFilter === 'plugin' ? 'quick-filter-active' : ''}`}
          onClick={() => setModuleFilter(moduleFilter === 'plugin' ? 'all' : 'plugin')}
        >
          Plugins <span className="quick-filter-count">{moduleCounts.plugin}</span>
        </button>
        <button
          className={`quick-filter quick-filter-package ${moduleFilter === 'package' ? 'quick-filter-active' : ''}`}
          onClick={() => setModuleFilter(moduleFilter === 'package' ? 'all' : 'package')}
        >
          Packages <span className="quick-filter-count">{moduleCounts.package}</span>
        </button>

        {hasAnyRuns && (
          <>
            <span className="quick-filter-separator" />
            <span className="quick-filter-label">Status</span>
            <button
              className={`quick-filter ${statusFilter === 'all' ? 'quick-filter-active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All
            </button>
            {statusCounts.running > 0 && (
              <button
                className={`quick-filter quick-filter-running ${statusFilter === 'running' ? 'quick-filter-active' : ''}`}
                onClick={() => setStatusFilter(statusFilter === 'running' ? 'all' : 'running')}
              >
                Running <span className="quick-filter-count">{statusCounts.running}</span>
              </button>
            )}
            {statusCounts.passed > 0 && (
              <button
                className={`quick-filter quick-filter-passed ${statusFilter === 'passed' ? 'quick-filter-active' : ''}`}
                onClick={() => setStatusFilter(statusFilter === 'passed' ? 'all' : 'passed')}
              >
                Passed <span className="quick-filter-count">{statusCounts.passed}</span>
              </button>
            )}
            {statusCounts.failed > 0 && (
              <button
                className={`quick-filter quick-filter-failed ${statusFilter === 'failed' ? 'quick-filter-active' : ''}`}
                onClick={() => setStatusFilter(statusFilter === 'failed' ? 'all' : 'failed')}
              >
                Failed <span className="quick-filter-count">{statusCounts.failed}</span>
              </button>
            )}
            {statusCounts.stopped > 0 && (
              <button
                className={`quick-filter quick-filter-stopped ${statusFilter === 'stopped' ? 'quick-filter-active' : ''}`}
                onClick={() => setStatusFilter(statusFilter === 'stopped' ? 'all' : 'stopped')}
              >
                Stopped <span className="quick-filter-count">{statusCounts.stopped}</span>
              </button>
            )}
          </>
        )}

        {emptyCount > 0 && (
          <>
            <span className="quick-filter-separator" />
            <button
              className={`quick-filter quick-filter-empty ${hideEmpty ? 'quick-filter-active' : ''}`}
              onClick={() => setHideEmpty(!hideEmpty)}
            >
              Hide empty <span className="quick-filter-count">{emptyCount}</span>
            </button>
          </>
        )}
      </div>

      <div className="bulk-actions-bar mb-8">
        <span className="text-muted">
          Showing {filtered.length} of {allConfigs.length} configs
        </span>
        <div className="flex-row">
          <button
            className="btn btn-primary btn-sm"
            onClick={handleRunAllFiltered}
            disabled={filteredNotRunning.length === 0}
          >
            Run Filtered ({filteredNotRunning.length})
          </button>
          {filteredFailed.length > 0 && (
            <button
              className="btn btn-danger btn-sm"
              style={{ background: '#e07c58' }}
              onClick={handleRerunFailed}
            >
              Rerun Failed ({filteredFailed.length})
            </button>
          )}
          {activeRunIds.length > 0 && (
            <button className="btn btn-danger btn-sm" onClick={handleStopAll}>
              Stop All ({activeRunIds.length})
            </button>
          )}
        </div>
      </div>

      <div style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
        {filtered.slice(0, 100).map((config) => (
          <ConfigCard
            key={config.id}
            config={config}
            runs={runsById.get(config.id) ?? []}
            events={events}
            expanded={expandedIds.has(config.id)}
            onToggle={() => toggleExpand(config.id)}
            onRun={handleRun}
            onStop={onStopRun}
            servers={servers}
            esOutput={esOutput}
            kbnOutput={kbnOutput}
            onStartES={onStartES}
            onStartKbn={onStartKbn}
            onStopES={onStopES}
            onStopKbn={onStopKbn}
          />
        ))}
        {filtered.length > 100 && (
          <div className="text-muted" style={{ padding: 16, textAlign: 'center' }}>
            Showing first 100 results. Refine your search to see more.
          </div>
        )}
      </div>
    </div>
  );
};
