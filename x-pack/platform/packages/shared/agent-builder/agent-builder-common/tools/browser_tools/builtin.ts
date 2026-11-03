/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import type { BrowserToolDescriptor } from './types';
import { zodToBrowserToolSchema } from './schema';

export const builtinBrowserToolIds = {
  getPageSnapshot: 'get_page_snapshot',
  takeScreenshot: 'take_screenshot',
  clickElement: 'click_element',
  fillForm: 'fill_form',
  navigateTo: 'navigate_to',
} as const;

export const getPageSnapshotSchema = lazySchema(() => z.object({}));
export const takeScreenshotSchema = lazySchema(() => z.object({}));
export const clickElementSchema = lazySchema(() =>
  z.object({
    ref: z.string().describe('Element reference from get_page_snapshot, e.g. "s3e7"'),
  })
);
export const fillFormSchema = lazySchema(() =>
  z.object({
    fields: z.array(z.object({ ref: z.string(), value: z.string() })).min(1),
  })
);
export const navigateToSchema = lazySchema(() =>
  z.object({
    app_id: z
      .string()
      .describe('Kibana app id, as listed in the "apps" section of get_page_snapshot'),
    path: z.string().optional(),
  })
);

export const builtinBrowserToolDescriptors: BrowserToolDescriptor[] = [
  {
    id: builtinBrowserToolIds.getPageSnapshot,
    description:
      'Returns a compact accessibility-style snapshot of the page the user is looking at: landmarks, interactive elements with reference ids (ref) you can pass to click_element and fill_form, their current values, and the list of Kibana apps you can navigate to. Take a new snapshot after any action that changes the page.',
    schema: zodToBrowserToolSchema(getPageSnapshotSchema),
  },
  {
    id: builtinBrowserToolIds.takeScreenshot,
    description:
      "Takes a PNG screenshot of the user's current viewport and returns it as an image. Use it when layout or visual state matters; use get_page_snapshot to find elements to act on.",
    schema: zodToBrowserToolSchema(takeScreenshotSchema),
  },
  {
    id: builtinBrowserToolIds.clickElement,
    description:
      'Clicks the element identified by a ref from the latest get_page_snapshot. Returns a fresh snapshot. Fails with a stale-ref error if the page changed; take a new snapshot then.',
    schema: zodToBrowserToolSchema(clickElementSchema),
  },
  {
    id: builtinBrowserToolIds.fillForm,
    description:
      'Sets the value of one or more form fields identified by refs from the latest get_page_snapshot, dispatching the input events the page expects. Returns per-field status and a fresh snapshot.',
    schema: zodToBrowserToolSchema(fillFormSchema),
  },
  {
    id: builtinBrowserToolIds.navigateTo,
    description:
      "Navigates the user's browser to a Kibana app by app id (optionally with a path inside the app), without reloading the page. Take get_page_snapshot first if you do not know the app id.",
    schema: zodToBrowserToolSchema(navigateToSchema),
  },
];

const builtinIdSet = new Set<string>(Object.values(builtinBrowserToolIds));

export const isBuiltinBrowserToolId = (id: string): boolean => builtinIdSet.has(id);
