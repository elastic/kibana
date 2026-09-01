/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomContentContextAttachmentData } from '../../common/panel_context_attachment';
import { registerPanelPreviewHandler, previewPanelVersion } from './panel_preview_registry';

const makeData = (embeddableId: string): CustomContentContextAttachmentData => ({
  panel_template: '<p>v1</p>',
  esql_query: 'FROM logs',
  panel_title: 'My Panel',
  embeddable_id: embeddableId,
});

// The registry is module-level state shared by every test in this file, so each test uses its own
// embeddable id rather than relying on execution order.
describe('panel preview registry', () => {
  it('routes a version to the handler registered for its embeddable_id', () => {
    const handler = jest.fn();
    registerPanelPreviewHandler('routes', handler);

    const data = makeData('routes');
    expect(previewPanelVersion(data)).toBe(true);
    expect(handler).toHaveBeenCalledWith(data);
  });

  it('routes to the matching panel only when several are registered', () => {
    const first = jest.fn();
    const second = jest.fn();
    registerPanelPreviewHandler('multi-a', first);
    registerPanelPreviewHandler('multi-b', second);

    previewPanelVersion(makeData('multi-b'));

    expect(second).toHaveBeenCalled();
    expect(first).not.toHaveBeenCalled();
  });

  it('reports failure when the panel is not mounted', () => {
    expect(previewPanelVersion(makeData('never-registered'))).toBe(false);
  });

  it('stops routing after unregistering', () => {
    const handler = jest.fn();
    const unregister = registerPanelPreviewHandler('unregister', handler);

    unregister();

    expect(previewPanelVersion(makeData('unregister'))).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });

  it('keeps the newer handler when a remount re-registers the same id', () => {
    const stale = jest.fn();
    const fresh = jest.fn();
    const unregisterStale = registerPanelPreviewHandler('remount', stale);
    registerPanelPreviewHandler('remount', fresh);

    // React can run the previous effect's cleanup after the new effect registered; that must not
    // tear down the live handler.
    unregisterStale();

    expect(previewPanelVersion(makeData('remount'))).toBe(true);
    expect(fresh).toHaveBeenCalled();
    expect(stale).not.toHaveBeenCalled();
  });
});
