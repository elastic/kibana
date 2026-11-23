/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_REASON_TEMPLATE_LENGTH } from '@kbn/alerting-v2-schemas';
import { buildDataContext, createReasonRenderer, type ReasonTemplateRule } from './reason_template';

const rule: ReasonTemplateRule = {
  id: 'rule-1',
  version: 3,
  metadata: { name: 'CPU rule', description: 'Watches CPU', tags: ['prod', 'linux'] },
};

const render = (template: string | undefined, row: Record<string, unknown> = {}) =>
  createReasonRenderer({ template, rule }).render(row);

describe('createReasonRenderer', () => {
  describe('variables', () => {
    it('renders query columns under data, reading a dotted column as nested access', () => {
      expect(
        render('CPU on {{ data.host.name }} is {{ data.cpu_pct }}%', {
          'host.name': 'web-1',
          cpu_pct: 94.5,
        })
      ).toBe('CPU on web-1 is 94.5%');
    });

    it('reads a dotted column by its flat name', () => {
      expect(render('{{ data["host.name"] }}', { 'host.name': 'web-1' })).toBe('web-1');
    });

    it('renders the framework variables under rule', () => {
      expect(
        render(
          '{{ rule.id }} {{ rule.name }} {{ rule.description }} {{ rule.tags }} v{{ rule.version }}'
        )
      ).toBe('rule-1 CPU rule Watches CPU prodlinux v3');
    });

    it('renders a missing rule description as empty', () => {
      const text = createReasonRenderer({
        template: 'x{{ rule.description }}x',
        rule: { ...rule, metadata: { name: 'CPU rule' } },
      }).render({});

      expect(text).toBe('xx');
    });

    it('renders a missing, null or unknown variable as an empty string', () => {
      expect(render('CPU on {{ data.host.name }} at {{ data.cpu }}%', { cpu: null })).toBe(
        'CPU on  at %'
      );
      expect(render('a{{ nothing.here }}b{{ data.nope }}c')).toBe('abc');
    });

    it('does not resolve variables outside the data and rule namespaces', () => {
      expect(render('x{{ cpu_pct }}x', { cpu_pct: 94 })).toBe('xx');
    });

    it('leaves multi-valued columns to Liquid, which prints them without a separator', () => {
      expect(render('Hosts: {{ data.hosts }}', { hosts: ['web-1', 'web-2'] })).toBe(
        'Hosts: web-1web-2'
      );
    });

    it('lets the author join multi-valued columns with the join filter', () => {
      expect(render('Hosts: {{ data.hosts | join: ", " }}', { hosts: ['web-1', 'web-2'] })).toBe(
        'Hosts: web-1, web-2'
      );
      expect(render('Tags: {{ rule.tags | join: ", " }}')).toBe('Tags: prod, linux');
    });

    it('renders a date column as it reaches the executor, in epoch milliseconds', () => {
      expect(render('At {{ data.ts }}', { ts: 1795436845149 })).toBe('At 1795436845149');
    });

    it('supports the default filter for a fallback value', () => {
      expect(render('CPU {{ data.cpu | default: "n/a" }}', { cpu: null })).toBe('CPU n/a');
    });
  });

  describe('output', () => {
    it('does not mutate the row', () => {
      const row = { 'host.name': 'web-1', hosts: ['a', 'b'] };
      render('{{ data.host.name }}', row);

      expect(row).toEqual({ 'host.name': 'web-1', hosts: ['a', 'b'] });
    });

    it('truncates the text to the stored limit', () => {
      const text = render('{{ data.long }}', {
        long: 'a'.repeat(MAX_REASON_TEMPLATE_LENGTH + 500),
      });

      expect(text).toHaveLength(MAX_REASON_TEMPLATE_LENGTH);
    });

    it('keeps text of exactly the limit', () => {
      expect(
        render('{{ data.long }}', { long: 'a'.repeat(MAX_REASON_TEMPLATE_LENGTH) })
      ).toHaveLength(MAX_REASON_TEMPLATE_LENGTH);
    });

    it('does not leave half a surrogate pair at the end of a truncated text', () => {
      // The emoji straddles the limit: its first half is the last kept code unit.
      const text = render('{{ data.long }}', {
        long: `${'a'.repeat(MAX_REASON_TEMPLATE_LENGTH - 1)}😀`,
      });

      expect(text).toBe('a'.repeat(MAX_REASON_TEMPLATE_LENGTH - 1));
    });

    it('returns no reason when the text is empty or only whitespace', () => {
      expect(render('{{ data.nope }}')).toBeUndefined();
      expect(render('  {{ data.nope }}  \n')).toBeUndefined();
    });

    it('returns no reason when there is no template', () => {
      expect(render(undefined)).toBeUndefined();
    });
  });

  describe('errors', () => {
    it('returns no reason and reports a template that does not parse', () => {
      const onError = jest.fn();
      const renderer = createReasonRenderer({ template: 'CPU {{ data.cpu ', rule, onError });

      expect(renderer.render({ cpu: 1 })).toBeUndefined();
      expect(renderer.render({ cpu: 2 })).toBeUndefined();
      expect(onError).toHaveBeenCalledTimes(1);
    });

    it('returns no reason and reports an unknown filter once, whatever the number of rows', () => {
      const onError = jest.fn();
      const renderer = createReasonRenderer({
        template: '{{ data.cpu | no_such_filter }}',
        rule,
        onError,
      });

      expect(renderer.render({ cpu: 1 })).toBeUndefined();
      expect(renderer.render({ cpu: 2 })).toBeUndefined();
      expect(onError).toHaveBeenCalledTimes(1);
    });

    it('does not throw without an error handler', () => {
      expect(() => render('{{ data.cpu | no_such_filter }}', { cpu: 1 })).not.toThrow();
    });
  });

  describe('safety', () => {
    it('does not expose prototype members', () => {
      expect(render('a{{ data.__proto__ }}b{{ data.constructor }}c{{ rule.constructor }}d')).toBe(
        'abcd'
      );
    });

    it('does not pollute the prototype through a malicious column name', () => {
      render('{{ data.a }}', {
        '__proto__.polluted': 'yes',
        'constructor.prototype.polluted': 'yes',
      });

      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    });

    it('gives up on a template that renders for too long, without throwing', () => {
      const onError = jest.fn();
      const renderer = createReasonRenderer({
        template: '{% for i in (1..5000000) %}x{% endfor %}',
        rule,
        onError,
      });

      expect(renderer.render({})).toBeUndefined();
      expect(onError).toHaveBeenCalledTimes(1);
    });

    it('stops rendering the remaining rows after a render fails', () => {
      const onError = jest.fn();
      const renderer = createReasonRenderer({
        template: '{% for i in (1..data.n) %}x{% endfor %}',
        rule,
        onError,
      });

      expect(renderer.render({ n: 3 })).toBe('xxx');
      expect(renderer.render({ n: 5000000 })).toBeUndefined();
      expect(renderer.render({ n: 3 })).toBeUndefined();
      expect(onError).toHaveBeenCalledTimes(1);
    });

    it('stops rendering once the time budget is spent', () => {
      const onError = jest.fn();
      const renderer = createReasonRenderer({
        template: 'ok',
        rule,
        onError,
        renderBudgetMs: 0,
      });

      expect(renderer.render({})).toBe('ok');
      expect(renderer.render({})).toBeUndefined();
      expect(onError).toHaveBeenCalledTimes(1);
    });
  });
});

describe('buildDataContext', () => {
  it('keeps every column by its flat name and nests the dotted ones', () => {
    expect(buildDataContext({ 'host.name': 'web-1', 'host.ip': '10.0.0.1', cpu: 1 })).toEqual({
      'host.name': 'web-1',
      'host.ip': '10.0.0.1',
      cpu: 1,
      host: { name: 'web-1', ip: '10.0.0.1' },
    });
  });

  it('does not overwrite a flat column that is also the prefix of a dotted one', () => {
    expect(buildDataContext({ host: 'web-1', 'host.name': 'x' })).toEqual({
      host: 'web-1',
      'host.name': 'x',
    });
  });

  it('does not nest columns with empty path segments or unsafe keys, but keeps them by flat name', () => {
    const data = buildDataContext({ 'a..b': 1, '.a': 2, '__proto__.x': 3 });

    expect(Object.keys(data).sort()).toEqual(['.a', '__proto__.x', 'a..b']);
    expect(Object.getPrototypeOf(data)).toBe(Object.prototype);
    expect(({} as Record<string, unknown>).x).toBeUndefined();
  });

  it('does not let a column named __proto__ replace the prototype of the data object', () => {
    const row: Record<string, unknown> = { cpu: 1 };
    Object.defineProperty(row, '__proto__', {
      value: ['injected'],
      enumerable: true,
      configurable: true,
      writable: true,
    });

    const data = buildDataContext(row);

    expect(Object.getPrototypeOf(data)).toBe(Object.prototype);
    expect(Object.keys(data)).toEqual(['cpu']);
  });

  it('keeps a column that is a nested object value untouched', () => {
    const nested = { inner: 1 };

    expect(buildDataContext({ obj: nested, 'obj.other': 2 })).toEqual({
      obj: { inner: 1 },
      'obj.other': 2,
    });
    expect(nested).toEqual({ inner: 1 });
  });
});
