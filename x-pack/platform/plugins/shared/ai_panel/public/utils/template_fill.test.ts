/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// DOMPurify requires a real DOM — pass-through in Jest (security is tested in the browser)
jest.mock('dompurify', () => ({
  __esModule: true,
  default: { sanitize: (html: string) => html },
}));

import { fillTemplate, stripMarkdownFences, isValidTemplate, injectCsp } from './template_fill';

const cols = [
  { name: 'category.keyword', type: 'keyword' },
  { name: 'total_revenue', type: 'double' },
];
const rows = [
  ['Clothing', 8000],
  ['Shoes', 3000],
  ['Accessories', 1000],
];

const wrap = (body: string) => `<html><body>${body}</body></html>`;

describe('fillTemplate', () => {
  describe('bracket-notation column access', () => {
    it('accesses dot-notation column names via bracket notation', () => {
      expect(fillTemplate(wrap('{{ rows[0]["category.keyword"].value }}'), cols, rows)).toContain(
        'Clothing'
      );
    });

    it('accesses @-prefixed column names via bracket notation', () => {
      const result = fillTemplate(
        wrap('{{ rows[0]["@ts"].value }}'),
        [{ name: '@ts', type: 'date' }],
        [['2024-01-01']]
      );
      expect(result).toContain('2024-01-01');
    });

    it('keeps both columns readable when their names would collide under a normalized key', () => {
      const collidingCols = [
        { name: 'category.keyword', type: 'keyword' },
        { name: 'category_keyword', type: 'keyword' },
      ];
      const result = fillTemplate(
        wrap('{{ rows[0]["category.keyword"].value }}-{{ rows[0]["category_keyword"].value }}'),
        collidingCols,
        [['Clothing', 'RAW_FIELD']]
      );
      expect(result).toContain('Clothing-RAW_FIELD');
    });
  });

  describe('Liquid loops', () => {
    it('renders one element per row inside {% for %}', () => {
      const result = fillTemplate(
        wrap('{% for row in rows %}<span>{{ row["category.keyword"].value }}</span>{% endfor %}'),
        cols,
        rows
      );
      expect(result).toContain('Clothing');
      expect(result).toContain('Shoes');
      expect(result).toContain('Accessories');
    });

    it('renders nothing for the loop when rows is empty', () => {
      const result = fillTemplate(
        wrap('{% for row in rows %}<span>{{ row["category.keyword"].value }}</span>{% endfor %}'),
        cols,
        []
      );
      expect(result).not.toContain('<span>');
    });
  });

  describe('empty state', () => {
    it('renders {% if rows.size == 0 %} block when there are no rows', () => {
      expect(
        fillTemplate(wrap('{% if rows.size == 0 %}<p>No data</p>{% endif %}'), cols, [])
      ).toContain('No data');
    });

    it('does not render the empty block when rows are present', () => {
      expect(
        fillTemplate(wrap('{% if rows.size == 0 %}<p>No data</p>{% endif %}'), cols, rows)
      ).not.toContain('No data');
    });
  });

  describe('pct variants', () => {
    it('computes pct as percentage of max value', () => {
      const result = fillTemplate(
        wrap('{% for row in rows %}{{ row["total_revenue"].pct }}{% endfor %}'),
        cols,
        rows
      );
      // max is 8000 → 8000/8000=100, 3000/8000=38, 1000/8000=13
      expect(result).toContain('100');
      expect(result).toContain('38');
      expect(result).toContain('13');
    });

    it('clamps pct to 100 maximum', () => {
      const result = fillTemplate(
        wrap('{{ rows[0]["val"].pct }}'),
        [{ name: 'val', type: 'double' }],
        [[999999]]
      );
      expect(result).toContain('100');
    });
  });

  describe('conditional blocks', () => {
    it('applies green/yellow/red status logic', () => {
      const tpl = wrap(
        '{% for row in rows %}' +
          '{% if row["total_revenue"].value >= 5000 %}green{% elsif row["total_revenue"].value >= 2000 %}yellow{% else %}red{% endif %}' +
          '{% endfor %}'
      );
      const result = fillTemplate(tpl, cols, rows);
      expect(result).toContain('green'); // 8000
      expect(result).toContain('yellow'); // 3000
      expect(result).toContain('red'); // 1000
    });
  });

  describe('HTML escaping', () => {
    it('escapes < and > in column values', () => {
      const result = fillTemplate(
        wrap('{% for row in rows %}{{ row["label"].value }}{% endfor %}'),
        [{ name: 'label', type: 'keyword' }],
        [['<script>alert(1)</script>']]
      );
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script&gt;');
    });
  });

  describe('pct edge cases', () => {
    it('returns 0 for pct when all values are zero', () => {
      const result = fillTemplate(
        wrap('{{ rows[0]["val"].pct }}'),
        [{ name: 'val', type: 'double' }],
        [[0], [0]]
      );
      expect(result).toContain('0');
    });

    it('ignores non-numeric values when computing pct', () => {
      const result = fillTemplate(
        wrap('{{ rows[0]["val"].pct }}'),
        [{ name: 'val', type: 'keyword' }],
        [['text']]
      );
      expect(result).not.toContain('NaN');
      expect(result).not.toContain('Infinity');
    });
  });

  describe('max object', () => {
    it('exposes max values via max["column name"]', () => {
      const result = fillTemplate(wrap('{{ max["total_revenue"] }}'), cols, rows);
      expect(result).toContain('8000');
    });
  });

  describe('error recovery', () => {
    it('throws on invalid Liquid syntax', () => {
      expect(() => fillTemplate(wrap('{% invalid_tag %}'), cols, rows)).toThrow();
    });
  });
});

describe('injectCsp', () => {
  it('injects CSP into an existing <head>', () => {
    const result = injectCsp('<html><head></head><body></body></html>');
    expect(result).toContain('<head><meta http-equiv="Content-Security-Policy"');
  });

  it('prepends CSP when there is no <head>', () => {
    const result = injectCsp('<p>hello</p>');
    expect(result.startsWith('<meta http-equiv="Content-Security-Policy"')).toBe(true);
  });

  it('is idempotent — does not double-inject', () => {
    const once = injectCsp('<p>hello</p>');
    const twice = injectCsp(once);
    expect(twice.split('Content-Security-Policy').length).toBe(2);
  });
});

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

describe('isValidTemplate', () => {
  it('returns true when the template contains an HTML element', () => {
    expect(isValidTemplate('<div>hi</div>')).toBe(true);
    expect(isValidTemplate('<p>hi</p>')).toBe(true);
  });

  it('returns false for empty or non-HTML content', () => {
    expect(isValidTemplate('')).toBe(false);
    expect(isValidTemplate('just some text')).toBe(false);
  });
});
