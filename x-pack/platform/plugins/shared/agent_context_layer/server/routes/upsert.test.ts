/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  buildMockContext,
  createMockSmlService,
  createTestCoreSetup,
  createTestCoreSetupNoSpaces,
  httpServerMock,
  httpServiceMock,
  sampleDocument,
} from './test_helpers';
import { registerUpsertRoute } from './upsert';

const validBody = {
  type: 'visualization',
  title: 'Test Viz',
  content: 'some content',
};

describe('registerUpsertRoute', () => {
  let router: ReturnType<typeof httpServiceMock.createRouter>;
  let handler: Function;
  let mockSmlService: ReturnType<typeof createMockSmlService>;
  const logger = loggingSystemMock.create().get();

  beforeEach(() => {
    router = httpServiceMock.createRouter();
    mockSmlService = createMockSmlService();

    registerUpsertRoute({
      router: router as any,
      coreSetup: createTestCoreSetup() as any,
      logger,
      getSmlService: () => mockSmlService as any,
    });

    const [, registeredHandler] = router.put.mock.calls[0];
    handler = registeredHandler;
  });

  const callHandler = async (
    { params, body }: { params: Record<string, unknown>; body: Record<string, unknown> },
    uiSettingsEnabled = true
  ) => {
    const request = httpServerMock.createKibanaRequest({ params, body });
    const response = httpServerMock.createResponseFactory();
    await handler(buildMockContext(uiSettingsEnabled), request, response);
    return response;
  };

  it('returns 404 when feature flag is disabled', async () => {
    const response = await callHandler({ params: { originId: 'viz-1' }, body: validBody }, false);
    expect(response.notFound).toHaveBeenCalled();
    expect(mockSmlService.indexAttachment).not.toHaveBeenCalled();
  });

  it('creates a new origin via indexAttachment content-mode when no chunks exist', async () => {
    mockSmlService.findByOriginIdAcrossSpaces.mockResolvedValue([]);
    mockSmlService.indexAttachment.mockResolvedValue(undefined);
    mockSmlService.findByOriginId.mockResolvedValue([sampleDocument]);

    const response = await callHandler({ params: { originId: 'viz-1' }, body: validBody });

    expect(mockSmlService.indexAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        originId: 'viz-1',
        attachmentType: 'visualization',
        action: 'create',
        spaces: ['test-space'],
        content: [
          expect.objectContaining({
            type: 'visualization',
            title: 'Test Viz',
            content: 'some content',
          }),
        ],
      })
    );
    expect(response.ok).toHaveBeenCalledWith({
      body: {
        items: [expect.objectContaining({ id: sampleDocument.id, origin: sampleDocument.origin })],
        created: true,
      },
    });
  });

  it('passes action=update and created=false when origin already exists in caller space', async () => {
    mockSmlService.findByOriginIdAcrossSpaces.mockResolvedValue([sampleDocument]);
    // The route now privilege-checks existing chunks before overwriting
    // them — see the "returns 404 when caller lacks read access" test
    // for the rationale. This test focuses on the happy path, so we
    // explicitly authorize the chunk read.
    mockSmlService.checkItemsAccess.mockResolvedValue(new Map([[sampleDocument.id, true]]));
    mockSmlService.indexAttachment.mockResolvedValue(undefined);
    mockSmlService.findByOriginId.mockResolvedValue([sampleDocument]);

    const response = await callHandler({ params: { originId: 'viz-1' }, body: validBody });

    expect(mockSmlService.indexAttachment).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'update' })
    );
    const body = response.ok.mock.calls[0][0]?.body as Record<string, unknown>;
    expect(body.created).toBe(false);
  });

  it('forwards tags to the indexer when provided', async () => {
    mockSmlService.findByOriginIdAcrossSpaces.mockResolvedValue([]);
    mockSmlService.indexAttachment.mockResolvedValue(undefined);
    mockSmlService.findByOriginId.mockResolvedValue([sampleDocument]);
    const bodyWithTags = { ...validBody, tags: ['otel', 'claude-code'] };

    await callHandler({ params: { originId: 'viz-1' }, body: bodyWithTags });

    expect(mockSmlService.indexAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        content: [expect.objectContaining({ tags: ['otel', 'claude-code'] })],
      })
    );
  });

  it('clears existing tags when the PUT body omits tags (full-document replace semantic)', async () => {
    // `PUT` is a full-document replace, not a patch — omitting `tags`
    // in the body MUST clear any previously stored tags rather than
    // preserving them. This is the documented REST `PUT` contract and
    // also what the indexer's content-mode write does: it wipes every
    // chunk for the origin and re-writes from the body. A previous
    // refactor accidentally preserved tags via a merge, masking the
    // intent; pin the behaviour here so any reintroduction of merge
    // semantics fails loudly.
    //
    // The assertion looks at the `content` payload handed to the
    // indexer rather than the post-write read because the indexer is
    // the single source of truth for what lands on disk.
    const taggedDoc = { ...sampleDocument, tags: ['stale-tag-1', 'stale-tag-2'] };
    mockSmlService.findByOriginIdAcrossSpaces.mockResolvedValue([taggedDoc]);
    mockSmlService.checkItemsAccess.mockResolvedValue(new Map([[sampleDocument.id, true]]));
    mockSmlService.indexAttachment.mockResolvedValue(undefined);
    mockSmlService.findByOriginId.mockResolvedValue([sampleDocument]);

    // Body explicitly does NOT include `tags`.
    await callHandler({ params: { originId: 'viz-1' }, body: validBody });

    const [callArgs] = mockSmlService.indexAttachment.mock.calls;
    const passedContent = callArgs[0].content as Array<{ tags?: unknown }>;
    // The single chunk we passed must not carry a `tags` field at all
    // — the indexer reads "absent" as "clear", consistent with the
    // workflow step's content-mode schema.
    expect(passedContent).toHaveLength(1);
    expect(passedContent[0]).not.toHaveProperty('tags');
  });

  it('returns 404 when origin is owned by another space', async () => {
    const otherSpaceDoc = { ...sampleDocument, spaces: ['other-space'] };
    mockSmlService.findByOriginIdAcrossSpaces.mockResolvedValue([otherSpaceDoc]);

    const response = await callHandler({ params: { originId: 'viz-1' }, body: validBody });

    expect(response.notFound).toHaveBeenCalledWith({
      body: { message: "SML origin 'viz-1' not found" },
    });
    expect(mockSmlService.indexAttachment).not.toHaveBeenCalled();
  });

  it('returns 404 (and does not overwrite) when caller lacks read access to existing chunks', async () => {
    // Privilege escalation guard: a caller with `agentContextLayer:write`
    // but lacking the underlying object privilege (e.g.
    // `saved_object:dashboard/get`) must not be able to overwrite a
    // permission-gated origin. The route's content-mode write would
    // otherwise delete the existing chunks and replace them with the
    // caller's input — content injection on a resource they cannot read.
    // This mirrors the DELETE route's `checkItemsAccess` gate.
    const gatedDoc = { ...sampleDocument, id: 'chunk-1', spaces: ['test-space'] };
    mockSmlService.findByOriginIdAcrossSpaces.mockResolvedValue([gatedDoc]);
    mockSmlService.checkItemsAccess.mockResolvedValue(new Map([['chunk-1', false]]));

    const response = await callHandler({ params: { originId: 'viz-1' }, body: validBody });

    expect(mockSmlService.checkItemsAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        ids: ['chunk-1'],
        spaceId: 'test-space',
      })
    );
    expect(response.notFound).toHaveBeenCalledWith({
      body: { message: "SML origin 'viz-1' not found" },
    });
    // The whole point of the gate — no write must happen on the
    // unauthorized branch.
    expect(mockSmlService.indexAttachment).not.toHaveBeenCalled();
  });

  it('skips checkItemsAccess for a fresh create (no existing chunks)', async () => {
    // A brand-new origin has nothing to read-gate — the privilege check
    // would have to short-circuit anyway. Asserting it isn't called
    // both avoids a wasted ES round-trip and documents the contract.
    mockSmlService.findByOriginIdAcrossSpaces.mockResolvedValue([]);
    mockSmlService.indexAttachment.mockResolvedValue(undefined);
    mockSmlService.findByOriginId.mockResolvedValue([sampleDocument]);

    await callHandler({ params: { originId: 'viz-new' }, body: validBody });

    expect(mockSmlService.checkItemsAccess).not.toHaveBeenCalled();
    expect(mockSmlService.indexAttachment).toHaveBeenCalled();
  });

  it('accepts an unregistered type and writes it through the indexer (which stamps empty permissions)', async () => {
    // Content-mode writes now accept any `type` — the indexer is the
    // single point of decision on what permissions to stamp. The route
    // no longer pre-checks the registry, so any value matching the
    // identifier regex (`/^[a-z][a-z0-9_]*$/`) passes the body schema
    // and the indexer handles permissioning. Verifying the call here
    // is enough; the indexer's own tests cover the empty-permission
    // stamping + warn-once behaviour.
    mockSmlService.findByOriginIdAcrossSpaces.mockResolvedValue([]);
    mockSmlService.indexAttachment.mockResolvedValue(undefined);
    mockSmlService.findByOriginId.mockResolvedValue([sampleDocument]);

    const response = await callHandler({
      params: { originId: 'note-1' },
      body: { ...validBody, type: 'my_notes' },
    });

    expect(response.ok).toHaveBeenCalled();
    expect(mockSmlService.indexAttachment).toHaveBeenCalledWith(
      expect.objectContaining({ attachmentType: 'my_notes' })
    );
    expect(response.badRequest).not.toHaveBeenCalled();
  });

  it('exposes the type identifier regex on the route schema', () => {
    // Syntactic guard at the route layer — the indexer is permissive
    // about *whether* a type is registered, but the body schema still
    // refuses junk values (slashes, uppercase, leading digits) from
    // leaking in as durable chunk namespaces. The httpServerMock test
    // setup bypasses schema validation entirely, so we extract and
    // exercise the schema directly here.
    const [routeConfig] = router.put.mock.calls[0];
    const bodySchema = (routeConfig as any).validate.body;
    expect(() => bodySchema.validate({ type: 'BadType/slash', title: 't', content: 'c' })).toThrow(
      /lowercase identifier/
    );
    expect(() =>
      bodySchema.validate({ type: '1startswithdigit', title: 't', content: 'c' })
    ).toThrow(/lowercase identifier/);
    expect(() => bodySchema.validate({ type: 'my_notes', title: 't', content: 'c' })).not.toThrow();
    expect(() =>
      bodySchema.validate({ type: 'visualization', title: 't', content: 'c' })
    ).not.toThrow();
  });

  it('rejects body payloads that overflow the per-field maxLength caps', () => {
    // Defense-in-depth against unbounded HTTP payloads — a missing
    // `maxLength` once let a single PUT push arbitrary content into
    // the SML index. Pin each cap so a future refactor can't silently
    // drop them. The actual values (`MAX_SML_*`) are exercised
    // indirectly via the schema; testing each at length+1 keeps the
    // assertions agnostic of the literal value.
    const [routeConfig] = router.put.mock.calls[0];
    const bodySchema = (routeConfig as any).validate.body;
    const paramsSchema = (routeConfig as any).validate.params;

    // title cap: > MAX_SML_TITLE_LENGTH (1024) chars
    expect(() =>
      bodySchema.validate({ type: 'lens', title: 'x'.repeat(1025), content: 'c' })
    ).toThrow(/title/);

    // content cap: > MAX_SML_CONTENT_LENGTH (50_000) chars
    expect(() =>
      bodySchema.validate({ type: 'lens', title: 't', content: 'x'.repeat(50_001) })
    ).toThrow(/content/);

    // type cap: > MAX_SML_TYPE_LENGTH (256) chars — even when the
    // regex matches, the length envelope must bite.
    expect(() => bodySchema.validate({ type: 'a'.repeat(257), title: 't', content: 'c' })).toThrow(
      /type/
    );

    // originId URL param cap: > MAX_SML_ORIGIN_ID_LENGTH (512) chars.
    expect(() => paramsSchema.validate({ originId: 'x'.repeat(513) })).toThrow(/originId/);
  });

  it('falls back to default space when spaces plugin is unavailable', async () => {
    const localRouter = httpServiceMock.createRouter();
    registerUpsertRoute({
      router: localRouter as any,
      coreSetup: createTestCoreSetupNoSpaces() as any,
      logger,
      getSmlService: () => mockSmlService as any,
    });

    const [, localHandler] = localRouter.put.mock.calls[0];
    const request = httpServerMock.createKibanaRequest({
      params: { originId: 'viz-1' },
      body: validBody,
    });
    const response = httpServerMock.createResponseFactory();

    mockSmlService.findByOriginIdAcrossSpaces.mockResolvedValue([]);
    mockSmlService.indexAttachment.mockResolvedValue(undefined);
    mockSmlService.findByOriginId.mockResolvedValue([sampleDocument]);

    await localHandler(buildMockContext(true), request, response);

    expect(mockSmlService.indexAttachment).toHaveBeenCalledWith(
      expect.objectContaining({ spaces: ['default'] })
    );
  });

  it('propagates unexpected errors from sml.indexAttachment', async () => {
    mockSmlService.findByOriginIdAcrossSpaces.mockResolvedValue([]);
    mockSmlService.indexAttachment.mockRejectedValue(new Error('write failed'));

    await expect(callHandler({ params: { originId: 'viz-1' }, body: validBody })).rejects.toThrow(
      'write failed'
    );
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('write failed'));
  });
});
