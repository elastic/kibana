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

import { fillTemplate, stripMarkdownFences, isValidTemplate } from './template_fill';

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
  describe('column name normalization', () => {
    it('maps dot-notation column names to underscored placeholders', () => {
      expect(fillTemplate(wrap('{{ rows[0].category_keyword }}'), cols, rows)).toContain(
        'Clothing'
      );
    });

    it('converts @-prefixed column names to at_ so they remain distinct', () => {
      const result = fillTemplate(
        wrap('{{ rows[0].at_ts }}'),
        [{ name: '@ts', type: 'date' }],
        [['2024-01-01']]
      );
      expect(result).toContain('2024-01-01');
    });
  });

  describe('Liquid loops', () => {
    it('renders one element per row inside {% for %}', () => {
      const result = fillTemplate(
        wrap('{% for row in rows %}<span>{{ row.category_keyword }}</span>{% endfor %}'),
        cols,
        rows
      );
      expect(result).toContain('Clothing');
      expect(result).toContain('Shoes');
      expect(result).toContain('Accessories');
    });

    it('renders nothing for the loop when rows is empty', () => {
      const result = fillTemplate(
        wrap('{% for row in rows %}<span>{{ row.category_keyword }}</span>{% endfor %}'),
        cols,
        []
      );
      expect(result).not.toContain('<span>');
    });
  });

  describe('empty state', () => {
    it('renders {% if rows.size == 0 %} block when there are no rows', () => {
      expect(fillTemplate(wrap('{% if rows.size == 0 %}<p>No data</p>{% endif %}'), cols, [])).toContain('No data');
    });

    it('does not render the empty block when rows are present', () => {
      expect(fillTemplate(wrap('{% if rows.size == 0 %}<p>No data</p>{% endif %}'), cols, rows)).not.toContain('No data');
    });
  });

  describe('_pct variants', () => {
    it('computes _pct as percentage of max value', () => {
      const result = fillTemplate(
        wrap('{% for row in rows %}{{ row.total_revenue_pct }}{% endfor %}'),
        cols,
        rows
      );
      // max is 8000 → 8000/8000=100, 3000/8000=38, 1000/8000=13
      expect(result).toContain('100');
      expect(result).toContain('38');
      expect(result).toContain('13');
    });

    it('clamps _pct to 100 maximum', () => {
      const result = fillTemplate(wrap('{{ rows[0].val_pct }}'), [{ name: 'val', type: 'double' }], [[999999]]);
      expect(result).toContain('100');
    });
  });

  describe('conditional blocks', () => {
    it('applies green/yellow/red status logic', () => {
      const tpl = wrap(
        '{% for row in rows %}' +
          '{% if row.total_revenue >= 5000 %}green{% elsif row.total_revenue >= 2000 %}yellow{% else %}red{% endif %}' +
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
        wrap('{% for row in rows %}{{ row.label }}{% endfor %}'),
        [{ name: 'label', type: 'keyword' }],
        [['<script>alert(1)</script>']]
      );
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script&gt;');
    });
  });

  describe('error recovery', () => {
    it('throws on invalid Liquid syntax', () => {
      expect(() => fillTemplate(wrap('{% invalid_tag %}'), cols, rows)).toThrow();
    });
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
