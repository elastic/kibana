/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const schema: object = {
  openapi: '3.0.0',
  info: { title: 'Dashboard Schema', version: '1.0.0' },
  components: {
    schemas: {
      Position: {
        type: 'object',
        properties: {
          x: { type: 'number', description: 'X coordinate (grid units)' },
          y: { type: 'number', description: 'Y coordinate (grid units)' },
          width: { type: 'number', description: 'Width in grid units' },
          height: { type: 'number', description: 'Height in grid units' },
        },
        required: ['x', 'y', 'width', 'height'],
        description: 'Position and size of a dashboard panel in a 24-column grid system.',
      },
      VisualizationType: {
        type: 'string',
        enum: [
          'line_chart',
          'area_chart',
          'bar_chart',
          'pie_chart',
          'donut_chart',
          'histogram',
          'heatmap',
          'data_table',
          'metric',
          'gauge',
          'markdown',
          'map',
        ],
        description: 'Type of visualization to display.',
      },
      Panel: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            minLength: 1,
            description: 'Unique identifier for the panel.',
          },
          title: {
            type: 'string',
            minLength: 1,
            description: 'Display title for the panel.',
          },
          description: {
            type: 'string',
            description: 'Optional description of what the panel shows.',
          },
          type: {
            $ref: '#/components/schemas/VisualizationType',
            description: 'Type of visualization.',
          },
          query: {
            type: 'string',
            minLength: 1,
            description: 'ESQL query to fetch data for this panel.',
          },
          position: {
            $ref: '#/components/schemas/Position',
            description: 'Position and size of the panel.',
          },
          config: {
            type: 'object',
            description: 'Optional visualization-specific configuration.',
            additionalProperties: true,
          },
        },
        required: ['id', 'title', 'type', 'query', 'position'],
        description: 'A single panel within the dashboard.',
      },
      TimeRange: {
        type: 'object',
        properties: {
          from: {
            type: 'string',
            description: 'Start time (e.g., "now-24h", "2023-01-01T00:00:00Z").',
          },
          to: {
            type: 'string',
            description: 'End time (e.g., "now", "2023-01-02T00:00:00Z").',
          },
        },
        required: ['from', 'to'],
        description: 'Time range for the dashboard.',
      },
      Filter: {
        type: 'object',
        properties: {
          field: {
            type: 'string',
            minLength: 1,
            description: 'Field name to filter on.',
          },
          label: {
            type: 'string',
            minLength: 1,
            description: 'Display label for the filter.',
          },
          type: {
            type: 'string',
            enum: ['terms', 'range', 'exists', 'match'],
            description: 'Type of filter.',
          },
          options: {
            type: 'array',
            items: { type: 'string' },
            description: 'Available options for terms filters.',
          },
        },
        required: ['field', 'label', 'type'],
        description: 'Interactive filter for the dashboard.',
      },
      Dashboard: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            minLength: 1,
            description: 'Title of the dashboard.',
          },
          description: {
            type: 'string',
            description: 'Description of what the dashboard shows.',
          },
          panels: {
            type: 'array',
            items: { $ref: '#/components/schemas/Panel' },
            minItems: 1,
            description: 'Array of panels that make up the dashboard.',
          },
          timeRange: {
            $ref: '#/components/schemas/TimeRange',
            description: 'Default time range for the dashboard.',
          },
          refreshInterval: {
            type: 'string',
            description: 'How often to refresh data (e.g., "30s", "5m", "1h").',
          },
          filters: {
            type: 'array',
            items: { $ref: '#/components/schemas/Filter' },
            description: 'Global filters available across all panels.',
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Tags to categorize the dashboard.',
          },
        },
        required: ['title', 'panels', 'timeRange'],
        description: 'Complete dashboard definition with all panels and configuration.',
      },
    },
  },
};
