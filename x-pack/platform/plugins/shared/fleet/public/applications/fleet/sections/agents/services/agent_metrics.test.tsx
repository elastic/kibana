/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';

import { formatAgentCPU } from './agent_metrics';

jest.mock('../components/metric_non_available', () => {
  return {
    MetricNonAvailable: () => <>N/A</>,
  };
});

jest.mock('@elastic/eui', () => {
  return {
    ...jest.requireActual('@elastic/eui'),
    EuiToolTip: (props: any) => <div data-tooltip-content={props.content}>{props.children}</div>,
  };
});

describe('Agent metrics helper', () => {
  describe('formatAgentCPU', () => {
    it('should return 0% if cpu is 0.00002', () => {
      const res = formatAgentCPU({
        cpu_avg: 0.00002,
        memory_size_byte_avg: 2000,
      });

      const result = render(<>{res}</>);

      expect(result.asFragment()).toMatchInlineSnapshot(`
        <DocumentFragment>
          <div
            data-tooltip-content="0.0020 %"
          >
            <span
              tabindex="0"
            >
              0.00 %
            </span>
          </div>
        </DocumentFragment>
      `);
    });

    it('should return 5% if cpu is 0.005', () => {
      const res = formatAgentCPU({
        cpu_avg: 0.005,
        memory_size_byte_avg: 2000,
      });

      const result = render(<>{res}</>);

      expect(result.asFragment()).toMatchInlineSnapshot(`
        <DocumentFragment>
          <div
            data-tooltip-content="0.5000 %"
          >
            <span
              tabindex="0"
            >
              0.50 %
            </span>
          </div>
        </DocumentFragment>
      `);
    });

    it('should return N/A if cpu is undefined', () => {
      const res = formatAgentCPU({
        cpu_avg: undefined,
        memory_size_byte_avg: 2000,
      });

      const result = render(<>{res}</>);

      expect(result.asFragment()).toMatchInlineSnapshot(`
        <DocumentFragment>
          N/A
        </DocumentFragment>
      `);
    });
  });
});
