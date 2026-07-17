/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Curated Raw Vega sunburst skeleton. Normalize rebinds the Canonical ES|QL
 * source; the model must adapt field names to the Parent–child table columns.
 * Static diagram only — no Kibana interaction helpers.
 *
 * The example query emits ONE synthetic root, mid-level parents, and leaves
 * (via FORK) so Vega `stratify` never hits "missing: <id>" or "multiple roots".
 */
export const spec: Record<string, unknown> = {
  $schema: 'https://vega.github.io/schema/vega/v5.json',
  title: 'Hierarchy sunburst',
  data: [
    {
      name: 'source',
      url: {
        '%type%': 'esql',
        query: `FROM kibana_sample_data_flights
| WHERE OriginCountry IS NOT NULL AND DestCountry IS NOT NULL
| FORK
  (STATS value = COUNT()
   | EVAL id = "root", parent = null, name = "All"
   | KEEP id, parent, name, value)
  (STATS value = COUNT() BY OriginCountry
   | EVAL id = OriginCountry, parent = "root", name = OriginCountry
   | KEEP id, parent, name, value)
  (STATS value = COUNT() BY OriginCountry, DestCountry
   | SORT value DESC
   | LIMIT 40
   | EVAL id = CONCAT(OriginCountry, "::", DestCountry), parent = OriginCountry, name = DestCountry
   | KEEP id, parent, name, value)`,
      },
    },
    {
      name: 'tree',
      source: 'source',
      transform: [
        { type: 'stratify', key: 'id', parentKey: 'parent' },
        {
          type: 'partition',
          field: 'value',
          sort: { field: 'value', order: 'descending' },
          size: [{ signal: '2 * PI' }, { signal: 'min(width, height) / 2' }],
        },
      ],
    },
  ],
  scales: [
    {
      name: 'color',
      type: 'ordinal',
      domain: { data: 'tree', field: 'depth' },
      range: { scheme: 'blues' },
    },
  ],
  marks: [
    {
      type: 'arc',
      from: { data: 'tree' },
      encode: {
        enter: {
          x: { signal: 'width / 2' },
          y: { signal: 'height / 2' },
          fill: { scale: 'color', field: 'depth' },
          tooltip: { signal: "datum.name + ': ' + datum.value" },
        },
        update: {
          startAngle: { field: 'x0' },
          endAngle: { field: 'x1' },
          innerRadius: { field: 'y0' },
          outerRadius: { field: 'y1' },
          stroke: { value: 'white' },
        },
      },
    },
  ],
};
