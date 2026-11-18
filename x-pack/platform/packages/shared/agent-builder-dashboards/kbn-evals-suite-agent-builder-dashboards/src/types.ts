/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScreenContextAttachmentData } from '@kbn/agent-builder-common/attachments';
import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import type { VisualizationAttachmentData } from '@kbn/agent-builder-visualizations-common';
import type { Evaluator, Example } from '@kbn/evals';
import type { ConfigGold } from './config_gold';
import type { EnhanceDefectId } from './evaluators/seed_defects';
import type { EnhanceMode } from './extract_dashboard';
import type { EsqlQueryResultsData } from './fixtures/dissect_logs_results';

export type { EnhanceMode };

/** Which skill the request should reach: the dashboard skill, the visualization skill, or neither. */
export type DashboardRoute = 'dashboard' | 'visualization' | 'none';

/** What the prompt pins down about the produced dashboard; anything not listed is unchecked. */
export interface DashboardStructureGold {
  panelCount?: { min?: number; max?: number };
  /** Exact number of panels per kind (`metric`, `xy`, `markdown`, …); unlisted kinds are free. */
  panelKinds?: Record<string, number>;
  sectionCount?: number;
  sections?: Array<{
    titleIncludesAny: string[];
    minPanels?: number;
    /** ES|QL the section's panels must run, one panel per query (whitespace-insensitive). */
    queries?: string[];
  }>;
  /**
   * Rows the prompt lays out, top to bottom: all panels of `kind` share one row
   * (same top and height) directly below the previous one, spanning the 48
   * columns when `fullWidth`. `atTop` pins the row to the top of the dashboard.
   */
  rows?: Array<{ kind: string; fullWidth?: boolean; atTop?: boolean }>;
}

export interface EnhanceGold {
  mode: EnhanceMode;
  /** True when the request does not name a mode, so the agent must ask. */
  asksMode: boolean;
  /** Rules the seeded dashboard breaks that this mode is expected to fix. */
  defects: EnhanceDefectId[];
}

/** An answer to the mode question that names specific charts: only those may change. */
export interface ScopedEnhanceGold {
  /** Ids of the seeded panels the request names. */
  panelIds: string[];
}

/** The top-level container in layout edit gold; sections are named by id. */
export const TOP_LEVEL = 'top';

/**
 * A seed panel or section id, or the first panel of `kind` the edit added
 * (`{ added: 'section' }` for the first added section).
 */
export type LayoutItem = string | { added: string };

/**
 * Where a prompt puts one panel or section; every listed field is checked.
 * Panel ids in `beside`, `below`, `after` and `before` share the item's
 * container. For a section, `after` and `before` follow the outer order.
 */
export interface LayoutPlacementGold {
  item: LayoutItem;
  /** `TOP_LEVEL` or a section id. */
  in?: string;
  /** First in its container's reading order. */
  first?: boolean;
  /** Same row and height as this panel. */
  beside?: string;
  /** Starts on the row where this panel ends. */
  below?: string;
  w?: number;
  /** Later in reading order than this item. */
  after?: string;
  /** Earlier in reading order than this item. */
  before?: string;
  /** Next in reading order after this item, with nothing in between. */
  directlyAfter?: string;
  /** Chart kind of the panel (`metric`, `xy`, `data_table`, …). */
  kind?: string;
  /** For a section: it holds at least `count` panels, of `kind` when given. */
  holds?: { count: number; kind?: string };
}

/** What a layout edit prompt may change, and where it puts things. */
export interface LayoutEditGold {
  /** Containers the edit may rearrange: `TOP_LEVEL` or section ids. The rest keep their grids. */
  changes: readonly string[];
  /** Seed panels and sections the prompt removes. */
  removed?: readonly string[];
  /** Seed panels the prompt edits; their config or chart type must differ from the seed. */
  changed?: readonly string[];
  placements?: readonly LayoutPlacementGold[];
}

/** A named hue a static panel color may be asked for. */
export type PanelColorName = 'red' | 'blue';

/**
 * What one seed panel looks like after an edit, in the attachment's own shape.
 * `type` and `config` are subset-matched; `color`, `bulletList`,
 * `contentIncludes` and `vegaMark` cover what no exact value can express.
 */
export interface PanelEditGold {
  /** Seed panel id, which the edit keeps, or `{ added: kind }` for the first panel of that kind the edit added. */
  panel: LayoutItem;
  /** Embeddable type (`vega`, `markdown`, …); a Lens chart is named by `config.type`. */
  type?: string;
  /** Partial panel config; a Vega `spec` is written as an object. */
  config?: ConfigGold;
  /** Some `color`, `fill` or `stroke` in the config (or Vega spec) has this hue. */
  color?: PanelColorName;
  /** The markdown content holds a bullet list of at least two items. */
  bulletList?: boolean;
  /** The markdown content mentions each term, ignoring case. */
  contentIncludes?: readonly string[];
  /** The Vega spec draws a mark of this type (`rect` for a heatmap), in any view or layer. */
  vegaMark?: string;
}

/**
 * A panel the agent cannot edit in place (a data-view Lens or Query DSL Vega chart): it
 * must stay as it was, and the agent offers to replace it with a new panel.
 */
export interface ReplaceConfirmationGold {
  panel: string;
}

/** Something the prompt asks for that the data cannot back, such as an index that does not exist. */
export interface UnavailableRequestGold {
  /** How the reply judge refers to it, such as `payments`. */
  name: string;
}

/** Where the dashboard's controls may draw their fields from, and what the prompt asked of them. */
export interface ControlsGold {
  /**
   * True when the prompt asked for controls. The agent then flags them
   * `user_requested`, and accounts for any the server could not add.
   */
  requested: boolean;
  /** Fields mapped on the dashboard's index; a control on any other field is a broken dropdown. */
  mappedFields: readonly string[];
  /** Fields the prompt names a control for, matched with or without `.keyword`. */
  mustInclude?: readonly string[];
  /** Fields the prompt removes the control of, matched with or without `.keyword`. */
  mustExclude?: readonly string[];
  /** Fields the prompt asks a range slider for, matched with or without `.keyword`. */
  rangeSliders?: readonly string[];
  /** True when the dashboard must keep exactly one time slider, false when the prompt removes it. */
  timeSlider?: boolean;
  /**
   * Filters the prompt asks for by name. Each needs a stored control on one of
   * its substitutes, or the reply judge checks the reply says it could not be added.
   */
  requestedFilters?: readonly RequestedFilterGold[];
}

export interface RequestedFilterGold {
  name: string;
  /** Mapped fields that stand in for it, matched with or without `.keyword`. */
  substitutes: readonly string[];
}

/** A visualization attachment by id, as the visualization skill stores it on the conversation. */
export interface VisualizationAttachment {
  id: string;
  data: VisualizationAttachmentData;
}

export type DashboardDatasetExample = Example<
  {
    question: string;
    /** Seeded dashboard sent as a by-value attachment with the opening turn. */
    dashboard?: DashboardAttachmentData;
    /** Mode to pick, or free text to type, if the agent asks which enhance mode to apply. */
    modeAnswer?: EnhanceMode | { text: string };
    /** Discover ES|QL results sent as an attachment with the opening turn, as the 'AI Agent' action does. */
    esqlResults?: EsqlQueryResultsData;
    /** Screen context sent with the opening turn, as the app attaches it from the page the user is on. */
    screenContext?: ScreenContextAttachmentData;
    /** Visualizations the agent created earlier in the conversation, sent as attachments. */
    visualizations?: readonly VisualizationAttachment[];
  },
  {
    route?: DashboardRoute;
    structure?: DashboardStructureGold;
    enhance?: EnhanceGold;
    scopedEnhance?: ScopedEnhanceGold;
    controls?: ControlsGold;
    /** The time range the dashboard must end up with. */
    timeRange?: { from: string; to: string };
    layoutEdit?: LayoutEditGold;
    /** Panels the prompt edits in place, and what each must look like after. */
    panelEdits?: readonly PanelEditGold[];
    replaceConfirmation?: ReplaceConfirmationGold;
    /** Requests the agent must neither build nor drop silently. */
    unavailableRequests?: readonly UnavailableRequestGold[];
    /** Nothing in the request can be built, so the turn must end without a dashboard. */
    noDashboard?: boolean;
    /**
     * Panel types the prompt asks for whose config schema is only in a skill reference. The agent
     * reads each type's reference before writing a panel of it.
     */
    panelConfigTypes?: readonly string[];
    goldenToolPath?: string[];
  },
  {
    agentId?: string;
    [key: string]: unknown;
  }
>;

export interface DashboardAgentTaskOutput {
  /** Error results of the agent's tool calls. */
  errors: unknown[];
  messages: Array<{ message: string }>;
  steps?: Array<Record<string, unknown>>;
  agentTraceId?: string;
  /** One agent trace per converse turn, in order; `agentTraceId` is the last. */
  agentTraceIds?: string[];
  traceId?: string;
  /** Number of converse turns the task ran (2 when it answered the mode question). */
  turns?: number;
  /** Structured prompts the agent raised on the opening turn. */
  openingPrompts?: unknown[];
  /** Tool ids the agent called on the opening turn. */
  openingToolIds?: string[];
  /** The seeded dashboard as the conversation stored it. */
  before?: DashboardAttachmentData;
  /** The dashboard after the last turn, read from the conversation. */
  dashboard?: DashboardAttachmentData;
}

export type DashboardAgentEvaluator = Evaluator<DashboardDatasetExample, DashboardAgentTaskOutput>;

export type EvaluateDataset = ({
  dataset,
}: {
  dataset: {
    name: string;
    description: string;
    examples: DashboardDatasetExample[];
  };
}) => Promise<void>;
