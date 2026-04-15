/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

/**
 * Supported A2UI component types in the hybrid EUI catalog.
 *
 * Maps A2UI basic catalog primitives to EUI equivalents, plus
 * Kibana-specific extensions for domain content.
 */
export enum A2UIComponentType {
  Text = 'Text',
  Row = 'Row',
  Column = 'Column',
  Card = 'Card',
  Stat = 'Stat',
  Table = 'Table',
  DescriptionList = 'DescriptionList',
  Button = 'Button',
  Divider = 'Divider',
  Icon = 'Icon',
  Badge = 'Badge',
  VisualizationRef = 'VisualizationRef',
  FieldValue = 'FieldValue',
  TextInput = 'TextInput',
  TextArea = 'TextArea',
  Select = 'Select',
  ComboBox = 'ComboBox',
  Switch = 'Switch',
  FormGroup = 'FormGroup',
  Progress = 'Progress',
  Timeline = 'Timeline',
  Callout = 'Callout',
  Accordion = 'Accordion',
  StepsHeader = 'StepsHeader',
}

/**
 * The catalog ID for the Kibana EUI hybrid catalog.
 */
export const KIBANA_EUI_CATALOG_ID = 'https://elastic.co/kibana/a2ui/eui-catalog/0.1';

/**
 * A value that may be either a literal or a data-bound path (JSON Pointer, RFC 6901).
 */
export type DynamicValue<T> = T | { path: string };

const dynamicStringSchema = z.union([z.string(), z.object({ path: z.string() })]);
const dynamicNumberSchema = z.union([z.number(), z.object({ path: z.string() })]);

/**
 * Schema for an A2UI child list: either a static list of component IDs,
 * or a template binding for collection rendering.
 */
const childListSchema = z.union([
  z.array(z.string()),
  z.object({
    path: z.string(),
    component_id: z.string(),
  }),
]);

export type A2UIChildList = string[] | { path: string; component_id: string };

/**
 * A2UI action definition for interactive components.
 */
const a2uiActionSchema = z.object({
  event: z.object({
    name: z.string(),
    context: z.record(z.string(), z.unknown()).optional(),
  }),
});

export interface A2UIAction {
  event: {
    name: string;
    context?: Record<string, unknown>;
  };
}

/**
 * Table column definition.
 */
const a2uiTableColumnSchema = z.object({
  field: z.string(),
  name: dynamicStringSchema,
  width: z.string().optional(),
});

export interface A2UITableColumn {
  field: string;
  name: DynamicValue<string>;
  width?: string;
}

/**
 * Description list item definition.
 */
const a2uiDescriptionListItemSchema = z.object({
  title: dynamicStringSchema,
  description: dynamicStringSchema,
});

export interface A2UIDescriptionListItem {
  title: DynamicValue<string>;
  description: DynamicValue<string>;
}

/**
 * A single A2UI component in the flat adjacency list.
 */
export interface A2UIComponent {
  id: string;
  component: A2UIComponentType | string;
  children?: A2UIChildList;
  child?: string;
  text?: DynamicValue<string>;
  variant?: string;
  title?: DynamicValue<string>;
  description?: DynamicValue<string>;
  value?: DynamicValue<string | number>;
  icon?: string;
  color?: string;
  name?: string;
  columns?: A2UITableColumn[];
  items?: A2UIDescriptionListItem[];
  data_path?: string;
  action?: A2UIAction;
  attachment_id?: string;
  version?: number;
  field_name?: DynamicValue<string>;
  field_value?: DynamicValue<string>;
  axis?: 'horizontal' | 'vertical';
  align?: string;
  justify?: string;
  weight?: number;
  size?: string;
  /** Identifier for interactive form fields; used to collect form state on submit */
  field_id?: string;
  /** Placeholder text for input fields */
  placeholder?: string;
  /** Pre-set value for input fields or switches */
  default_value?: DynamicValue<string | number | boolean>;
  /** Option list for Select and ComboBox components. `icon` is an optional EUI icon type for ComboBox options. */
  options?: Array<{ value: string; label: string; icon?: string }>;
  /** Number of visible rows for TextArea */
  rows?: number;
  /** Label text for form fields */
  label?: DynamicValue<string>;
  /** Progress value (0-100) for Progress component */
  max?: number;
  /** Timeline items: array of {title, description, icon?, color?} */
  timeline_items?: Array<{
    title: DynamicValue<string>;
    description?: DynamicValue<string>;
    icon?: string;
    color?: string;
  }>;
  /** Callout title for Callout component */
  heading?: DynamicValue<string>;
  /** EUI icon type for Callout component */
  icon_type?: string;
  /** Whether accordion starts expanded */
  initially_open?: boolean;
  /** Step items for StepsHeader: array of {title, status?} */
  steps?: Array<{
    title: string;
    status?: 'incomplete' | 'disabled' | 'loading' | 'warning' | 'danger' | 'complete' | 'current';
  }>;
  /** Conditionally show this component only when a form field matches a value.
   *  `field` is the field_id of a Select/ComboBox/Switch, `value` is the expected value(s). */
  visible_when?: {
    field: string;
    value: string | string[];
  };
}

/**
 * Zod schema for a single A2UI component.
 *
 * Uses passthrough to tolerate additional props from the LLM
 * while still validating the structural requirements.
 */
export const a2uiComponentSchema = z
  .object({
    id: z.string(),
    component: z.string(),
    children: childListSchema.optional(),
    child: z.string().optional(),
    text: dynamicStringSchema.optional(),
    variant: z.string().optional(),
    title: dynamicStringSchema.optional(),
    description: dynamicStringSchema.optional(),
    value: z.union([dynamicStringSchema, dynamicNumberSchema]).optional(),
    icon: z.string().optional(),
    color: z.string().optional(),
    name: z.string().optional(),
    columns: z.array(a2uiTableColumnSchema).optional(),
    items: z.array(a2uiDescriptionListItemSchema).optional(),
    data_path: z.string().optional(),
    action: a2uiActionSchema.optional(),
    attachment_id: z.string().optional(),
    version: z.number().int().optional(),
    field_name: dynamicStringSchema.optional(),
    field_value: dynamicStringSchema.optional(),
    axis: z.enum(['horizontal', 'vertical']).optional(),
    align: z.string().optional(),
    justify: z.string().optional(),
    weight: z.number().optional(),
    size: z.string().optional(),
    field_id: z.string().optional(),
    placeholder: z.string().optional(),
    default_value: z.union([dynamicStringSchema, z.boolean()]).optional(),
    options: z
      .array(z.object({ value: z.string(), label: z.string(), icon: z.string().optional() }))
      .optional(),
    rows: z.number().int().optional(),
    label: dynamicStringSchema.optional(),
    max: z.number().optional(),
    timeline_items: z
      .array(
        z.object({
          title: dynamicStringSchema,
          description: dynamicStringSchema.optional(),
          icon: z.string().optional(),
          color: z.string().optional(),
        })
      )
      .optional(),
    heading: dynamicStringSchema.optional(),
    icon_type: z.string().optional(),
    initially_open: z.boolean().optional(),
    steps: z
      .array(
        z.object({
          title: z.string(),
          status: z
            .enum(['incomplete', 'disabled', 'loading', 'warning', 'danger', 'complete', 'current'])
            .optional(),
        })
      )
      .optional(),
    visible_when: z
      .object({
        field: z.string(),
        value: z.union([z.string(), z.array(z.string())]),
      })
      .optional(),
  })
  .passthrough();

/**
 * Data stored on an `a2ui_surface` attachment.
 */
export interface A2UISurfaceAttachmentData {
  /** Unique surface identifier within the conversation */
  surface_id: string;
  /** Catalog ID declaring which components are available */
  catalog_id: string;
  /** Flat adjacency list of component definitions. Must include exactly one with id "root". */
  components: A2UIComponent[];
  /** Data model for data-bound components (JSON Pointer paths resolve against this) */
  data_model?: Record<string, unknown>;
  /** Display title for the surface (shown in attachment pills) */
  title?: string;
}

const MAX_COMPONENTS = 100;
const MAX_TREE_DEPTH = 10;

/**
 * Validates the component tree integrity:
 * - Exactly one `root` component
 * - All child references point to existing component IDs
 * - No cycles (depth-limited traversal)
 * - Component count within bounds
 */
const validateComponentTree = (components: A2UIComponent[]): string | undefined => {
  if (components.length === 0) {
    return 'Components list must not be empty';
  }
  if (components.length > MAX_COMPONENTS) {
    return `Components list exceeds maximum of ${MAX_COMPONENTS}`;
  }

  const ids = new Set(components.map((c) => c.id));
  const rootComponents = components.filter((c) => c.id === 'root');

  if (rootComponents.length === 0) {
    return 'Components must include exactly one component with id "root"';
  }
  if (rootComponents.length > 1) {
    return 'Components must include exactly one component with id "root", found multiple';
  }

  for (const comp of components) {
    const childIds = getChildIds(comp);
    for (const childId of childIds) {
      if (!ids.has(childId)) {
        return `Component "${comp.id}" references unknown child "${childId}"`;
      }
    }
  }

  const componentMap = new Map(components.map((c) => [c.id, c]));
  const depthError = checkDepth(componentMap, 'root', 0);
  if (depthError) {
    return depthError;
  }

  return undefined;
};

const getChildIds = (comp: A2UIComponent): string[] => {
  const ids: string[] = [];
  if (comp.child) {
    ids.push(comp.child);
  }
  if (Array.isArray(comp.children)) {
    ids.push(...comp.children);
  }
  return ids;
};

const checkDepth = (
  componentMap: Map<string, A2UIComponent>,
  id: string,
  depth: number
): string | undefined => {
  if (depth > MAX_TREE_DEPTH) {
    return `Component tree exceeds maximum depth of ${MAX_TREE_DEPTH}`;
  }
  const comp = componentMap.get(id);
  if (!comp) return undefined;

  for (const childId of getChildIds(comp)) {
    const err = checkDepth(componentMap, childId, depth + 1);
    if (err) return err;
  }
  return undefined;
};

/**
 * Zod schema for A2UI surface attachment data.
 */
export const a2uiSurfaceAttachmentDataSchema = z
  .object({
    surface_id: z.string(),
    catalog_id: z.string(),
    components: z.array(a2uiComponentSchema),
    data_model: z.record(z.string(), z.unknown()).optional(),
    title: z.string().optional(),
  })
  .check((ctx) => {
    const treeError = validateComponentTree(ctx.value.components);
    if (treeError) {
      ctx.issues.push({
        code: 'custom',
        message: treeError,
        input: ctx.value,
      });
    }
  });
