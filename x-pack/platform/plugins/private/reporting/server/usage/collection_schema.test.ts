/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReportingSchema } from './collection_schema';

describe('Reporting telemetry collection schema', () => {
  test('fields', () => {
    expect(ReportingSchema).toMatchInlineSnapshot(`
      Object {
        "available": Object {
          "type": "boolean",
        },
        "enabled": Object {
          "type": "boolean",
        },
        "error_messages": Object {
          "items": Object {
            "type": "text",
          },
          "type": "array",
        },
        "has_errors": Object {
          "type": "boolean",
        },
        "number_of_enabled_scheduled_reports": Object {
          "type": "long",
        },
        "number_of_enabled_scheduled_reports_by_type": Object {
          "PNGV2": Object {
            "type": "long",
          },
          "csv_searchsource": Object {
            "type": "long",
          },
          "csv_v2": Object {
            "type": "long",
          },
          "printable_pdf": Object {
            "type": "long",
          },
          "printable_pdf_v2": Object {
            "type": "long",
          },
        },
        "number_of_scheduled_reports": Object {
          "type": "long",
        },
        "number_of_scheduled_reports_by_type": Object {
          "PNGV2": Object {
            "type": "long",
          },
          "csv_searchsource": Object {
            "type": "long",
          },
          "csv_v2": Object {
            "type": "long",
          },
          "printable_pdf": Object {
            "type": "long",
          },
          "printable_pdf_v2": Object {
            "type": "long",
          },
        },
        "number_of_scheduled_reports_with_notifications": Object {
          "type": "long",
        },
      }
    `);
  });
});
