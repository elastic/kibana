/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractLogSignatures, staticPrefixOf } from './extract_log_signatures';

describe('staticPrefixOf', () => {
  it('returns the text before an interpolation placeholder', () => {
    expect(staticPrefixOf('Payment failed for order {}')).toBe('Payment failed for order');
    expect(staticPrefixOf('user %s not found')).toBe('user');
    expect(staticPrefixOf('starting service ${name}')).toBe('starting service');
    expect(staticPrefixOf('no placeholders here')).toBe('no placeholders here');
  });
});

describe('extractLogSignatures', () => {
  it('extracts level and message from a method-style logger call', () => {
    const signatures = extractLogSignatures({
      content: 'func run() {\n\tlogger.Error("Payment failed for order {}", id)\n}',
      language: 'go',
    });
    expect(signatures).toHaveLength(1);
    expect(signatures[0]).toMatchObject({
      level: 'error',
      severity: 70,
      message: 'Payment failed for order {}',
      staticPrefix: 'Payment failed for order',
    });
  });

  it('normalizes warning to warn and maps severity', () => {
    const [signature] = extractLogSignatures({
      content: 'logging.warning("disk space low on volume")',
      language: 'python',
    });
    expect(signature.level).toBe('warn');
    expect(signature.severity).toBe(50);
  });

  it('extracts Rust-style level macros', () => {
    const [signature] = extractLogSignatures({
      content: 'tracing::error!("connection refused by upstream")',
      language: 'rust',
    });
    expect(signature).toMatchObject({
      level: 'error',
      staticPrefix: 'connection refused by upstream',
    });
  });

  it('drops calls whose message is fully interpolated (no stable anchor)', () => {
    const signatures = extractLogSignatures({
      content: 'logger.info("{}", value)',
      language: 'go',
    });
    expect(signatures).toHaveLength(0);
  });

  it('de-duplicates identical level+message within a chunk', () => {
    const signatures = extractLogSignatures({
      content: 'logger.error("boom happened");\nlogger.error("boom happened");',
      language: 'go',
    });
    expect(signatures).toHaveLength(1);
  });

  it('ignores non-logging text', () => {
    expect(extractLogSignatures({ content: 'const x = compute(1, 2);' })).toHaveLength(0);
  });

  it('synthesizes a signature from a Stage-3 classified (level, message)', () => {
    // A phrase-only line the idiom regex cannot parse; the classifier supplied
    // the level + static message.
    const signatures = extractLogSignatures({
      content: 'return nil, fmt.Errorf("failed to charge card: %+v", err)',
      location: 'main.go:355',
      classified: { level: 'error', message: 'failed to charge card' },
    });
    expect(signatures).toEqual([
      {
        level: 'error',
        severity: 70,
        message: 'failed to charge card',
        staticPrefix: 'failed to charge card',
        location: 'main.go:355',
      },
    ]);
  });

  it('drops a classified signature whose static prefix is too short', () => {
    expect(
      extractLogSignatures({ content: 'x', classified: { level: 'info', message: '{}' } })
    ).toHaveLength(0);
  });
});
