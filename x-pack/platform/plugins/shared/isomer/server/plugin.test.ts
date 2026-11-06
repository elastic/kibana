/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import { createKibanaIsomerRuntime } from '@kbn/isomer';
import type { MarkdownNode } from '@kbn/isomer-components';
import { Observable, of } from 'rxjs';
import { MATERIALIZE_API_PATH, MATERIALIZE_FEATURE_FLAG } from '../common/constants';
import { IsomerPlugin } from './plugin';

jest.mock('@kbn/isomer', () => {
  const actual = jest.requireActual('@kbn/isomer');
  return { ...actual, createKibanaIsomerRuntime: jest.fn(actual.createKibanaIsomerRuntime) };
});

const startPlugin = ({ enabled = true }: { enabled?: boolean } = {}) => {
  const plugin = new IsomerPlugin(coreMock.createPluginInitializerContext({}));
  const coreSetup = coreMock.createSetup();
  const { registerMaterializer } = plugin.setup(coreSetup);
  const coreStart = coreMock.createStart();
  coreStart.featureFlags.getBooleanValue$.mockImplementation((flag, fallback) =>
    of(flag === MATERIALIZE_FEATURE_FLAG ? enabled : fallback)
  );
  return { ...plugin.start(coreStart), registerMaterializer, coreSetup, coreStart };
};

const markdown: MarkdownNode = { type: 'markdown', text: 'There are **3** open alerts.' };
const composition = { type: 'view' as const, body: [markdown] };

describe('IsomerPlugin', () => {
  beforeEach(() => {
    jest.mocked(createKibanaIsomerRuntime).mockClear();
  });

  it('builds the runtime on the first getRuntime call and shares it after', async () => {
    const { getRuntime } = startPlugin();
    expect(createKibanaIsomerRuntime).not.toHaveBeenCalled();
    const [first, second] = await Promise.all([getRuntime(), getRuntime()]);
    expect(first).toBe(second);
    expect(await getRuntime()).toBe(first);
    expect(createKibanaIsomerRuntime).toHaveBeenCalledTimes(1);
  });

  it('waits for the feature flag evaluation', async () => {
    const { isMaterializeEnabled, coreStart } = startPlugin();
    coreStart.featureFlags.getBooleanValue$.mockReturnValueOnce(
      new Observable<boolean>((subscriber) => {
        setTimeout(() => {
          subscriber.next(true);
          subscriber.complete();
        }, 0);
      })
    );

    await expect(isMaterializeEnabled()).resolves.toBe(true);
  });

  it('builds the runtime again after a failed attempt', async () => {
    jest.mocked(createKibanaIsomerRuntime).mockImplementationOnce(() => {
      throw new Error('boom');
    });
    const { getRuntime } = startPlugin();
    await expect(getRuntime()).rejects.toThrow('boom');
    await expect(getRuntime()).resolves.toBeDefined();
    expect(createKibanaIsomerRuntime).toHaveBeenCalledTimes(2);
  });

  it('starts a runtime that validates markdown nodes', async () => {
    const runtime = await startPlugin().getRuntime();
    expect(runtime.validate(composition).errors).toEqual([]);
    const empty: MarkdownNode = { ...markdown, text: '' };
    const { errors } = runtime.validate({ type: 'view', body: [empty] });
    expect(errors.map(({ path }) => path)).toEqual(['body[0].text']);
  });

  it('renders a markdown node on html, text, markdown, and Slack', async () => {
    const { surfaces } = await startPlugin().getRuntime();
    expect(surfaces.html.render(composition).html).toContain('<strong>3</strong>');
    expect(surfaces.text.render(composition)).toContain('There are **3** open alerts.');
    expect(surfaces.markdown.render(composition)).toContain('There are **3** open alerts.');
    expect(JSON.stringify(surfaces.slack.render(composition).blocks)).toContain('open alerts');
  });

  it('renders a validated unsupported node on each surface', async () => {
    const runtime = await startPlugin().getRuntime();
    const unsupported = {
      type: 'unsupported' as const,
      title: 'Unsupported visualization',
      reason: 'This visualization cannot be shown here.',
    };
    const unsupportedComposition = { type: 'view' as const, body: [unsupported] };

    expect(runtime.validate(unsupportedComposition).errors).toEqual([]);
    expect(runtime.surfaces.html.render(unsupportedComposition).html).toContain(
      'This visualization cannot be shown here.'
    );
    expect(runtime.surfaces.text.render(unsupportedComposition)).toContain(
      'This visualization cannot be shown here.'
    );
    expect(runtime.surfaces.markdown.render(unsupportedComposition)).toContain(
      'This visualization cannot be shown here.'
    );
    expect(JSON.stringify(runtime.surfaces.slack.render(unsupportedComposition).blocks)).toContain(
      'This visualization cannot be shown here.'
    );
  });

  it('registers the materialize route', () => {
    const { coreSetup } = startPlugin();
    const [router] = coreSetup.http.createRouter.mock.results.map(({ value }) => value);
    expect(router.versioned.post).toHaveBeenCalledWith(
      expect.objectContaining({ path: MATERIALIZE_API_PATH })
    );
  });

  it('materializes with a registered materializer as the requesting user', async () => {
    const { registerMaterializer, asScoped, isMaterializeEnabled, coreStart } = startPlugin();
    const load = jest.fn(async () => ({ text: 'There are **3** open alerts.' }));
    registerMaterializer<{ text: string }>('note', {
      version: 1,
      parse: (config) => config as { text: string },
      load,
      plan: () => [],
      map: ({ text }) => ({ type: 'markdown', text }),
    });
    const request = httpServerMock.createKibanaRequest();

    expect(await isMaterializeEnabled()).toBe(true);
    await expect(asScoped(request).materialize({ type: 'note', id: 'note-1' })).resolves.toEqual(
      markdown
    );
    expect(coreStart.savedObjects.getScopedClient).toHaveBeenCalledWith(request);
    expect(load).toHaveBeenCalledWith(
      'note-1',
      expect.objectContaining({
        request,
        savedObjectsClient: coreStart.savedObjects.getScopedClient.mock.results[0].value,
      })
    );
  });

  it('returns unsupported while materialization is off', async () => {
    const { asScoped, isMaterializeEnabled } = startPlugin({ enabled: false });
    expect(await isMaterializeEnabled()).toBe(false);
    await expect(
      asScoped(httpServerMock.createKibanaRequest()).materialize({ type: 'lens', id: 'abc' })
    ).resolves.toEqual(expect.objectContaining({ type: 'unsupported' }));
  });

  it('returns unsupported when a materializer maps an invalid node', async () => {
    const { registerMaterializer, asScoped, getRuntime } = startPlugin();
    registerMaterializer('note', {
      version: 1,
      parse: (config) => config,
      plan: () => [],
      map: () => ({ type: 'markdown', text: '' }),
    });

    const node = await asScoped(httpServerMock.createKibanaRequest()).materialize({
      type: 'note',
      config: {},
    });
    expect(node).toEqual(
      expect.objectContaining({
        type: 'unsupported',
        reason: expect.stringContaining('body[0].text'),
      })
    );
    expect((await getRuntime()).validate({ type: 'view', body: [node] }).errors).toEqual([]);
  });
});
