/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';

import { formatAgentCPU, formatAgentCPULimit } from './agent_metrics';

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
            0.00 %
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
            0.50 %
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
  describe('formatAgentCPULimit', () => {
    it('should return correct CPU limit set in policy if agent is on latest revision', () => {
      const res = formatAgentCPULimit(
        {
          policy_revision: 1,
          id: 'Agent1',
          packages: [],
          type: 'EPHEMERAL',
          active: false,
          enrolled_at: '',
          local_metadata: {},
        },
        {
          id: 'policy1',
          revision: 1,
          advanced_settings: { agent_limits_cpu: 50 },
          status: 'active',
          is_managed: false,
          updated_at: '',
          namespace: 'default',
          monitoring_enabled: [],
          updated_by: '',
          is_protected: false,
          name: '',
        }
      );
      expect(res).toEqual('50 %');
    });

    it('should return N/A if agent is not on latest policy revision', () => {
      const res = formatAgentCPULimit(
        {
          policy_revision: 1,
          id: 'Agent1',
          packages: [],
          type: 'EPHEMERAL',
          active: false,
          enrolled_at: '',
          local_metadata: {},
        },
        {
          id: 'policy1',
          revision: 2,
          advanced_settings: { agent_limits_cpu: 50 },
          status: 'active',
          is_managed: false,
          updated_at: '',
          namespace: 'default',
          monitoring_enabled: [],
          updated_by: '',
          is_protected: false,
          name: '',
        }
      );
      const result = render(<>{res}</>);

      expect(result.asFragment()).toMatchInlineSnapshot(`
        <DocumentFragment>
          N/A
        </DocumentFragment>
      `);
    });
    it('should return N/A if CPU limit is not set on policy', () => {
      const res = formatAgentCPULimit(
        {
          policy_revision: 2,
          id: 'Agent1',
          packages: [],
          type: 'EPHEMERAL',
          active: false,
          enrolled_at: '',
          local_metadata: {},
        },
        {
          id: 'policy1',
          revision: 2,
          advanced_settings: {},
          status: 'active',
          is_managed: false,
          updated_at: '',
          namespace: 'default',
          monitoring_enabled: [],
          updated_by: '',
          is_protected: false,
          name: '',
        }
      );
      const result = render(<>{res}</>);

      expect(result.asFragment()).toMatchInlineSnapshot(`
        <DocumentFragment>
          N/A
        </DocumentFragment>
      `);
    });
  });
});
