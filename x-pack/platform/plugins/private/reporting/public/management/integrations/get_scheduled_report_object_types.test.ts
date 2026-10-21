/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getScheduledReportObjectTypes } from './get_scheduled_report_object_types';

describe('getScheduledReportObjectTypes', () => {
  it('registers search when CSV is enabled', () => {
    expect(
      getScheduledReportObjectTypes({
        csv: { enabled: true },
        pdf: { enabled: false },
        png: { enabled: false },
      })
    ).toEqual(['search']);
  });

  it('registers dashboard, lens, and visualization when PNG is enabled', () => {
    expect(
      getScheduledReportObjectTypes({
        csv: { enabled: false },
        pdf: { enabled: false },
        png: { enabled: true },
      })
    ).toEqual(['dashboard', 'lens', 'visualization']);
  });

  it('registers screenshot object types plus ai_value_report when PDF is enabled', () => {
    expect(
      getScheduledReportObjectTypes({
        csv: { enabled: false },
        pdf: { enabled: true },
        png: { enabled: false },
      })
    ).toEqual(['dashboard', 'lens', 'visualization', 'ai_value_report']);
  });

  it('registers search and screenshot types when CSV and screenshots are enabled', () => {
    expect(
      getScheduledReportObjectTypes({
        csv: { enabled: true },
        pdf: { enabled: true },
        png: { enabled: true },
      })
    ).toEqual(['search', 'dashboard', 'lens', 'visualization', 'ai_value_report']);
  });

  it('registers nothing when all export types are disabled', () => {
    expect(
      getScheduledReportObjectTypes({
        csv: { enabled: false },
        pdf: { enabled: false },
        png: { enabled: false },
      })
    ).toEqual([]);
  });
});
