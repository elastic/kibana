/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { createMemoryHistory, createPath } from 'history';
import type { LocationDescriptorObject } from 'history';
import type { ScopedHistory } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { useKibana } from './use_kibana';
import { usePageLeavePrompt } from './use_page_leave_prompt';

jest.mock('./use_kibana', () => ({ useKibana: jest.fn() }));

const APP_BASE_PATH = '/app/streams';
const MAP_PATH = '/v2/unit/edge/map';
const SOURCES_PATH = '/v2/unit/edge/sources';

/**
 * Mimics core: the browser history's pathname excludes the Kibana base path and its createHref
 * adds it, while ScopedHistory strips the app scope from `location` but hands `block` callbacks
 * the parent-level location.
 */
const createScopedHistory = (kibanaBasePath: string): ScopedHistory => {
  const parent = createMemoryHistory({ initialEntries: [`${APP_BASE_PATH}${MAP_PATH}`] });
  const scoped = {
    get location() {
      return {
        ...parent.location,
        pathname: parent.location.pathname.slice(APP_BASE_PATH.length),
      };
    },
    push: (path: string) => parent.push(`${APP_BASE_PATH}${path}`),
    block: parent.block,
    createHref: (
      location: LocationDescriptorObject,
      { prependBasePath = true }: { prependBasePath?: boolean } = {}
    ) =>
      `${kibanaBasePath}${createPath({
        ...location,
        pathname: prependBasePath ? `${APP_BASE_PATH}${location.pathname}` : location.pathname,
      })}`,
  };
  return scoped as unknown as ScopedHistory;
};

const renderPrompt = ({
  basePath,
  hasUnsavedChanges,
}: {
  basePath: string;
  hasUnsavedChanges: boolean;
}) => {
  const history = createScopedHistory(basePath);
  const core = coreMock.createStart({ basePath });
  jest
    .mocked(useKibana)
    .mockReturnValue({ appParams: { history }, core } as unknown as ReturnType<typeof useKibana>);
  const { rerender } = renderHook((props) => usePageLeavePrompt(props), {
    initialProps: { hasUnsavedChanges },
  });
  return { history, core, rerender };
};

describe('usePageLeavePrompt', () => {
  describe.each(['/rs', '/rs/s/my-space', ''])('with Kibana base path "%s"', (basePath) => {
    it('lets a push that keeps the pathname through', () => {
      const { history, core } = renderPrompt({ basePath, hasUnsavedChanges: true });

      history.push(`${MAP_PATH}?mapState=(flyoutName:elasticsearch)`);

      expect(history.location.pathname).toBe(MAP_PATH);
      expect(history.location.search).toBe('?mapState=(flyoutName:elasticsearch)');
      expect(core.overlays.openConfirm).not.toHaveBeenCalled();
    });

    it('prompts before a push to another pathname and leaves on confirm', async () => {
      const { history, core } = renderPrompt({ basePath, hasUnsavedChanges: true });

      history.push(`${SOURCES_PATH}?rangeFrom=now-15m`);

      expect(core.overlays.openConfirm).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ 'data-test-subj': 'navigationBlockConfirmModal' })
      );
      expect(history.location.pathname).toBe(MAP_PATH);
      await waitFor(() =>
        expect(core.application.navigateToUrl).toHaveBeenCalledWith(
          `${basePath}${APP_BASE_PATH}${SOURCES_PATH}?rangeFrom=now-15m`,
          { state: undefined }
        )
      );
    });
  });

  it('leaves on confirm after a re-render while the modal is open', async () => {
    const { history, core, rerender } = renderPrompt({ basePath: '/rs', hasUnsavedChanges: true });
    let resolveConfirm: (confirmed: boolean) => void = () => {};
    core.overlays.openConfirm.mockReturnValue(
      new Promise<boolean>((resolve) => {
        resolveConfirm = resolve;
      })
    );

    history.push(SOURCES_PATH);
    rerender({ hasUnsavedChanges: true });
    resolveConfirm(true);
    await waitFor(() => expect(core.application.navigateToUrl).toHaveBeenCalled());
    history.push(SOURCES_PATH);

    expect(history.location.pathname).toBe(SOURCES_PATH);
    expect(core.overlays.openConfirm).toHaveBeenCalledTimes(1);
  });

  it('stops prompting once the changes are gone', () => {
    const { history, core, rerender } = renderPrompt({ basePath: '/rs', hasUnsavedChanges: true });

    rerender({ hasUnsavedChanges: false });
    history.push(SOURCES_PATH);

    expect(history.location.pathname).toBe(SOURCES_PATH);
    expect(core.overlays.openConfirm).not.toHaveBeenCalled();
  });

  it('never prompts without unsaved changes', () => {
    const { history, core } = renderPrompt({ basePath: '/rs', hasUnsavedChanges: false });

    history.push(SOURCES_PATH);

    expect(history.location.pathname).toBe(SOURCES_PATH);
    expect(core.overlays.openConfirm).not.toHaveBeenCalled();
  });
});
