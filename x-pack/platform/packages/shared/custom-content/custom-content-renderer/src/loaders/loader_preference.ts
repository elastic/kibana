/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Places a loader can appear. Each scenario keeps its own choice. */
export const LOADER_SCENARIOS = [
  'agentAvatar',
  'customPanel',
  'workersRunning',
  'nightshift',
] as const;

export type LoaderScenario = (typeof LOADER_SCENARIOS)[number];

/** Every loader. A scenario may offer only some of these. */
export const LOADER_IDS = ['orbitRing', 'elastic', 'scanDots', 'pulseDots'] as const;

export type LoaderId = (typeof LOADER_IDS)[number];

/** Options shown for each scenario. */
export const LOADER_IDS_BY_SCENARIO: Record<LoaderScenario, readonly LoaderId[]> = {
  agentAvatar: ['orbitRing', 'elastic', 'pulseDots'],
  customPanel: ['orbitRing', 'elastic', 'scanDots'],
  workersRunning: ['orbitRing', 'elastic', 'pulseDots', 'scanDots'],
  nightshift: ['orbitRing', 'elastic', 'pulseDots', 'scanDots'],
};

const STORAGE_KEY = 'agentBuilder.loaders';
const LEGACY_AVATAR_KEY = 'agentBuilder.agentAvatarLoader';
/** Bump when a scenario's selected loader should move to its new default once. */
const STORAGE_VERSION = 4;
/** The custom panel already moved to scan dots at this version, so that choice stays. */
const PANEL_SCAN_VERSION = 3;

type LoaderSelection = Record<LoaderScenario, LoaderId>;

const DEFAULT_SELECTION: LoaderSelection = {
  agentAvatar: 'pulseDots',
  customPanel: 'scanDots',
  workersRunning: 'pulseDots',
  nightshift: 'scanDots',
};

const isAvatarLoaderId = (value: unknown): value is 'orbitRing' | 'elastic' | 'pulseDots' =>
  value === 'orbitRing' || value === 'elastic' || value === 'pulseDots';

const isPanelLoaderId = (value: unknown): value is 'orbitRing' | 'elastic' | 'scanDots' =>
  value === 'orbitRing' || value === 'elastic' || value === 'scanDots';

const isWorkersLoaderId = (value: unknown): value is LoaderId =>
  isAvatarLoaderId(value) || value === 'scanDots';

const isNightshiftLoaderId = (value: unknown): value is LoaderId =>
  value === 'orbitRing' || value === 'elastic' || value === 'pulseDots' || value === 'scanDots';

const readStoredSelection = (): LoaderSelection => {
  const fallback = { ...DEFAULT_SELECTION };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LoaderSelection> & { version?: number };
      // Older saves predate pulse dots, so the avatar moves to that default once.
      const agentAvatar =
        parsed.version === STORAGE_VERSION && isAvatarLoaderId(parsed.agentAvatar)
          ? parsed.agentAvatar
          : fallback.agentAvatar;
      // Older saves predate scan dots, so the custom panel moves to that default once.
      const customPanel =
        (parsed.version === STORAGE_VERSION || parsed.version === PANEL_SCAN_VERSION) &&
        isPanelLoaderId(parsed.customPanel)
          ? parsed.customPanel
          : fallback.customPanel;
      const workersRunning = isWorkersLoaderId(parsed.workersRunning)
        ? parsed.workersRunning
        : fallback.workersRunning;
      const nightshift = isNightshiftLoaderId(parsed.nightshift)
        ? parsed.nightshift
        : fallback.nightshift;
      return { agentAvatar, customPanel, workersRunning, nightshift };
    }

    const legacyAvatar = window.localStorage.getItem(LEGACY_AVATAR_KEY);
    return {
      ...fallback,
      agentAvatar: isAvatarLoaderId(legacyAvatar) ? legacyAvatar : fallback.agentAvatar,
    };
  } catch {
    return fallback;
  }
};

let current = readStoredSelection();
const listeners = new Set<() => void>();

/** Re-reads the saved choice. Used when storage changed outside `setLoader`. */
export const reloadLoadersFromStorage = (): void => {
  current = readStoredSelection();
  listeners.forEach((listener) => listener());
};

export const getLoader = (scenario: LoaderScenario): LoaderId => current[scenario];

export const setLoader = (scenario: LoaderScenario, loaderId: LoaderId): void => {
  if (!LOADER_IDS_BY_SCENARIO[scenario].includes(loaderId) || current[scenario] === loaderId) {
    return;
  }
  current = { ...current, [scenario]: loaderId };
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: STORAGE_VERSION, ...current })
    );
  } catch {
    // The choice still applies for this session when storage is unavailable.
  }
  listeners.forEach((listener) => listener());
};

export const subscribeLoaders = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
