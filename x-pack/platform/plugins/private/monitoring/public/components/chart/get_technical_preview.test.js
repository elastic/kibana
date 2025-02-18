/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { getTechnicalPreview } from './get_technical_preview';

describe('getTechnicalPreview', function () {
  it('with metric.technicalPreview undefined', () => {
    const series = [{ metric: {} }, { metric: { technicalPreview: true } }];
    expect(getTechnicalPreview(series)).to.be(false);
  });

  it('with metric.technicalPreview false', () => {
    const series = [
      { metric: { technicalPreview: false } },
      { metric: { technicalPreview: true } },
    ];
    expect(getTechnicalPreview(series)).to.be(false);
  });

  it('with metric.technicalPreview true', () => {
    const series = [
      { metric: { technicalPreview: true } },
      { metric: { technicalPreview: false } },
    ];
    expect(getTechnicalPreview(series)).to.be(true);
  });
});
