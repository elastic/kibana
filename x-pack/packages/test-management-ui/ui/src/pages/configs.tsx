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
  PRInfo,
  ChangedFilesInfo,
} from '../types.js';
import { api } from '../api.js';
import { ConfigCard } from '../components/config_card.js';
import { SearchableSelect } from '../components/searchable_select.js';
import { PRBanner } from '../components/pr_banner.js';
import { CIChecksPanel } from '../components/ci_checks_panel.js';
import { TestFileSearch } from '../components/test_file_search.js';
import { RepeatRunModal } from '../components/repeat_run_modal.js';

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
  prInfo: PRInfo | null;
  changedFiles: ChangedFilesInfo | null;
  onRunTest: (configId: string, extraArgs?: string[], repeat?: number) => void;
  onRunTestFile: (testFile: string, configId: string) => void;
  onStopRun: (runId: string) => void;
  onStartES: () => void;
  onStartKbn: () => void;
  onStopES: () => void;
  onStopKbn: () => void;
  onRefreshPr: () => void;
}

export const ConfigsPage = ({
  configs,
  runs,
  events,
  servers,
  esOutput,
  kbnOutput,
  prInfo,
  changedFiles,
  onRunTest,
  onRunTestFile,
  onStopRun,
  onStartES,
  onStartKbn,
  onStopES,
  onStopKbn,
  onRefreshPr,
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
  const [ciFilter, setCiFilter] = useState(false);
  const [affectedFilter, setAffectedFilter] = useState(false);
  const [showTestFileSearch, setShowTestFileSearch] = useState(false);
  const [repeatModal, setRepeatModal] = useState<{ configId: string; configName: string } | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

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

  const ciChecks = configs?.ciChecks ?? [];

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
    const counts: Record<string, number> = { running: 0, passed: 0, failed: 0, stopped: 0 };
    for (const c of typeFiltered) {
      const status = latestStatusOf(c.id);
      if (status === 'running' || status === 'starting') counts.running++;
      else if (status === 'passed') counts.passed++;
      else if (status === 'failed') counts.failed++;
      else if (status === 'stopped') counts.stopped++;
    }
    return counts;
  }, [typeFiltered, latestStatusOf]);

  const moduleCounts = useMemo(() => {
    let plugin = 0;
    let pkg = 0;
    for (const c of typeFiltered) {
      if (moduleTypeOf(c.relativePath) === 'plugin') plugin++;
      else pkg++;
    }
    return { plugin, package: pkg };
  }, [typeFiltered]);

  const emptyCount = useMemo(
    () => typeFiltered.filter((c) => c.testCount === 0).length,
    [typeFiltered]
  );

  const ciFailedIds = useMemo(
    () => new Set(prInfo?.failedConfigIds ?? []),
    [prInfo]
  );

  const ciFailureCount = useMemo(
    () => typeFiltered.filter((c) => ciFailedIds.has(c.id)).length,
    [typeFiltered, ciFailedIds]
  );

  const affectedIds = useMemo(
    () => new Set(changedFiles?.affectedConfigIds ?? []),
    [changedFiles]
  );

  const affectedCount = useMemo(
    () => typeFiltered.filter((c) => affectedIds.has(c.id)).length,
    [typeFiltered, affectedIds]
  );

  const failingCiChecks = useMemo(
    () => ciChecks.filter((c) => ciFailedIds.has(c.id)),
    [ciChecks, ciFailedIds]
  );

  const filtered = useMemo(
    () =>
      typeFiltered.filter((c) => {
        if (hideEmpty && c.testCount === 0) return false;
        if (ciFilter && !ciFailedIds.has(c.id)) return false;
        if (affectedFilter && !affectedIds.has(c.id)) return false;
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
    [typeFiltered, hideEmpty, ciFilter, ciFailedIds, affectedFilter, affectedIds, statusFilter, moduleFilter, latestStatusOf]
  );

  const toggleExpand = useCallback((configId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(configId)) next.delete(configId);
      else next.add(configId);
      return next;
    });
  }, []);

  const handleRun = useCallback(
    (configId: string, extraArgs?: string[], repeat?: number) => {
      setExpandedIds((prev) => new Set(prev).add(configId));
      onRunTest(configId, extraArgs, repeat);
    },
    [onRunTest]
  );

  const activeRunIds = useMemo(
    () => runs.filter((r) => r.status === 'running' || r.status === 'starting').map((r) => r.id),
    [runs]
  );

  const filteredNotRunning = useMemo(
    () => filtered.filter((c) => {
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
    for (const c of filteredNotRunning) onRunTest(c.id);
  }, [filteredNotRunning, onRunTest]);

  const handleRerunFailed = useCallback(() => {
    for (const c of filteredFailed) onRunTest(c.id);
  }, [filteredFailed, onRunTest]);

  const handleStopAll = useCallback(() => {
    for (const id of activeRunIds) onStopRun(id);
  }, [activeRunIds, onStopRun]);

  const handleRunFailingChecks = useCallback(() => {
    for (const c of failingCiChecks) {
      const latestRun = runsById.get(c.id)?.[0];
      if (latestRun?.status !== 'running' && latestRun?.status !== 'starting') {
        onRunTest(c.id);
      }
    }
  }, [failingCiChecks, runsById, onRunTest]);

  const affectedNotRunning = useMemo(
    () => filtered.filter((c) => {
      if (!affectedIds.has(c.id)) return false;
      const s = latestStatusOf(c.id);
      return s !== 'running' && s !== 'starting';
    }),
    [filtered, affectedIds, latestStatusOf]
  );

  const handleRunAffected = useCallback(() => {
    for (const c of affectedNotRunning) onRunTest(c.id);
  }, [affectedNotRunning, onRunTest]);

  const handleRepeatRun = useCallback(
    (count: number) => {
      if (repeatModal) {
        onRunTest(repeatModal.configId, undefined, count);
        setExpandedIds((prev) => new Set(prev).add(repeatModal.configId));
        setRepeatModal(null);
      }
    },
    [repeatModal, onRunTest]
  );

  const activeFilterCount = [
    moduleFilter !== 'all',
    statusFilter !== 'all',
    ciFilter,
    affectedFilter,
    !hideEmpty,
  ].filter(Boolean).length;

  const isDiscovering = configs?.discoveryStatus === 'discovering';

  if (!configs || (configs.totalCount === 0 && isDiscovering)) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <div className="text-muted" style={{ marginTop: 16 }}>
          Discovering test configs{configs?.discoveryPhase ? ` — ${configs.discoveryPhase}...` : '...'}
        </div>
      </div>
    );
  }

  const hasFailures = statusCounts.failed > 0;
  const hasRunning = statusCounts.running > 0;
  const hasAffected = affectedCount > 0;
  const hasCiFailures = ciFailureCount > 0 || failingCiChecks.length > 0;

  return (
    <div>
      {/* Smart Action Cards - only show when there's something actionable */}
      {(hasCiFailures || hasAffected || hasFailures || hasRunning) && (
        <div className="action-cards">
          {hasCiFailures && (
            <div className="action-card action-card-danger" onClick={() => setCiFilter(!ciFilter)}>
              <div className="action-card-number">{ciFailureCount + failingCiChecks.length}</div>
              <div className="action-card-label">CI Failing</div>
              <button
                className="action-card-btn"
                onClick={(e) => { e.stopPropagation(); handleRunFailingChecks(); }}
              >
                Run All
              </button>
            </div>
          )}
          {hasAffected && (
            <div className="action-card action-card-purple" onClick={() => setAffectedFilter(!affectedFilter)}>
              <div className="action-card-number">{affectedCount}</div>
              <div className="action-card-label">Affected</div>
              {affectedNotRunning.length > 0 && (
                <button
                  className="action-card-btn"
                  onClick={(e) => { e.stopPropagation(); handleRunAffected(); }}
                >
                  Run All
                </button>
              )}
            </div>
          )}
          {hasRunning && (
            <div className="action-card action-card-blue" onClick={() => setStatusFilter(statusFilter === 'running' ? 'all' : 'running')}>
              <div className="action-card-number">{statusCounts.running}</div>
              <div className="action-card-label">Running</div>
              <button
                className="action-card-btn"
                onClick={(e) => { e.stopPropagation(); handleStopAll(); }}
              >
                Stop All
              </button>
            </div>
          )}
          {hasFailures && (
            <div className="action-card action-card-warning" onClick={() => setStatusFilter(statusFilter === 'failed' ? 'all' : 'failed')}>
              <div className="action-card-number">{statusCounts.failed}</div>
              <div className="action-card-label">Failed</div>
              <button
                className="action-card-btn"
                onClick={(e) => { e.stopPropagation(); handleRerunFailed(); }}
              >
                Rerun
              </button>
            </div>
          )}
          {statusCounts.passed > 0 && (
            <div className="action-card action-card-success" onClick={() => setStatusFilter(statusFilter === 'passed' ? 'all' : 'passed')}>
              <div className="action-card-number">{statusCounts.passed}</div>
              <div className="action-card-label">Passed</div>
            </div>
          )}
        </div>
      )}

      {/* PR Status - compact inline banner */}
      {prInfo && (
        <PRBanner
          pr={prInfo}
          ciFailureCount={ciFailureCount}
          ciFilterActive={ciFilter}
          failingCheckCount={failingCiChecks.length}
          onToggleCiFilter={() => setCiFilter(!ciFilter)}
          onRefresh={onRefreshPr}
          onRunFailingChecks={handleRunFailingChecks}
        />
      )}

      {/* CI Checks - collapsible */}
      {ciChecks.length > 0 && (
        <CIChecksPanel
          checks={ciChecks}
          runs={runs}
          events={events}
          ciFailedIds={ciFailedIds}
          changedLintableFiles={changedFiles?.changedLintableFiles}
          affectedTsProjects={changedFiles?.affectedTsProjects}
          onRun={handleRun}
          onStop={onStopRun}
        />
      )}

      {/* Unified Toolbar */}
      <div className="toolbar">
        <div className="toolbar-main">
          <div className="toolbar-search">
            <span className="toolbar-search-icon">&#x2315;</span>
            <input
              type="text"
              placeholder="Search configs by name, path, package, or team..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <SearchableSelect
            options={teams.map((team) => ({ value: team, label: team }))}
            value={teamFilter}
            onChange={handleTeamFilterChange}
            placeholder="Search teams..."
            allLabel="All Teams"
          />
          <button
            className={`btn btn-ghost btn-sm${showFilters ? ' btn-active' : ''}${activeFilterCount > 0 ? ' btn-has-badge' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filters
            {activeFilterCount > 0 && (
              <span className="filter-badge">{activeFilterCount}</span>
            )}
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowTestFileSearch(true)}
            title="Search and run individual test files"
          >
            Run File
          </button>
        </div>

        {/* Collapsible filter panel */}
        {showFilters && (
          <div className="toolbar-filters">
            <div className="filter-group">
              <span className="filter-group-label">Module</span>
              <button className={`pill${moduleFilter === 'all' ? ' pill-active' : ''}`} onClick={() => setModuleFilter('all')}>All</button>
              <button className={`pill pill-plugin${moduleFilter === 'plugin' ? ' pill-active' : ''}`} onClick={() => setModuleFilter(moduleFilter === 'plugin' ? 'all' : 'plugin')}>
                Plugins <span className="pill-count">{moduleCounts.plugin}</span>
              </button>
              <button className={`pill pill-package${moduleFilter === 'package' ? ' pill-active' : ''}`} onClick={() => setModuleFilter(moduleFilter === 'package' ? 'all' : 'package')}>
                Packages <span className="pill-count">{moduleCounts.package}</span>
              </button>
            </div>

            {runs.length > 0 && (
              <div className="filter-group">
                <span className="filter-group-label">Status</span>
                <button className={`pill${statusFilter === 'all' ? ' pill-active' : ''}`} onClick={() => setStatusFilter('all')}>All</button>
                {statusCounts.running > 0 && (
                  <button className={`pill pill-running${statusFilter === 'running' ? ' pill-active' : ''}`} onClick={() => setStatusFilter(statusFilter === 'running' ? 'all' : 'running')}>
                    Running <span className="pill-count">{statusCounts.running}</span>
                  </button>
                )}
                {statusCounts.passed > 0 && (
                  <button className={`pill pill-passed${statusFilter === 'passed' ? ' pill-active' : ''}`} onClick={() => setStatusFilter(statusFilter === 'passed' ? 'all' : 'passed')}>
                    Passed <span className="pill-count">{statusCounts.passed}</span>
                  </button>
                )}
                {statusCounts.failed > 0 && (
                  <button className={`pill pill-failed${statusFilter === 'failed' ? ' pill-active' : ''}`} onClick={() => setStatusFilter(statusFilter === 'failed' ? 'all' : 'failed')}>
                    Failed <span className="pill-count">{statusCounts.failed}</span>
                  </button>
                )}
                {statusCounts.stopped > 0 && (
                  <button className={`pill pill-stopped${statusFilter === 'stopped' ? ' pill-active' : ''}`} onClick={() => setStatusFilter(statusFilter === 'stopped' ? 'all' : 'stopped')}>
                    Stopped <span className="pill-count">{statusCounts.stopped}</span>
                  </button>
                )}
              </div>
            )}

            <div className="filter-group">
              <span className="filter-group-label">More</span>
              {changedFiles && changedFiles.changedFiles.length > 0 && (
                <button className={`pill pill-affected${affectedFilter ? ' pill-active' : ''}`} onClick={() => setAffectedFilter(!affectedFilter)}>
                  Affected <span className="pill-count">{affectedCount}</span>
                </button>
              )}
              {emptyCount > 0 && (
                <button className={`pill${hideEmpty ? ' pill-active' : ''}`} onClick={() => setHideEmpty(!hideEmpty)}>
                  Hide empty <span className="pill-count">{emptyCount}</span>
                </button>
              )}
              {hasCiFailures && (
                <button className={`pill pill-failed${ciFilter ? ' pill-active' : ''}`} onClick={() => setCiFilter(!ciFilter)}>
                  CI Failures <span className="pill-count">{ciFailureCount}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Type Tabs */}
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

      {/* Results header */}
      <div className="results-header">
        <span className="results-count">
          {filtered.length} of {allConfigs.length} configs
          {changedFiles && changedFiles.changedFiles.length > 0 && (
            <span className="results-changed">
              {changedFiles.changedFiles.length} files changed
            </span>
          )}
        </span>
        <div className="results-actions">
          <button
            className="btn btn-primary btn-sm"
            onClick={handleRunAllFiltered}
            disabled={filteredNotRunning.length === 0}
          >
            Run Filtered ({filteredNotRunning.length})
          </button>
          {activeRunIds.length > 0 && (
            <button className="btn btn-danger btn-sm" onClick={handleStopAll}>
              Stop All ({activeRunIds.length})
            </button>
          )}
        </div>
      </div>

      {/* Config List */}
      <div className="config-list">
        {filtered.slice(0, 100).map((config) => (
          <ConfigCard
            key={config.id}
            config={config}
            runs={runsById.get(config.id) ?? []}
            events={events}
            expanded={expandedIds.has(config.id)}
            ciStatus={ciFailedIds.has(config.id) ? 'failed' : undefined}
            isAffected={affectedIds.has(config.id)}
            changedFiles={changedFiles?.changedFiles}
            onToggle={() => toggleExpand(config.id)}
            onRun={handleRun}
            onStop={onStopRun}
            onRepeat={(configId, name) => setRepeatModal({ configId, configName: name })}
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
          <div className="results-overflow">
            Showing first 100 results. Refine your search to see more.
          </div>
        )}
        {filtered.length === 0 && (
          <div className="results-empty">
            No configs match your filters. Try broadening your search.
          </div>
        )}
      </div>

      {showTestFileSearch && (
        <TestFileSearch
          onRun={onRunTestFile}
          onClose={() => setShowTestFileSearch(false)}
        />
      )}
      {repeatModal && (
        <RepeatRunModal
          configName={repeatModal.configName}
          onRun={handleRepeatRun}
          onCancel={() => setRepeatModal(null)}
        />
      )}
    </div>
  );
};
