/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { upperFirst } from 'lodash';
import { validate as isUuid } from 'uuid';
import type { AttachmentPanel } from '@kbn/agent-builder-dashboards-common';
import { getIndexedIds, type DashboardIndex } from '../dashboard_state';
import { DASHBOARD_FAILURE_TYPES } from '../failure_types';
import type { PlannedControl } from '../controls';
import { planPanelContent, type PanelContentSource } from '../panels';
import type { DashboardFailure } from '../utils';
import type { DashboardUpsert, UpsertPanelItem, UpsertSectionItem } from './schema';

type RecordFailure = (kind: ItemKind | undefined, identifier: string, error: string) => void;

/**
 * Collects the failures of one planning step, once per item and error, so the step can return them.
 */
const createFailureRecorder = (): {
  failures: DashboardFailure[];
  recordFailure: RecordFailure;
} => {
  const failures: DashboardFailure[] = [];
  return {
    failures,
    recordFailure: (kind, identifier, error) => {
      if (
        !failures.some((failure) => failure.identifier === identifier && failure.error === error)
      ) {
        failures.push({ type: DASHBOARD_FAILURE_TYPES.upsertDashboard, kind, identifier, error });
      }
    },
  };
};

export interface PlannedRemovals {
  panelIds: ReadonlySet<string>;
  sectionIds: ReadonlySet<string>;
  controlIds: ReadonlySet<string>;
}

/**
 * The change of one panel. A new panel is added to `target`. An existing panel gets `content` when
 * given and moves when it has a `target`. A target is a section id, or null for the top level.
 */
export type PanelChange<Content> =
  | { id: string; existingPanel?: undefined; target: string | null; content: Content }
  | { id: string; existingPanel: AttachmentPanel; target?: string | null; content?: Content };

export type PlannedPanel = PanelChange<PanelContentSource>;

export interface NewSection {
  id: string;
  title: string;
  collapsed?: boolean;
}

export type DashboardMetadata = Pick<DashboardUpsert, 'title' | 'description' | 'time_range'>;

/** The changes of one upsert call that can be applied, decided against the original dashboard. */
export interface UpsertPlan {
  metadata: DashboardMetadata;
  sectionUpdates: UpsertSectionItem[];
  newSections: NewSection[];
  panels: PlannedPanel[];
  controls: PlannedControl[];
  removals: PlannedRemovals;
  /** Ids of the panels, sections, and controls the dashboard has or the call names. */
  reservedIds: ReadonlySet<string>;
  failures: DashboardFailure[];
}

type ItemKind = 'panel' | 'section' | 'control';

const ITEM_KINDS: readonly ItemKind[] = ['panel', 'section', 'control'];

const getOriginalIdsByKind = ({
  panelsById,
  sectionsById,
  controlsById,
}: DashboardIndex): Record<ItemKind, ReadonlyMap<string, unknown>> => ({
  panel: panelsById,
  section: sectionsById,
  control: controlsById,
});

const findDuplicates = (ids: string[]): Set<string> =>
  new Set(ids.filter((id, index) => ids.indexOf(id) !== index));

/**
 * Creates a check that returns the error of a requested id that is listed twice, belongs to an item
 * of another kind, or is a new id that contains brackets or looks like a uuid. Brackets would read
 * like the position a control without an id is reported under. Ids the agent picks are readable
 * slugs, so a uuid that matches nothing is almost always a miscopied id of an existing item, and
 * creating it would duplicate that item instead of updating it. Ids of the dashboard win over
 * requested ids, and requested sections over panels over controls.
 */
const createIdCheck = (
  original: DashboardIndex,
  requestedIdsByKind: Record<ItemKind, string[]>
): ((kind: ItemKind, id: string) => string | undefined) => {
  const originalIdsByKind = getOriginalIdsByKind(original);
  const kindById = new Map<string, ItemKind>();
  const claim = (kind: ItemKind, ids: Iterable<string>) => {
    for (const id of ids) {
      if (!kindById.has(id)) {
        kindById.set(id, kind);
      }
    }
  };
  for (const kind of ITEM_KINDS) {
    claim(kind, originalIdsByKind[kind].keys());
  }
  claim('section', requestedIdsByKind.section);
  claim('panel', requestedIdsByKind.panel);
  claim('control', requestedIdsByKind.control);
  const duplicateIdsByKind: Record<ItemKind, Set<string>> = {
    panel: findDuplicates(requestedIdsByKind.panel),
    section: findDuplicates(requestedIdsByKind.section),
    control: findDuplicates(requestedIdsByKind.control),
  };

  return (kind, id) => {
    const isNewId = !originalIdsByKind[kind].has(id);
    if (isNewId && /[[\]]/.test(id)) {
      return `"${id}" contains "[" or "]", which ids cannot contain.`;
    }
    if (duplicateIdsByKind[kind].has(id)) {
      const hint = kind === 'panel' ? ', with its `section` and `content` in the same item' : '';
      return `${upperFirst(kind)} "${id}" appears more than once. List each ${kind} once${hint}.`;
    }
    const owner = kindById.get(id);
    if (owner !== undefined && owner !== kind) {
      return `"${id}" is a ${owner} id. Use a different id for the ${kind}.`;
    }
    if (isNewId && isUuid(id)) {
      return `No ${kind} has id "${id}". Copy the id exactly from the dashboard to update the ${kind}, or use a short readable id to create a new one.`;
    }
    return undefined;
  };
};

/**
 * The container a panel item moves its panel to: a section id, or null for the top level.
 * Undefined when the panel stays in its current container.
 */
const getMoveTarget = (
  { id, section }: UpsertPanelItem,
  sectionIdByPanelId: ReadonlyMap<string, string | null>
): string | null | undefined =>
  section === undefined || section === sectionIdByPanelId.get(id) ? undefined : section;

/** A valid panel item and the container it moves its existing panel to, if any. */
interface PanelPlacement {
  item: UpsertPanelItem;
  moveTo: string | null | undefined;
}

interface ValidItems {
  sectionUpdates: UpsertSectionItem[];
  newSections: NewSection[];
  /** Panels with valid ids and existing or created target sections. */
  panels: UpsertPanelItem[];
  removedIds: Set<string>;
  controls: PlannedControl[];
  /** Ids that are both updated and removed, so neither change applies. */
  conflictingIds: Set<string>;
  failures: DashboardFailure[];
}

/**
 * Checks every requested id against the dashboard and the rest of the call, recording one failure
 * for each item that cannot be applied and leaving it out. An id that is both updated and removed
 * is left out of both, unless the update is for another kind of item than the removed one, which
 * only fails the update.
 */
const rejectInvalidItems = (
  original: DashboardIndex,
  { sections = [], panels = [], controls = [], remove = [] }: DashboardUpsert
): ValidItems => {
  const { failures, recordFailure } = createFailureRecorder();
  const requestedRemovals = new Set(remove);
  const originalIdsByKind = getOriginalIdsByKind(original);
  const updatesRemovedItem = (kind: ItemKind, id: string | undefined): id is string =>
    id !== undefined &&
    requestedRemovals.has(id) &&
    ITEM_KINDS.every(
      (originalKind) => originalKind === kind || !originalIdsByKind[originalKind].has(id)
    );
  const findConflicts = (
    kind: ItemKind,
    ids: Array<string | undefined>
  ): Array<[string, ItemKind]> =>
    ids.flatMap((id) => (updatesRemovedItem(kind, id) ? [[id, kind]] : []));
  const conflictingKindById = new Map([
    ...findConflicts(
      'section',
      sections.map(({ id }) => id)
    ),
    ...findConflicts(
      'panel',
      panels.map(({ id }) => id)
    ),
    ...findConflicts(
      'control',
      controls.map(({ id }) => id)
    ),
  ]);
  for (const [id, kind] of conflictingKindById) {
    recordFailure(
      kind,
      id,
      `"${id}" is both updated and removed in this call, so neither change was applied. Do only one.`
    );
  }
  const conflictingIds = new Set(conflictingKindById.keys());
  const isNotConflicting = ({ id }: { id: string }) => !conflictingIds.has(id);
  const requestedSections = sections.filter(isNotConflicting);
  const requestedPanels = panels.filter(isNotConflicting);
  const removedIds = new Set([...requestedRemovals].filter((id) => !conflictingIds.has(id)));

  const { panelsById, sectionsById, controlsById } = original;
  const getIdError = createIdCheck(original, {
    section: requestedSections.map(({ id }) => id),
    panel: requestedPanels.map(({ id }) => id),
    control: controls.flatMap(({ id }) => (id === undefined || conflictingIds.has(id) ? [] : id)),
  });

  const sectionUpdates: UpsertSectionItem[] = [];
  const newSections: NewSection[] = [];
  for (const section of requestedSections) {
    const { id, title, collapsed } = section;
    const idError = getIdError('section', id);
    if (idError) {
      recordFailure('section', id, idError);
    } else if (sectionsById.has(id)) {
      sectionUpdates.push(section);
    } else if (title === undefined) {
      recordFailure('section', id, `Section "${id}" does not exist. Provide a title to create it.`);
    } else {
      newSections.push({ id, title, collapsed });
    }
  }
  const sectionIds = new Set([...sectionsById.keys(), ...newSections.map(({ id }) => id)]);
  const requestedSectionIds = new Set(sections.map(({ id }) => id));

  const validPanels = requestedPanels.filter(({ id, section, content }) => {
    const idError = getIdError('panel', id);
    if (idError) {
      recordFailure('panel', id, idError);
      return false;
    }
    if (typeof section === 'string' && !sectionIds.has(section)) {
      recordFailure(
        'panel',
        id,
        requestedSectionIds.has(section)
          ? `Section "${section}" was not created (see its failure), so panel "${id}" cannot be placed in it.`
          : `Section "${section}" not found. Create it in \`sections\` or use an existing section id.`
      );
      return false;
    }
    if (!content && !panelsById.has(id)) {
      recordFailure('panel', id, `Panel "${id}" does not exist. Provide content to create it.`);
      return false;
    }
    return true;
  });

  const validControls = controls.flatMap((control, index): PlannedControl[] => {
    const { id } = control;
    if (id === undefined) {
      return [{ identifier: `controls[${index}]`, control }];
    }
    if (conflictingIds.has(id)) {
      return [];
    }
    const idError = getIdError('control', id);
    if (idError) {
      recordFailure('control', id, idError);
      return [];
    }
    return [{ identifier: id, control, replaces: controlsById.has(id) ? id : undefined }];
  });

  return {
    sectionUpdates,
    newSections,
    panels: validPanels,
    controls: validControls,
    removedIds,
    conflictingIds,
    failures,
  };
};

/**
 * Decides in one pass what happens to every removed id and to the panels around removed sections.
 * Panels cannot move into a section listed in `remove`. Panels left in a removed section are
 * removed with it, but the section is kept when a panel the call lists to move out of it, or to
 * both update and remove, cannot leave.
 */
const planRemovals = ({
  original: { panelsById, sectionsById, controlsById, sectionIdByPanelId },
  requestedPanels,
  validPanels,
  removedIds,
  conflictingIds,
}: {
  original: DashboardIndex;
  requestedPanels: UpsertPanelItem[];
  validPanels: UpsertPanelItem[];
  removedIds: ReadonlySet<string>;
  conflictingIds: ReadonlySet<string>;
}): { removals: PlannedRemovals; panels: PanelPlacement[]; failures: DashboardFailure[] } => {
  const { failures, recordFailure } = createFailureRecorder();

  const movablePanels = validPanels.flatMap((item): PanelPlacement[] => {
    const moveTo = getMoveTarget(item, sectionIdByPanelId);
    if (typeof moveTo === 'string' && removedIds.has(moveTo)) {
      recordFailure(
        'panel',
        item.id,
        `Section "${moveTo}" is listed in \`remove\`, so panels cannot move into it. Place panel "${item.id}" in a section that stays, or keep the section.`
      );
      return [];
    }
    return [{ item, moveTo }];
  });
  const leavingPanelIds = new Set(
    movablePanels.flatMap(({ item: { id }, moveTo }) => (moveTo === undefined ? [] : [id]))
  );
  const cannotLeave = (item: UpsertPanelItem): boolean =>
    conflictingIds.has(item.id) ||
    (getMoveTarget(item, sectionIdByPanelId) !== undefined && !leavingPanelIds.has(item.id));
  const getStuckPanelIds = (sectionId: string): string[] => [
    ...new Set(
      requestedPanels
        .filter((item) => sectionIdByPanelId.get(item.id) === sectionId && cannotLeave(item))
        .map(({ id }) => id)
    ),
  ];

  const removals = {
    panelIds: new Set<string>(),
    sectionIds: new Set<string>(),
    controlIds: new Set<string>(),
  };
  for (const id of removedIds) {
    if (panelsById.has(id)) {
      removals.panelIds.add(id);
    } else if (sectionsById.has(id)) {
      const stuckPanelIds = getStuckPanelIds(id);
      if (stuckPanelIds.length > 0) {
        recordFailure(
          'section',
          id,
          `Section "${id}" was not removed because removing it would also delete ${stuckPanelIds
            .map((panelId) => `"${panelId}"`)
            .join(
              ', '
            )}, whose change in this call was not applied (see their failures). Fix those panels and remove the section again.`
        );
        continue;
      }
      removals.sectionIds.add(id);
    } else if (controlsById.has(id)) {
      removals.controlIds.add(id);
    } else {
      recordFailure(undefined, id, `Nothing with id "${id}" exists on the dashboard.`);
    }
  }

  const placedPanels = movablePanels.filter(({ item: { id }, moveTo }) => {
    const currentSectionId = sectionIdByPanelId.get(id);
    if (moveTo === undefined && currentSectionId && removals.sectionIds.has(currentSectionId)) {
      recordFailure(
        'panel',
        id,
        `Panel "${id}" is in section "${currentSectionId}", which is removed in this call, so the panel is removed with it. To keep the panel, move it out with \`section\`.`
      );
      return false;
    }
    return true;
  });

  return { removals, panels: placedPanels, failures };
};

/** Plans the content of every panel. An existing panel whose content is rejected is still moved. */
const planPanels = ({
  original: { panelsById },
  panels,
}: {
  original: DashboardIndex;
  panels: PanelPlacement[];
}): { panels: PlannedPanel[]; failures: DashboardFailure[] } => {
  const { failures, recordFailure } = createFailureRecorder();

  const plannedPanels = panels.flatMap(({ item: { id, content }, moveTo }): PlannedPanel[] => {
    const existingPanel = panelsById.get(id);
    const contentSource = content && planPanelContent({ id, content, existingPanel });
    if (contentSource && 'error' in contentSource) {
      recordFailure('panel', id, contentSource.error);
      return existingPanel ? [{ id, existingPanel, target: moveTo }] : [];
    }
    if (existingPanel) {
      return [{ id, existingPanel, target: moveTo, content: contentSource }];
    }
    // New panels without content are rejected by `rejectInvalidItems`.
    return contentSource ? [{ id, target: moveTo ?? null, content: contentSource }] : [];
  });
  return { panels: plannedPanels, failures };
};

/**
 * Decides which changes of the call can be applied, checking every id against the original
 * dashboard only, so the result does not depend on the order the changes are applied in.
 */
export const planUpsert = ({
  original,
  upsert,
}: {
  original: DashboardIndex;
  upsert: DashboardUpsert;
}): UpsertPlan => {
  const {
    title,
    description,
    time_range: timeRange,
    sections = [],
    panels = [],
    controls = [],
    remove = [],
  } = upsert;
  const validItems = rejectInvalidItems(original, upsert);
  const placement = planRemovals({
    original,
    requestedPanels: panels,
    validPanels: validItems.panels,
    removedIds: validItems.removedIds,
    conflictingIds: validItems.conflictingIds,
  });
  const plannedPanels = planPanels({ original, panels: placement.panels });

  return {
    metadata: { title, description, time_range: timeRange },
    sectionUpdates: validItems.sectionUpdates,
    newSections: validItems.newSections,
    panels: plannedPanels.panels,
    controls: validItems.controls,
    removals: placement.removals,
    reservedIds: new Set([
      ...getIndexedIds(original),
      ...[...sections, ...panels, ...controls].flatMap(({ id }) => id ?? []),
      ...remove,
    ]),
    failures: [...validItems.failures, ...placement.failures, ...plannedPanels.failures],
  };
};
