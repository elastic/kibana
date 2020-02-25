/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { renderWithIntl } from '../../../../../../../../../test_utils/enzyme_helpers';
import { ExplainExporters, ExplainExportersCloud } from '../exporters';

// Mocking to prevent errors with React portal.
// Temporary until https://github.com/elastic/kibana/pull/55877 provides other alternatives.
jest.mock('@elastic/eui/lib/components/code/code', () => {
  const React = require.requireActual('react');
  return {
    EuiCode: ({ children }) => (
      <span>
        <code>{children}</code>
      </span>
    ),
  };
});

describe('ExplainExporters', () => {
  test('should explain about xpack.monitoring.exporters setting', () => {
    const reason = {
      property: 'xpack.monitoring.exporters',
      data: 'myMonitoringClusterExporter1',
      context: 'esProd001',
    };

    const component = renderWithIntl(<ExplainExporters {...{ reason }} />);
    expect(component).toMatchSnapshot();
  });
});

describe('ExplainExportersCloud', () => {
  test('should explain about xpack.monitoring.exporters setting in a cloud environment', () => {
    const component = renderWithIntl(<ExplainExportersCloud />);
    expect(component).toMatchSnapshot();
  });
});
