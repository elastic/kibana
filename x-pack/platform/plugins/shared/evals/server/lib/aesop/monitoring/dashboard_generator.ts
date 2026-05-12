/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * AESOP Dashboard Generator Service
 *
 * Creates a comprehensive Kibana dashboard for monitoring autonomous skill discovery system:
 * - Skill invocation metrics
 * - Success rates and quality scores
 * - Approval rate improvement trends
 * - Token usage and cost efficiency
 * - Exploration performance
 * - Coverage metrics
 *
 * Uses Saved Objects API to create dashboard with Lens visualizations.
 */

import type { SavedObjectsClientContract, Logger } from '@kbn/core/server';

interface DashboardPanel {
  gridData: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  panelConfig: {
    title: string;
    type: string;
    query?: {
      esql?: string;
      kuery?: string;
    };
    visualizationType?: string;
    attributes?: Record<string, unknown>;
  };
}

export class DashboardGeneratorService {
  constructor(private savedObjectsClient: SavedObjectsClientContract, private logger: Logger) {}

  /**
   * Creates the AESOP Performance Monitoring Dashboard
   *
   * Returns the dashboard ID for navigation
   */
  async createPerformanceMonitoringDashboard(): Promise<string> {
    const dashboardId = 'aesop-performance-monitoring';

    this.logger.info('[AESOP Dashboard] Creating performance monitoring dashboard');

    // Create all visualization panels
    const panels = [
      this.createSkillInvocationPanel(),
      this.createSuccessRatePanel(),
      this.createApprovalRatePanel(),
      this.createValidationScorePanel(),
      this.createExplorationDurationPanel(),
      this.createTokenUsagePanel(),
      this.createCoveragePanel(),
      this.createCostEfficiencyPanel(),
    ];

    // Create dashboard saved object
    const dashboard = {
      type: 'dashboard',
      id: dashboardId,
      attributes: {
        title: 'AESOP: Autonomous Skill Discovery - Performance Monitoring',
        description:
          'Operational metrics for self-directed skill generation system. Monitors skill usage, quality, approval rates, and cost efficiency.',
        panelsJSON: JSON.stringify(
          panels.map((panel, index) => ({
            version: '8.15.0',
            gridData: panel.gridData,
            panelIndex: `panel-${index}`,
            embeddableConfig: {
              ...panel.panelConfig.attributes,
              title: panel.panelConfig.title,
            },
            panelRefName: `panel_${index}`,
          }))
        ),
        optionsJSON: JSON.stringify({
          useMargins: true,
          syncColors: true,
          syncCursor: true,
          syncTooltips: true,
          hidePanelTitles: false,
        }),
        timeRestore: true,
        timeFrom: 'now-7d',
        timeTo: 'now',
        refreshInterval: {
          pause: false,
          value: 300000, // Refresh every 5 minutes
        },
      },
    };

    try {
      await this.savedObjectsClient.create(dashboard.type, dashboard.attributes, {
        id: dashboard.id,
        overwrite: true,
      });

      this.logger.info(
        `[AESOP Dashboard] ✅ Dashboard created successfully dashboard_id=${dashboardId}`
      );

      return dashboardId;
    } catch (error) {
      this.logger.error(
        `[AESOP Dashboard] ❌ Failed to create dashboard error=${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  }

  /**
   * Panel 1: Skill Invocations (Last 7 Days)
   *
   * Bar chart showing skill usage frequency
   * Data source: traces-* (OTEL traces with aesop.skill.id)
   */
  private createSkillInvocationPanel(): DashboardPanel {
    return {
      gridData: { x: 0, y: 0, w: 24, h: 12 },
      panelConfig: {
        title: 'Skill Invocations (Last 7 Days)',
        type: 'lens',
        attributes: {
          visualizationType: 'lnsXY',
          state: {
            datasourceStates: {
              formBased: {
                layers: {
                  layer1: {
                    columns: {
                      skill_name: {
                        label: 'Skill Name',
                        dataType: 'string',
                        operationType: 'terms',
                        sourceField: 'attributes.aesop.skill.name',
                        params: {
                          size: 20,
                          orderBy: { type: 'column', columnId: 'invocation_count' },
                          orderDirection: 'desc',
                        },
                      },
                      invocation_count: {
                        label: 'Invocations',
                        dataType: 'number',
                        operationType: 'count',
                      },
                    },
                    columnOrder: ['skill_name', 'invocation_count'],
                    incompleteColumns: {},
                  },
                },
              },
            },
            visualization: {
              legend: { isVisible: true, position: 'right' },
              valueLabels: 'show',
              fittingFunction: 'None',
              axisTitlesVisibilitySettings: { x: true, yLeft: true },
              tickLabelsVisibilitySettings: { x: true, yLeft: true },
              labelsOrientation: { x: 0, yLeft: 0 },
              gridlinesVisibilitySettings: { x: true, yLeft: true },
              preferredSeriesType: 'bar_horizontal',
              layers: [
                {
                  layerId: 'layer1',
                  seriesType: 'bar_horizontal',
                  xAccessor: 'invocation_count',
                  splitAccessor: 'skill_name',
                },
              ],
            },
            query: {
              query: 'attributes.aesop.skill.id: *',
              language: 'kuery',
            },
            filters: [],
          },
        },
      },
    };
  }

  /**
   * Panel 2: Success Rate by Skill Type
   *
   * Pie chart showing success vs error rates
   * Data source: traces-* filtered by status.code
   */
  private createSuccessRatePanel(): DashboardPanel {
    return {
      gridData: { x: 24, y: 0, w: 24, h: 12 },
      panelConfig: {
        title: 'Skill Success Rate by Type',
        type: 'lens',
        attributes: {
          visualizationType: 'lnsPie',
          state: {
            datasourceStates: {
              formBased: {
                layers: {
                  layer1: {
                    columns: {
                      skill_type: {
                        label: 'Skill Type',
                        dataType: 'string',
                        operationType: 'terms',
                        sourceField: 'attributes.aesop.skill.type',
                        params: {
                          size: 10,
                          orderBy: { type: 'column', columnId: 'count' },
                          orderDirection: 'desc',
                        },
                      },
                      count: {
                        label: 'Count',
                        dataType: 'number',
                        operationType: 'count',
                      },
                      success_rate: {
                        label: 'Success Rate',
                        dataType: 'number',
                        operationType: 'formula',
                        params: {
                          formula: 'count(kql=\'status.code: "OK"\') / count() * 100',
                          format: {
                            id: 'percent',
                            params: { decimals: 1 },
                          },
                        },
                      },
                    },
                    columnOrder: ['skill_type', 'count', 'success_rate'],
                    incompleteColumns: {},
                  },
                },
              },
            },
            visualization: {
              shape: 'donut',
              palette: {
                type: 'palette',
                name: 'status',
              },
              layers: [
                {
                  layerId: 'layer1',
                  primaryGroups: ['skill_type'],
                  metrics: ['success_rate'],
                  numberDisplay: 'percent',
                  categoryDisplay: 'default',
                  legendDisplay: 'show',
                  nestedLegend: false,
                },
              ],
            },
            query: {
              query: 'attributes.aesop.skill.id: *',
              language: 'kuery',
            },
            filters: [],
          },
        },
      },
    };
  }

  /**
   * Panel 3: Approval Rate by Exploration Cycle
   *
   * Line chart showing improvement in approval rates over time
   * Data source: .aesop-proposed-skills
   *
   * This is the CRITICAL metric for validating the self-improvement hypothesis:
   * - Each cycle should show increasing approval rates
   * - Validates that feedback loop is working
   */
  private createApprovalRatePanel(): DashboardPanel {
    return {
      gridData: { x: 0, y: 12, w: 48, h: 15 },
      panelConfig: {
        title: 'Approval Rate by Exploration Cycle (Validates Improvement Hypothesis)',
        type: 'lens',
        attributes: {
          visualizationType: 'lnsXY',
          state: {
            datasourceStates: {
              formBased: {
                layers: {
                  layer1: {
                    columns: {
                      cycle_number: {
                        label: 'Cycle Number',
                        dataType: 'number',
                        operationType: 'terms',
                        sourceField: 'metadata.cycle_number',
                        params: {
                          size: 50,
                          orderBy: { type: 'alphabetical' },
                          orderDirection: 'asc',
                        },
                      },
                      total_skills: {
                        label: 'Total Skills',
                        dataType: 'number',
                        operationType: 'count',
                      },
                      approved_skills: {
                        label: 'Approved Skills',
                        dataType: 'number',
                        operationType: 'count',
                        filter: {
                          query: 'review.status: "approved"',
                          language: 'kuery',
                        },
                      },
                      approval_rate: {
                        label: 'Approval Rate (%)',
                        dataType: 'number',
                        operationType: 'formula',
                        params: {
                          formula: 'count(kql=\'review.status: "approved"\') / count() * 100',
                          format: {
                            id: 'percent',
                            params: { decimals: 1 },
                          },
                        },
                      },
                    },
                    columnOrder: [
                      'cycle_number',
                      'total_skills',
                      'approved_skills',
                      'approval_rate',
                    ],
                    incompleteColumns: {},
                  },
                },
              },
            },
            visualization: {
              legend: { isVisible: true, position: 'bottom' },
              valueLabels: 'show',
              fittingFunction: 'Linear',
              axisTitlesVisibilitySettings: { x: true, yLeft: true },
              tickLabelsVisibilitySettings: { x: true, yLeft: true },
              labelsOrientation: { x: 0, yLeft: 0 },
              gridlinesVisibilitySettings: { x: true, yLeft: true },
              preferredSeriesType: 'line',
              layers: [
                {
                  layerId: 'layer1',
                  seriesType: 'line',
                  xAccessor: 'cycle_number',
                  accessors: ['approval_rate'],
                  yConfig: [
                    {
                      forAccessor: 'approval_rate',
                      color: '#54B399', // Green for success
                    },
                  ],
                },
              ],
            },
            query: {
              query: '',
              language: 'kuery',
            },
            filters: [],
          },
        },
      },
    };
  }

  /**
   * Panel 4: Average Validation Scores
   *
   * Gauge showing current quality metrics
   * Data source: .aesop-proposed-skills
   */
  private createValidationScorePanel(): DashboardPanel {
    return {
      gridData: { x: 0, y: 27, w: 12, h: 10 },
      panelConfig: {
        title: 'Average Validation Score',
        type: 'lens',
        attributes: {
          visualizationType: 'lnsMetric',
          state: {
            datasourceStates: {
              formBased: {
                layers: {
                  layer1: {
                    columns: {
                      avg_score: {
                        label: 'Avg Validation Score',
                        dataType: 'number',
                        operationType: 'average',
                        sourceField: 'validation.quality_score',
                      },
                    },
                    columnOrder: ['avg_score'],
                    incompleteColumns: {},
                  },
                },
              },
            },
            visualization: {
              layerId: 'layer1',
              layerType: 'data',
              metricAccessor: 'avg_score',
              palette: {
                type: 'palette',
                name: 'status',
                params: {
                  stops: [
                    { color: '#CC5642', stop: 0.7 },
                    { color: '#D6BF57', stop: 0.85 },
                    { color: '#54B399', stop: 1.0 },
                  ],
                },
              },
            },
            query: {
              query: 'review.status: "approved"',
              language: 'kuery',
            },
            filters: [
              {
                meta: {
                  index: '.aesop-proposed-skills',
                  type: 'custom',
                  disabled: false,
                  negate: false,
                  alias: 'Recent (7 days)',
                },
                query: {
                  range: {
                    created_at: {
                      gte: 'now-7d/d',
                      lte: 'now',
                    },
                  },
                },
              },
            ],
          },
        },
      },
    };
  }

  /**
   * Panel 5: Exploration Duration Trend
   *
   * Time series showing workflow execution times
   * Data source: .aesop-workflow-executions
   */
  private createExplorationDurationPanel(): DashboardPanel {
    return {
      gridData: { x: 12, y: 27, w: 36, h: 10 },
      panelConfig: {
        title: 'Exploration Duration Trend',
        type: 'lens',
        attributes: {
          visualizationType: 'lnsXY',
          state: {
            datasourceStates: {
              formBased: {
                layers: {
                  layer1: {
                    columns: {
                      timestamp: {
                        label: 'Started At',
                        dataType: 'date',
                        operationType: 'date_histogram',
                        sourceField: 'started_at',
                        params: {
                          interval: 'auto',
                        },
                      },
                      avg_duration: {
                        label: 'Avg Duration (min)',
                        dataType: 'number',
                        operationType: 'formula',
                        params: {
                          formula: '(average(duration_ms) / 1000 / 60)',
                          format: {
                            id: 'duration',
                            params: {
                              inputFormat: 'minutes',
                              outputFormat: 'humanizePrecise',
                            },
                          },
                        },
                      },
                      p95_duration: {
                        label: 'P95 Duration (min)',
                        dataType: 'number',
                        operationType: 'percentile',
                        sourceField: 'duration_ms',
                        params: {
                          percentile: 95,
                        },
                      },
                    },
                    columnOrder: ['timestamp', 'avg_duration', 'p95_duration'],
                    incompleteColumns: {},
                  },
                },
              },
            },
            visualization: {
              legend: { isVisible: true, position: 'bottom' },
              valueLabels: 'hide',
              fittingFunction: 'Linear',
              axisTitlesVisibilitySettings: { x: true, yLeft: true },
              tickLabelsVisibilitySettings: { x: true, yLeft: true },
              labelsOrientation: { x: 0, yLeft: 0 },
              gridlinesVisibilitySettings: { x: true, yLeft: true },
              preferredSeriesType: 'area',
              layers: [
                {
                  layerId: 'layer1',
                  seriesType: 'area',
                  xAccessor: 'timestamp',
                  accessors: ['avg_duration', 'p95_duration'],
                },
              ],
            },
            query: {
              query: 'workflow_name: "aesop.self_exploration" AND status: "completed"',
              language: 'kuery',
            },
            filters: [],
          },
        },
      },
    };
  }

  /**
   * Panel 6: Token Usage by Agent
   *
   * Table showing token consumption per AESOP agent
   * Data source: traces-* aggregated by agent type
   */
  private createTokenUsagePanel(): DashboardPanel {
    return {
      gridData: { x: 0, y: 37, w: 24, h: 13 },
      panelConfig: {
        title: 'Token Usage by AESOP Agent',
        type: 'lens',
        attributes: {
          visualizationType: 'lnsDatatable',
          state: {
            datasourceStates: {
              formBased: {
                layers: {
                  layer1: {
                    columns: {
                      agent_name: {
                        label: 'Agent',
                        dataType: 'string',
                        operationType: 'terms',
                        sourceField: 'attributes.aesop.agent.id',
                        params: {
                          size: 10,
                          orderBy: { type: 'column', columnId: 'total_tokens' },
                          orderDirection: 'desc',
                        },
                      },
                      invocations: {
                        label: 'Invocations',
                        dataType: 'number',
                        operationType: 'count',
                      },
                      total_tokens: {
                        label: 'Total Tokens',
                        dataType: 'number',
                        operationType: 'formula',
                        params: {
                          formula:
                            'sum(attributes.gen_ai.usage.prompt_tokens) + sum(attributes.gen_ai.usage.completion_tokens)',
                          format: {
                            id: 'number',
                            params: { decimals: 0 },
                          },
                        },
                      },
                      avg_tokens: {
                        label: 'Avg Tokens/Call',
                        dataType: 'number',
                        operationType: 'formula',
                        params: {
                          formula:
                            '(sum(attributes.gen_ai.usage.prompt_tokens) + sum(attributes.gen_ai.usage.completion_tokens)) / count()',
                          format: {
                            id: 'number',
                            params: { decimals: 0 },
                          },
                        },
                      },
                      cached_tokens: {
                        label: 'Cached Tokens',
                        dataType: 'number',
                        operationType: 'sum',
                        sourceField: 'attributes.gen_ai.usage.prompt_tokens_cached',
                      },
                      cache_hit_rate: {
                        label: 'Cache Hit Rate',
                        dataType: 'number',
                        operationType: 'formula',
                        params: {
                          formula:
                            'sum(attributes.gen_ai.usage.prompt_tokens_cached) / sum(attributes.gen_ai.usage.prompt_tokens) * 100',
                          format: {
                            id: 'percent',
                            params: { decimals: 1 },
                          },
                        },
                      },
                    },
                    columnOrder: [
                      'agent_name',
                      'invocations',
                      'total_tokens',
                      'avg_tokens',
                      'cached_tokens',
                      'cache_hit_rate',
                    ],
                    incompleteColumns: {},
                  },
                },
              },
            },
            visualization: {
              layerId: 'layer1',
              columns: [
                { columnId: 'agent_name' },
                { columnId: 'invocations', isTransposed: false },
                { columnId: 'total_tokens', isTransposed: false },
                { columnId: 'avg_tokens', isTransposed: false },
                { columnId: 'cached_tokens', isTransposed: false },
                { columnId: 'cache_hit_rate', isTransposed: false },
              ],
            },
            query: {
              query: 'attributes.aesop.agent.id: *',
              language: 'kuery',
            },
            filters: [],
          },
        },
      },
    };
  }

  /**
   * Panel 7: Discovery Coverage
   *
   * Gauge showing percentage of indices explored
   * Data source: .aesop-workflow-executions
   */
  private createCoveragePanel(): DashboardPanel {
    return {
      gridData: { x: 24, y: 37, w: 12, h: 13 },
      panelConfig: {
        title: 'Discovery Coverage',
        type: 'lens',
        attributes: {
          visualizationType: 'lnsMetric',
          state: {
            datasourceStates: {
              formBased: {
                layers: {
                  layer1: {
                    columns: {
                      coverage: {
                        label: 'Coverage',
                        dataType: 'number',
                        operationType: 'formula',
                        params: {
                          formula:
                            'average(metrics.indices_discovered) / average(metrics.total_indices) * 100',
                          format: {
                            id: 'percent',
                            params: { decimals: 0 },
                          },
                        },
                      },
                    },
                    columnOrder: ['coverage'],
                    incompleteColumns: {},
                  },
                },
              },
            },
            visualization: {
              layerId: 'layer1',
              layerType: 'data',
              metricAccessor: 'coverage',
              palette: {
                type: 'palette',
                name: 'temperature',
                params: {
                  stops: [
                    { color: '#CC5642', stop: 0.3 },
                    { color: '#D6BF57', stop: 0.6 },
                    { color: '#54B399', stop: 1.0 },
                  ],
                },
              },
            },
            query: {
              query: 'workflow_name: "aesop.self_exploration" AND status: "completed"',
              language: 'kuery',
            },
            filters: [
              {
                meta: {
                  index: '.aesop-workflow-executions',
                  type: 'custom',
                  disabled: false,
                  negate: false,
                  alias: 'Latest execution',
                },
                query: {
                  range: {
                    started_at: {
                      gte: 'now-1d/d',
                      lte: 'now',
                    },
                  },
                },
              },
            ],
          },
        },
      },
    };
  }

  /**
   * Panel 8: Cost Efficiency
   *
   * Single metric showing cost per skill generated
   * Data source: Cross-index calculation (traces-* + .aesop-proposed-skills)
   */
  private createCostEfficiencyPanel(): DashboardPanel {
    return {
      gridData: { x: 36, y: 37, w: 12, h: 13 },
      panelConfig: {
        title: 'Cost per Skill Generated',
        type: 'lens',
        attributes: {
          visualizationType: 'lnsMetric',
          state: {
            datasourceStates: {
              formBased: {
                layers: {
                  layer1: {
                    columns: {
                      cost_per_skill: {
                        label: 'Cost per Skill',
                        dataType: 'number',
                        operationType: 'formula',
                        params: {
                          formula:
                            '(sum(attributes.gen_ai.usage.prompt_tokens) * 0.003 / 1000 + sum(attributes.gen_ai.usage.completion_tokens) * 0.015 / 1000) / unique_count(attributes.aesop.skill.id)',
                          format: {
                            id: 'currency',
                            params: { decimals: 4 },
                          },
                        },
                      },
                    },
                    columnOrder: ['cost_per_skill'],
                    incompleteColumns: {},
                  },
                },
              },
            },
            visualization: {
              layerId: 'layer1',
              layerType: 'data',
              metricAccessor: 'cost_per_skill',
              palette: {
                type: 'palette',
                name: 'status',
                params: {
                  stops: [
                    { color: '#54B399', stop: 0.5 }, // Green for low cost
                    { color: '#D6BF57', stop: 2.0 }, // Yellow for medium
                    { color: '#CC5642', stop: 10.0 }, // Red for high cost
                  ],
                },
              },
            },
            query: {
              query: 'attributes.aesop.workflow.execution_id: *',
              language: 'kuery',
            },
            filters: [
              {
                meta: {
                  index: 'traces-*',
                  type: 'custom',
                  disabled: false,
                  negate: false,
                  alias: 'Last 7 days',
                },
                query: {
                  range: {
                    '@timestamp': {
                      gte: 'now-7d/d',
                      lte: 'now',
                    },
                  },
                },
              },
            ],
          },
        },
      },
    };
  }
}
