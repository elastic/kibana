/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { customAppDefinitionSchema, getPanelIds } from '../../common/app_definition';
import { SAMPLE_DATA_INDEX } from '../../common/constants';
import { customAppCatalogSchema } from '../catalog';
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

    it('queries the sample logs data set via ES|QL', () => {
      const queries = Object.values(definition.queries ?? {}).flat();
      expect(queries.length).toBeGreaterThan(0);
      for (const query of queries) {
        expect(query.query).toContain(SAMPLE_DATA_INDEX);
        // The page time picker supplies the range; a query that pins its own
        // would silently ignore the picker.
        expect(query.query).not.toMatch(/\bWHERE\s+@timestamp\s*[<>]/i);
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
