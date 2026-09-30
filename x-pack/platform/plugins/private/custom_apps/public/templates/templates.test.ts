/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { customAppDefinitionSchema, getPanelIds } from '../../common/app_definition';
import { customAppCatalogSchema } from '../catalog';
import { persistentDepth } from '../app/custom_app_grid';
import { CUSTOM_APP_TEMPLATES } from '.';

describe.each(CUSTOM_APP_TEMPLATES.map((t) => [t.name, t] as const))(
  'template: %s',
  (_, template) => {
    const definition = template.build();

    it('passes the same validation the API applies', () => {
      const result = customAppDefinitionSchema.safeParse(definition);
      expect(result.success ? null : result.error.message).toBeNull();
    });

    it('gives every laid-out panel a surface', () => {
      for (const panelId of getPanelIds(definition.layout)) {
        expect(definition.surfaces[panelId]).toBeDefined();
      }
    });

    it('defines exactly one root component per surface', () => {
      for (const [panelId, messages] of Object.entries(definition.surfaces)) {
        const created = messages[0] as { createSurface?: { components?: Array<{ id: string }> } };
        const roots = (created.createSurface?.components ?? []).filter((c) => c.id === 'root');
        expect({ panelId, roots: roots.length }).toEqual({ panelId, roots: 1 });
      }
    });

    it('only uses components the catalog defines', () => {
      const known = new Set(Object.keys(customAppCatalogSchema.components));
      for (const messages of Object.values(definition.surfaces)) {
        const created = messages[0] as {
          createSurface?: { components?: Array<{ component: string }> };
        };
        for (const component of created.createSurface?.components ?? []) {
          expect(known).toContain(component.component);
        }
      }
    });

    it('drives every panel from ES|QL over its own data set', () => {
      const queries = Object.values(definition.queries ?? {}).flat();
      expect(queries.length).toBeGreaterThan(0);
      for (const query of queries) {
        // A template may join a second index — the alert lookup, say — so this
        // checks the template reads what it claims to, not that it reads only that.
        expect(query.query).toMatch(/\bFROM\s+\S/);
        // The page time picker supplies the range; a query that pins its own
        // would silently ignore the picker.
        expect(query.query).not.toMatch(/\bWHERE\s+@timestamp\s*[<>]/i);
      }
      const all = queries.map((query) => query.query).join('\n');
      expect(all).toContain(template.indexPattern);
    });

    it('orders every multi-row query totally, so a refetch cannot reshuffle it', () => {
      // ES|QL does not break ties deterministically: two namespaces with the same
      // pod count came back in a different order on consecutive runs, which reads
      // as rows flickering whenever anything re-renders. So a list query needs a
      // SORT, and that SORT has to end on something unique per row — either
      // several columns, or the query's sole grouping key.
      for (const [panelId, queries] of Object.entries(definition.queries ?? {})) {
        for (const query of queries) {
          if (query.shape !== 'rows' && query.shape !== 'groups') continue;

          const sort = /\|\s*SORT\s+([^|`]+)/i.exec(query.query);
          expect({ panelId, hasSort: Boolean(sort) }).toEqual({ panelId, hasSort: true });

          const columns = sort![1]
            .split(',')
            .map((part) => part.trim().replace(/\s+(ASC|DESC)$/i, ''))
            .filter(Boolean);

          // `STATS ... BY x = expr` makes x unique per row, so sorting on it alone
          // is already a total order.
          const byClause = /\bBY\s+([^|`]+)/i.exec(query.query)?.[1] ?? '';
          const groupKeys = byClause
            .split(',')
            .map((part) => part.split('=')[0].trim())
            .filter(Boolean);
          const isTotal =
            columns.length > 1 || (groupKeys.length === 1 && columns[0] === groupKeys[0]);

          expect({ panelId, sort: sort![1].trim(), isTotal }).toEqual({
            panelId,
            sort: sort![1].trim(),
            isTotal: true,
          });
        }
      }
    });

    it('writes every query into a path some component binds to', () => {
      const serialized = JSON.stringify(definition.surfaces);
      for (const query of Object.values(definition.queries ?? {}).flat()) {
        expect(serialized).toContain(`"${query.path}`);
      }
    });

    const componentsOf = (panelId: string) => {
      const created = definition.surfaces[panelId]?.[0] as {
        createSurface?: { components?: Array<{ component: string }> };
      };
      return (created?.createSurface?.components ?? []).map((c) => c.component);
    };

    it('renders its own title rather than relying on page chrome', () => {
      // The top bar carries actions only, so an app with no heading of its own
      // would render with nothing identifying it.
      const headings = Object.keys(definition.surfaces).flatMap(componentsOf);
      expect(headings).toContain('Text');
      const serialized = JSON.stringify(definition.surfaces);
      expect(serialized).toContain('"variant":"heading1"');
    });

    it('drops the panel frame on prose and controls, keeps it on data panels', () => {
      const borderless = Object.entries(definition.panels)
        .filter(([, panel]) => panel.hideBorder)
        .map(([id]) => id);
      // A borderless panel should have no title — the two go together, since a
      // titled panel with no frame looks like a rendering bug.
      for (const id of borderless) {
        expect(definition.panels[id].title).toBeUndefined();
      }
      expect(borderless.length).toBeGreaterThan(0);
    });

    it('puts every tabbed panel on a tab that the tab bar will show', () => {
      const tabs = new Set(
        Object.values(definition.panels)
          .map((panel) => panel.tab)
          .filter(Boolean)
      );
      expect(tabs.size).toBeGreaterThan(1);
      // The header and filter panels must stay untabbed so they persist.
      expect(definition.panels.header?.tab).toBeUndefined();
      expect(definition.panels.filters?.tab).toBeUndefined();
    });

    it('lays each tab out from the same starting row', () => {
      const byTab = new Map<string, number[]>();
      for (const [id, panel] of Object.entries(definition.panels)) {
        const widget = definition.layout[id];
        if (!panel.tab || !widget || widget.type !== 'panel') continue;
        byTab.set(panel.tab, [...(byTab.get(panel.tab) ?? []), widget.row]);
      }
      // Tabs are shown one at a time, so each must start just below the
      // persistent panels rather than continuing the previous tab's rows.
      // Derived rather than hardcoded, so resizing a header panel does not
      // require editing this number.
      const start = persistentDepth(definition);
      for (const [tab, rows] of byTab) {
        expect({ tab, start: Math.min(...rows) }).toEqual({ tab, start });
      }
    });

    it('never has two panels claim the same top-level data model key', () => {
      // Panels share one data model, so `/selected` seeded by two panels would
      // silently overwrite: one panel's modal would open on the other's row.
      const owners = new Map<string, string>();
      const claim = (key: string, panelId: string) => {
        expect({ key, owner: owners.get(key) ?? panelId }).toEqual({ key, owner: panelId });
        owners.set(key, panelId);
      };

      for (const [panelId, messages] of Object.entries(definition.surfaces)) {
        const created = messages[0] as { createSurface?: { dataModel?: Record<string, unknown> } };
        for (const key of Object.keys(created.createSurface?.dataModel ?? {})) {
          claim(key, panelId);
        }
      }
      for (const [panelId, queries] of Object.entries(definition.queries ?? {})) {
        for (const query of queries) {
          claim(query.path.split('/')[1], panelId);
        }
      }
    });

    it('owns its time filter, exactly once', () => {
      const pickers = Object.keys(definition.surfaces)
        .flatMap(componentsOf)
        .filter((name) => name === 'KbnTimeFilter');
      expect(pickers).toHaveLength(1);
    });
  }
);

describe('CUSTOM_APP_TEMPLATES', () => {
  it('has unique ids', () => {
    const ids = CUSTOM_APP_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
