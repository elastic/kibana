/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stripMarkdownFences } from './strip_markdown_fences';

describe('stripMarkdownFences', () => {
  it('strips leading ```html and trailing ```', () => {
    expect(stripMarkdownFences('```html\n<p>hi</p>\n```')).toBe('<p>hi</p>');
  });

  it('strips fences embedded inside an HTML shell', () => {
    const raw = '<html><body>```html\n<p>hi</p>\n```</body></html>';
    expect(stripMarkdownFences(raw)).not.toContain('```');
  });

  it('leaves plain HTML unchanged', () => {
    expect(stripMarkdownFences('<p>hello</p>')).toBe('<p>hello</p>');
  });

  it('leaves a fenced code example deep in the body untouched', () => {
    const filler = '<p>content</p>'.repeat(30);
    const raw = `<html><body>${filler}<pre>Use \`\`\`bash\necho hi\n\`\`\` in your terminal</pre>${filler}</body></html>`;
    const result = stripMarkdownFences(raw);
    expect(result).toContain('```bash');
    expect(result).toContain('echo hi');
  });
});
