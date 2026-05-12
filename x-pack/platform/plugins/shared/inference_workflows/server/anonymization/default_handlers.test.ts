/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ANONYMIZATION_CONTEXT_CAPABILITY_KEY,
  type AnonymizationContextHandle,
} from './context_handle';
import { defaultAfterCompletionHandler, defaultBeforeCompletionHandler } from './default_handlers';
import { anonymizeText } from '../steps/pii/ai_pii/executor';

const createCtx = (salt = 'test-salt'): AnonymizationContextHandle => ({
  salt,
  tokenMap: new Map(),
});

const wrap = (ctx: AnonymizationContextHandle) => ({
  [ANONYMIZATION_CONTEXT_CAPABILITY_KEY]: ctx,
});

describe('defaultAfterCompletionHandler — restore safety net', () => {
  it('restores tool-call arguments byte-for-byte even when a sloppy custom regex matched them', async () => {
    // The point of this test: a deliberately over-broad `custom_patterns` rule
    // (anything dotted) tokenizes file paths and identifiers that should never
    // have been touched. The safety net in `defaultAfterCompletionHandler`
    // must still restore the tool args byte-for-byte before invocation.
    const ctx = createCtx();
    const sloppyRule = { pattern: '\\w+\\.\\w+', entityClass: 'JUNK' };

    const originalArgs = {
      path: '/skills/security/alerts/alert-analysis/manifest.md',
      filename: 'package.json',
      query: 'SELECT * FROM platform.core.search',
    };

    // Seed the tokenMap by running the sloppy rule against each value. Use the
    // executor directly so we don't depend on the default handler's rule set.
    const anonymize = (text: string) => {
      const { anonymized, tokenMap } = anonymizeText({
        text,
        rules: [sloppyRule],
        salt: ctx.salt,
      });
      for (const [token, entry] of tokenMap) {
        ctx.tokenMap.set(token, entry);
      }
      return anonymized;
    };

    const anonymizedArgs = {
      path: anonymize(originalArgs.path),
      filename: anonymize(originalArgs.filename),
      query: anonymize(originalArgs.query),
    };

    // Sanity: the sloppy rule did match (otherwise this test would prove nothing).
    expect(ctx.tokenMap.size).toBeGreaterThan(0);
    expect(anonymizedArgs.filename).not.toBe(originalArgs.filename);

    const restored = await defaultAfterCompletionHandler(
      {
        toolCalls: [
          {
            id: 'call-1',
            function: { name: 'fs.read', arguments: anonymizedArgs },
          },
        ],
      },
      wrap(ctx)
    );

    const restoredToolCalls = (
      restored as {
        toolCalls: Array<{ function: { arguments: unknown } }>;
      }
    ).toolCalls;
    expect(restoredToolCalls[0].function.arguments).toEqual(originalArgs);
  });

  it('restores a structured response (not just a string) recursively', async () => {
    const ctx = createCtx();
    const originalResponse = {
      hostname: 'claude.ai',
      paths: ['/etc/hosts', '/var/log/app.log'],
      nested: { ip: '10.0.0.1', email: 'admin@example.com' },
    };

    // Populate the tokenMap by running anonymization over a payload that
    // contains the same values.
    await defaultBeforeCompletionHandler(
      {
        messages: [{ role: 'user', content: JSON.stringify(originalResponse) }],
      },
      wrap(ctx)
    );

    // Build an anonymized structured response by walking the same values
    // through the ctx (deterministic — tokens collide with the ones we just put
    // in the map).
    const anonymizedEcho = await defaultBeforeCompletionHandler(
      {
        messages: [{ role: 'user', content: JSON.stringify(originalResponse) }],
      },
      wrap(ctx)
    );
    const anonymizedContent = (anonymizedEcho as { messages: Array<{ content: string }> })
      .messages[0].content;
    const structuredResponse = JSON.parse(anonymizedContent);

    const restored = await defaultAfterCompletionHandler(
      { response: structuredResponse },
      wrap(ctx)
    );

    expect((restored as { response: unknown }).response).toEqual(originalResponse);
  });

  it('leaves unknown HOST_NAME-shaped tokens untouched (no map entry)', async () => {
    const ctx = createCtx();
    // Hand-crafted token that was never produced by anonymizeString — not in map.
    const orphan = 'HOST_NAME_deadbeefdeadbeefdeadbeefdeadbeef';
    const restored = await defaultAfterCompletionHandler(
      { response: `unmapped token ${orphan} stays` },
      wrap(ctx)
    );
    expect((restored as { response: string }).response).toBe(`unmapped token ${orphan} stays`);
  });

  it('still restores a plain string response (legacy behavior preserved)', async () => {
    const ctx = createCtx();
    await defaultBeforeCompletionHandler(
      { messages: [{ role: 'user', content: 'ping claude.ai please' }] },
      wrap(ctx)
    );
    // Build the anonymized echo string by re-running anonymization (same ctx,
    // deterministic tokens).
    const anon = await defaultBeforeCompletionHandler(
      { messages: [{ role: 'user', content: 'ping claude.ai please' }] },
      wrap(ctx)
    );
    const anonContent = (anon as { messages: Array<{ content: string }> }).messages[0].content;

    const restored = await defaultAfterCompletionHandler({ response: anonContent }, wrap(ctx));
    expect((restored as { response: string }).response).toBe('ping claude.ai please');
  });

  it('is a no-op when no AnonymizationContext capability is provided', async () => {
    const payload = {
      response: 'hello HOST_NAME_deadbeefdeadbeefdeadbeefdeadbeef',
      toolCalls: [{ function: { arguments: { x: 'y' } } }],
    };
    const out = await defaultAfterCompletionHandler(payload, undefined);
    expect(out).toBe(payload);
  });
});

describe('defaultBeforeCompletionHandler — built-in HOST_NAME false-positive guards', () => {
  it('does not tokenize file extensions or dotted identifiers as HOST_NAME', async () => {
    const ctx = createCtx();
    const content =
      'open package.json then read executor.test.ts and kibana.jsonc; call platform.core.search';
    const out = await defaultBeforeCompletionHandler(
      { messages: [{ role: 'user', content }] },
      wrap(ctx)
    );
    const after = (out as { messages: Array<{ content: string }> }).messages[0].content;
    // No HOST_NAME tokens should have been produced.
    expect(after).not.toMatch(/HOST_NAME_[0-9a-f]{32}/);
    // Content should be unchanged.
    expect(after).toBe(content);
  });

  it('tokenizes a real hostname and restores it on the way back', async () => {
    const ctx = createCtx();
    const content = 'ping claude.ai to verify';
    const before = await defaultBeforeCompletionHandler(
      { messages: [{ role: 'user', content }] },
      wrap(ctx)
    );
    const anonContent = (before as { messages: Array<{ content: string }> }).messages[0].content;
    expect(anonContent).toMatch(/HOST_NAME_[0-9a-f]{32}/);
    expect(anonContent).not.toContain('claude.ai');

    const after = await defaultAfterCompletionHandler({ response: anonContent }, wrap(ctx));
    expect((after as { response: string }).response).toBe(content);
  });
});
