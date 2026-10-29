/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDeploymentInstructions } from './deployment';

describe('getDeploymentInstructions', () => {
  it('renders a stateful deployment with its space solution and license', () => {
    const instructions = getDeploymentInstructions({
      environment: 'ech',
      version: '9.3.0',
      airgapped: false,
      solution: 'oblt',
      license: { type: 'platinum', status: 'active' },
    });

    expect(instructions).toContain('## DEPLOYMENT');
    expect(instructions).toContain('- Environment: Elastic Cloud Hosted (ECH)');
    expect(instructions).toContain('- Stack version: 9.3.0');
    expect(instructions).toContain('- Space solution view: Observability');
    expect(instructions).toContain('- License: platinum (active)');
    expect(instructions).not.toContain('Project type');
    expect(instructions).not.toContain('Air-gapped');
  });

  it('renders a serverless project', () => {
    const instructions = getDeploymentInstructions({
      environment: 'serverless',
      airgapped: false,
      serverless: { projectType: 'search' },
    });

    expect(instructions).toContain('- Environment: Elastic Cloud Serverless');
    expect(instructions).toContain('- Project type: Elasticsearch');
    expect(instructions).not.toContain('Product tier');
    expect(instructions).not.toContain('Stack version');
    expect(instructions).not.toContain('License');
  });

  it('renders the product tier by its product name', () => {
    const instructions = getDeploymentInstructions({
      environment: 'serverless',
      airgapped: false,
      serverless: { projectType: 'security', productTier: 'search_ai_lake' },
    });

    expect(instructions).toContain('- Project type: Security');
    expect(instructions).toContain('- Product tier: Elastic AI SOC Engine (EASE)');
  });

  it('renders ECE, self-managed and the air-gapped flag', () => {
    expect(
      getDeploymentInstructions({ environment: 'ece', version: '9.3.0', airgapped: false })
    ).toContain('- Environment: Elastic Cloud Enterprise (ECE)');

    const selfManaged = getDeploymentInstructions({
      environment: 'self_managed',
      version: '9.3.0',
      airgapped: true,
    });
    expect(selfManaged).toContain('- Environment: Self-managed');
    expect(selfManaged).toContain('- Air-gapped: yes');
  });

  it('falls back to the raw value for unknown project types, product tiers and solutions', () => {
    const serverless = getDeploymentInstructions({
      environment: 'serverless',
      airgapped: false,
      serverless: { projectType: 'new_type', productTier: 'new_tier' },
    });
    expect(serverless).toContain('- Project type: new_type');
    expect(serverless).toContain('- Product tier: new_tier');

    expect(
      getDeploymentInstructions({
        environment: 'self_managed',
        version: '9.3.0',
        airgapped: false,
        solution: 'new_solution',
      })
    ).toContain('- Space solution view: new_solution');
  });
});
