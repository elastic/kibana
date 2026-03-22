# AESOP Developer Guide

Complete guide for developers working on the Autonomous Skill Discovery system.

## Table of Contents

1. [Development Setup](#development-setup)
2. [Architecture Overview](#architecture-overview)
3. [Adding New Agents](#adding-new-agents)
4. [Modifying Workflows](#modifying-workflows)
5. [Adding New Evaluators](#adding-new-evaluators)
6. [Debugging & Testing](#debugging--testing)
7. [Contributing](#contributing)

---

## Development Setup

### Prerequisites

**Required Tools:**
- Node.js 20.x
- Yarn 1.22+
- Docker (for local Elasticsearch/Kibana)
- Git

**Recommended IDE:**
- VS Code with extensions:
  - ESLint
  - Prettier
  - TypeScript and JavaScript Language Features

### Local Environment Setup

**1. Clone Kibana repository:**

```bash
git clone https://github.com/elastic/kibana.git
cd kibana
```

**2. Install dependencies:**

```bash
yarn kbn bootstrap
```

**3. Start Elasticsearch:**

```bash
yarn es snapshot \
  --license trial \
  --ssl \
  -E xpack.security.enabled=true
```

**4. Start Kibana in development mode:**

```bash
yarn start \
  --no-base-path \
  --xpack.evals.enabled=true \
  --xpack.workflows.enabled=true \
  --xpack.agentBuilder.enabled=true
```

**5. Start EDOT collector:**

```bash
cd x-pack/platform/plugins/shared/evals/scripts
docker-compose up -d edot-collector
```

**6. Load sample data:**

```bash
cd x-pack/solutions/security/plugins/security_solution/scripts/aesop_demo
./setup_environment.sh
```

### Project Structure

```
x-pack/platform/plugins/shared/evals/
├── server/
│   ├── lib/
│   │   └── aesop/
│   │       ├── agents/              # AI agents for discovery
│   │       ├── workflows/           # Workflow state management
│   │       ├── caching/             # Performance optimization
│   │       ├── incremental/         # Incremental exploration
│   │       ├── learning/            # Feedback learning
│   │       ├── monitoring/          # APM & dashboards
│   │       ├── security/            # Input validation, rate limiting
│   │       └── versioning/          # Skill versioning
│   ├── routes/
│   │   └── aesop/                   # API route handlers
│   ├── workflows/
│   │   └── aesop/                   # YAML workflow definitions
│   └── __tests__/
│       ├── aesop_e2e/               # End-to-end tests
│       ├── aesop_competitive_benchmarks.test.ts
│       └── o11y_langsmith_parity.test.ts
├── public/
│   └── pages/
│       └── aesop/                   # UI components
└── docs/                             # Documentation
    ├── deployment_guide.md
    ├── troubleshooting_guide.md
    ├── api_reference.md
    └── developer_guide.md (this file)
```

### Running Tests

**Unit tests:**

```bash
# Run all AESOP tests
node scripts/jest --testPathPattern=aesop

# Run specific test file
node scripts/jest server/lib/aesop/incremental/exploration_state.test.ts

# Watch mode
node scripts/jest --watch --testPathPattern=aesop
```

**E2E tests:**

```bash
# Run full E2E suite (requires running Kibana + ES)
node scripts/jest server/__tests__/aesop_e2e/full_exploration.test.ts

# Run with trace output
DEBUG=aesop:* node scripts/jest server/__tests__/aesop_e2e/
```

**Type checking:**

```bash
# Scope to evals plugin
yarn test:type_check --project x-pack/platform/plugins/shared/evals/tsconfig.json
```

**Linting:**

```bash
# Lint only changed files
node scripts/eslint --fix $(git diff --name-only HEAD | grep '\.ts$')

# Lint all AESOP files
node scripts/eslint --fix 'x-pack/platform/plugins/shared/evals/server/lib/aesop/**/*.ts'
```

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                      Kibana AESOP Plugin                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ API Routes   │  │  Workflows   │  │  UI Pages    │       │
│  │ (Express)    │  │  (YAML)      │  │  (React)     │       │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘       │
│         │                 │                                   │
│         └────────┬────────┘                                   │
│                  │                                            │
│         ┌────────▼─────────────────────────────┐             │
│         │     AESOP Core Services              │             │
│         ├──────────────────────────────────────┤             │
│         │ • Exploration State Manager          │             │
│         │ • Agent Orchestrator                 │             │
│         │ • Feedback Learning Engine           │             │
│         │ • Skill Validation Service           │             │
│         │ • APM Instrumentation                │             │
│         └────────┬─────────────────────────────┘             │
│                  │                                            │
└──────────────────┼────────────────────────────────────────────┘
                   │
    ┌──────────────┼──────────────┐
    │              │              │
    ▼              ▼              ▼
┌───────┐   ┌────────────┐   ┌────────────┐
│  ES   │   │   Agent    │   │   EDOT     │
│ (Data)│   │  Builder   │   │ Collector  │
└───────┘   └────────────┘   └────────────┘
```

### Data Flow

**Exploration Workflow:**

```
1. User triggers exploration
   │
   ├─> POST /internal/aesop/exploration/run
   │
2. Workflow starts
   │
   ├─> Load exploration state (cycle N)
   │
   ├─> Load previous feedback
   │
3. Schema Discovery Agent
   │
   ├─> Analyze scoped_indices
   │   • Fetch mappings
   │   • Sample documents
   │   • Categorize fields
   │
   ├─> Store schemas in state
   │
4. Pattern Mining Agent
   │
   ├─> Analyze documents
   │   • Detect frequent patterns
   │   • Identify relationships
   │   • Calculate confidence
   │
   ├─> Store patterns in state
   │
5. Skill Generation Agent
   │
   ├─> Generate skill candidates
   │   • Use role persona
   │   • Reference patterns
   │   • Incorporate feedback
   │
   ├─> Store in .aesop-proposed-skills
   │
6. Skill Validation Workflow (per skill)
   │
   ├─> Syntax validation
   │
   ├─> Security scan
   │
   ├─> Quality evaluation
   │
   ├─> Update validation status
   │
7. Workflow completion
   │
   ├─> Update execution status
   │
   ├─> Emit metrics
   │
   └─> Notify user
```

**Approval/Rejection Flow:**

```
User approves skill
   │
   ├─> POST /internal/aesop/skills/{id}/approve
   │
   ├─> Update review status
   │
   ├─> Deploy to Agent Builder
   │   • POST /api/agent_builder/skills
   │   • Skill immediately available
   │
   └─> Return agent_builder_skill_id

User rejects skill
   │
   ├─> POST /internal/aesop/skills/{id}/reject
   │
   ├─> Store in .aesop-rejection-feedback
   │   • Reason category
   │   • Detailed feedback
   │
   ├─> Update review status
   │
   └─> Feedback used in next cycle
```

---

## Adding New Agents

### Agent Interface

All AESOP agents implement this interface:

```typescript
interface AESOPAgent {
  id: string;
  name: string;
  role: string;
  systemPrompt: string;

  invoke(input: Record<string, unknown>): Promise<AgentResponse>;
}

interface AgentResponse {
  result: unknown;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cached_tokens?: number;
  };
}
```

### Example: Creating a New Agent

**Step 1: Create agent file**

Create `server/lib/aesop/agents/my_new_agent.ts`:

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AgentBuilderAPI } from '../../../types';

interface MyAgentInput {
  data: Record<string, unknown>;
  context: string;
}

interface MyAgentOutput {
  insights: string[];
  confidence: number;
}

/**
 * My New Agent
 *
 * Purpose: Analyze data and extract insights
 * Input: Raw data + context
 * Output: Structured insights with confidence scores
 */
export class MyNewAgent {
  public readonly id = 'aesop.my_new_agent';
  public readonly name = 'My New Agent';
  public readonly role = 'Data Analyst';

  constructor(
    private agentBuilder: AgentBuilderAPI,
    private logger: Logger
  ) {}

  /**
   * System prompt that defines agent behavior
   */
  private get systemPrompt(): string {
    return `You are a data analyst AI specializing in extracting insights from security data.

Your role:
- Analyze provided data structures
- Identify patterns and anomalies
- Generate actionable insights
- Assign confidence scores (0.0-1.0)

Output format:
{
  "insights": ["insight 1", "insight 2", ...],
  "confidence": 0.85
}

Guidelines:
- Be specific and actionable
- Focus on security-relevant insights
- Explain your reasoning
- Assign realistic confidence scores`;
  }

  /**
   * Invoke the agent
   *
   * @param input - Agent input data
   * @returns Structured insights
   */
  async invoke(input: MyAgentInput): Promise<MyAgentOutput> {
    this.logger.info(`[${this.id}] Invoking agent`, {
      context: input.context,
    });

    try {
      // Construct prompt
      const prompt = this.buildPrompt(input);

      // Call Agent Builder
      const response = await this.agentBuilder.invoke({
        agent_id: this.id,
        system_prompt: this.systemPrompt,
        user_message: prompt,
        response_format: 'json',
      });

      // Parse response
      const output = JSON.parse(response.content) as MyAgentOutput;

      this.logger.info(`[${this.id}] Agent completed`, {
        insights_count: output.insights.length,
        confidence: output.confidence,
        tokens_used: response.usage?.total_tokens,
      });

      return output;
    } catch (error) {
      this.logger.error(`[${this.id}] Agent invocation failed`, { error });
      throw error;
    }
  }

  /**
   * Build prompt from input
   */
  private buildPrompt(input: MyAgentInput): string {
    return `Context: ${input.context}

Data to analyze:
${JSON.stringify(input.data, null, 2)}

Task: Extract insights and assign confidence score.`;
  }
}
```

**Step 2: Register agent**

Add to `server/lib/aesop/agents/create_aesop_agents.ts`:

```typescript
import { MyNewAgent } from './my_new_agent';

export function createAESOPAgents(
  agentBuilder: AgentBuilderAPI,
  logger: Logger
): AESOPAgents {
  return {
    schemaCategorizer: new SchemaCategorizerAgent(agentBuilder, logger),
    patternMiner: new PatternMinerAgent(agentBuilder, logger),
    skillGenerator: new SkillGeneratorAgent(agentBuilder, logger),
    feedbackAnalyzer: new FeedbackAnalyzerAgent(agentBuilder, logger),
    myNewAgent: new MyNewAgent(agentBuilder, logger),  // ← Add here
  };
}
```

**Step 3: Add type definition**

Update `server/lib/aesop/types.ts`:

```typescript
export interface AESOPAgents {
  schemaCategorizer: SchemaCategorizerAgent;
  patternMiner: PatternMinerAgent;
  skillGenerator: SkillGeneratorAgent;
  feedbackAnalyzer: FeedbackAnalyzerAgent;
  myNewAgent: MyNewAgent;  // ← Add here
}
```

**Step 4: Use in workflow**

Add step to `server/workflows/aesop/self_exploration.yaml`:

```yaml
steps:
  # ... existing steps ...

  - id: my_new_analysis
    name: Run My New Agent
    agent: aesop.my_new_agent
    input:
      data: ${{ steps.schema_discovery.output.schemas }}
      context: "Analyze security data schemas"
    output_mapping:
      insights: insights
      confidence: confidence
```

**Step 5: Write tests**

Create `server/lib/aesop/agents/my_new_agent.test.ts`:

```typescript
import { MyNewAgent } from './my_new_agent';
import { createMockAgentBuilder, createMockLogger } from '../../__mocks__';

describe('MyNewAgent', () => {
  let agent: MyNewAgent;
  let mockAgentBuilder: ReturnType<typeof createMockAgentBuilder>;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockAgentBuilder = createMockAgentBuilder();
    mockLogger = createMockLogger();
    agent = new MyNewAgent(mockAgentBuilder, mockLogger);
  });

  it('should extract insights from data', async () => {
    mockAgentBuilder.invoke.mockResolvedValue({
      content: JSON.stringify({
        insights: ['Insight 1', 'Insight 2'],
        confidence: 0.9,
      }),
      usage: {
        prompt_tokens: 500,
        completion_tokens: 100,
        total_tokens: 600,
      },
    });

    const result = await agent.invoke({
      data: { field1: 'value1' },
      context: 'Test context',
    });

    expect(result.insights).toHaveLength(2);
    expect(result.confidence).toBe(0.9);
    expect(mockAgentBuilder.invoke).toHaveBeenCalledWith({
      agent_id: 'aesop.my_new_agent',
      system_prompt: expect.stringContaining('data analyst'),
      user_message: expect.stringContaining('Test context'),
      response_format: 'json',
    });
  });

  it('should handle errors gracefully', async () => {
    mockAgentBuilder.invoke.mockRejectedValue(new Error('API error'));

    await expect(
      agent.invoke({
        data: {},
        context: 'Test',
      })
    ).rejects.toThrow('API error');
  });
});
```

---

## Modifying Workflows

### Workflow Structure

AESOP workflows are defined in YAML format using the Workflows plugin syntax.

**Location:** `server/workflows/aesop/*.yaml`

**Example workflow:**

```yaml
name: aesop.my_workflow
description: Custom workflow for AESOP

variables:
  # Input variables
  user_input:
    description: Input from user
    type: string
    required: true
    default: ""

  # Internal variables
  processing_mode:
    description: Processing mode
    type: string
    required: false
    default: "standard"

steps:
  # Step 1: Initialize
  - id: initialize
    name: Initialize Workflow
    agent: aesop.initializer
    input:
      mode: ${{ variables.processing_mode }}
    output_mapping:
      state: initialization_state

  # Step 2: Process Data
  - id: process
    name: Process Data
    agent: aesop.processor
    input:
      user_input: ${{ variables.user_input }}
      state: ${{ steps.initialize.output.state }}
    condition: ${{ steps.initialize.output.state.ready == true }}
    on_error: stop
    output_mapping:
      result: processing_result

  # Step 3: Finalize
  - id: finalize
    name: Finalize Results
    agent: aesop.finalizer
    input:
      result: ${{ steps.process.output.result }}
    output_mapping:
      final_output: output
```

### Key Concepts

**Variables:**
- `required: true` - Must be provided when workflow starts
- `default: value` - Default value if not provided

**Steps:**
- `id` - Unique identifier for step
- `agent` - Agent to invoke
- `input` - Data passed to agent
- `condition` - Optional condition to run step
- `on_error` - Error handling: `stop`, `skip`, `continue`
- `output_mapping` - Map agent output to workflow state

**Variable References:**
- `${{ variables.name }}` - Input variable
- `${{ steps.step_id.output.field }}` - Output from previous step

### Adding a New Workflow

**Step 1: Create YAML file**

Create `server/workflows/aesop/my_workflow.yaml`:

```yaml
name: aesop.my_custom_workflow
description: My custom AESOP workflow

version: "1.0"

variables:
  target_indices:
    description: Indices to analyze
    type: array
    required: true

  analysis_depth:
    description: How deep to analyze
    type: number
    required: false
    default: 100

steps:
  - id: fetch_data
    name: Fetch Data from Indices
    agent: aesop.data_fetcher
    input:
      indices: ${{ variables.target_indices }}
      depth: ${{ variables.analysis_depth }}
    output_mapping:
      documents: fetched_documents

  - id: analyze
    name: Analyze Documents
    agent: aesop.my_new_agent
    input:
      data: ${{ steps.fetch_data.output.documents }}
      context: "Custom analysis"
    output_mapping:
      insights: analysis_results
```

**Step 2: Register workflow**

Update `server/plugin.ts`:

```typescript
import myWorkflowYaml from './workflows/aesop/my_workflow.yaml';

// In plugin setup
await workflowsManagement.registerWorkflow({
  id: 'aesop.my_custom_workflow',
  name: 'My Custom Workflow',
  enabled: true,
  definition: parseYaml(myWorkflowYaml),
  yaml: myWorkflowYaml,
});
```

**Step 3: Create API route**

Create `server/routes/aesop/run_my_workflow.ts`:

```typescript
export function registerRunMyWorkflowRoute(router: IRouter<EvalsRequestHandlerContext>) {
  router.versioned
    .post({
      path: '/internal/aesop/my_workflow/run',
      access: 'internal',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: buildRouteValidationWithZod(
              z.object({
                target_indices: z.array(z.string()),
                analysis_depth: z.number().optional(),
              })
            ),
          },
        },
      },
      async (context, request, response) => {
        const { workflowsManagement } = context;

        const executionId = await workflowsManagement.management.runWorkflow(
          {
            id: 'aesop.my_custom_workflow',
            name: 'My Custom Workflow',
            enabled: true,
            definition: {},
            yaml: '',
          },
          'default',
          request.body,
          request
        );

        return response.ok({
          body: {
            success: true,
            execution_id: executionId,
          },
        });
      }
    );
}
```

**Step 4: Test workflow**

```bash
curl -X POST "http://localhost:5601/internal/aesop/my_workflow/run" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -u elastic:changeme \
  -d '{
    "target_indices": [".alerts-security.alerts-*"],
    "analysis_depth": 50
  }'
```

---

## Adding New Evaluators

Evaluators assess the quality of generated skills.

### Evaluator Interface

```typescript
interface SkillEvaluator {
  id: string;
  name: string;

  evaluate(skill: ProposedSkill): Promise<EvaluationResult>;
}

interface EvaluationResult {
  score: number;          // 0.0-1.0
  passed: boolean;        // true if score >= threshold
  explanation: string;    // Why this score
  errors?: string[];      // Any validation errors
}
```

### Example: Creating a New Evaluator

**Step 1: Create evaluator file**

Create `server/lib/aesop/evaluators/my_evaluator.ts`:

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

interface ProposedSkill {
  skill_id: string;
  skill_name: string;
  skill_content: string;
  skill_type: string;
}

interface EvaluationResult {
  score: number;
  passed: boolean;
  explanation: string;
  errors?: string[];
}

/**
 * My Custom Evaluator
 *
 * Evaluates skills based on custom criteria
 */
export class MyCustomEvaluator {
  public readonly id = 'my_custom_evaluator';
  public readonly name = 'My Custom Evaluator';

  private readonly threshold = 0.75;

  constructor(private logger: Logger) {}

  /**
   * Evaluate a proposed skill
   *
   * @param skill - Skill to evaluate
   * @returns Evaluation result
   */
  async evaluate(skill: ProposedSkill): Promise<EvaluationResult> {
    this.logger.debug(`[${this.id}] Evaluating skill: ${skill.skill_id}`);

    const errors: string[] = [];
    let score = 1.0;

    // Criterion 1: Skill name length
    if (skill.skill_name.length < 10) {
      errors.push('Skill name too short (< 10 chars)');
      score -= 0.2;
    }

    // Criterion 2: Content includes examples
    if (!skill.skill_content.includes('Example:')) {
      errors.push('Skill missing examples');
      score -= 0.3;
    }

    // Criterion 3: Type is specific
    if (skill.skill_type === 'general') {
      errors.push('Skill type too generic');
      score -= 0.2;
    }

    const passed = score >= this.threshold;

    const explanation = passed
      ? `Skill meets quality standards (score: ${score.toFixed(2)})`
      : `Skill below quality threshold (score: ${score.toFixed(2)}, threshold: ${this.threshold})`;

    this.logger.info(`[${this.id}] Evaluation complete`, {
      skill_id: skill.skill_id,
      score,
      passed,
    });

    return {
      score,
      passed,
      explanation,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}
```

**Step 2: Register evaluator**

Add to validation workflow `server/workflows/aesop/skill_validation.yaml`:

```yaml
steps:
  # ... existing steps ...

  - id: my_custom_evaluation
    name: Run My Custom Evaluator
    evaluator: my_custom_evaluator
    input:
      skill: ${{ variables.skill }}
    output_mapping:
      score: custom_score
      passed: custom_passed
```

**Step 3: Update validation logic**

Update `server/lib/aesop/validation/skill_validator.ts`:

```typescript
import { MyCustomEvaluator } from '../evaluators/my_evaluator';

export class SkillValidator {
  private readonly evaluators: SkillEvaluator[];

  constructor(logger: Logger) {
    this.evaluators = [
      new SyntaxEvaluator(logger),
      new SecurityEvaluator(logger),
      new QualityEvaluator(logger),
      new MyCustomEvaluator(logger),  // ← Add here
    ];
  }

  async validateSkill(skill: ProposedSkill): Promise<ValidationResult> {
    const results = await Promise.all(
      this.evaluators.map((evaluator) => evaluator.evaluate(skill))
    );

    // Aggregate scores
    const totalScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    const allPassed = results.every((r) => r.passed);

    return {
      quality_score: totalScore,
      passed: allPassed,
      evaluator_results: results,
    };
  }
}
```

---

## Debugging & Testing

### Logging

AESOP uses structured logging:

```typescript
// Good: Structured log
context.logger.info('[AESOP] Exploration started', {
  execution_id: executionId,
  agent_role: agentRole,
  scoped_indices: scopedIndices.length,
});

// Bad: Unstructured log
context.logger.info(`[AESOP] Exploration ${executionId} started for ${agentRole}`);
```

**Log Levels:**
- `error`: Failures that prevent operation
- `warn`: Issues that don't prevent operation
- `info`: Important state changes
- `debug`: Detailed execution flow
- `trace`: Very detailed (usually disabled)

**Viewing Logs:**

```bash
# Tail Kibana logs
tail -f /var/log/kibana/kibana.log | grep AESOP

# Filter by component
grep "aesop.schema_categorizer" /var/log/kibana/kibana.log

# In development mode (stdout)
yarn start | grep AESOP
```

### Debugging Workflows

**1. Check workflow state:**

```bash
GET /.aesop-workflow-executions/_doc/{execution_id}
```

**2. Check step-by-step execution:**

```bash
GET /traces-apm.otel-*/_search
{
  "query": {
    "term": { "attributes.aesop.workflow.execution_id": "{execution_id}" }
  },
  "sort": [{ "@timestamp": "asc" }],
  "size": 100
}
```

**3. Add debug logging:**

In your agent:

```typescript
this.logger.debug('[MyAgent] Input received', {
  input_size: JSON.stringify(input).length,
  input_keys: Object.keys(input),
});

// ... processing ...

this.logger.debug('[MyAgent] Output generated', {
  output_size: JSON.stringify(output).length,
  output_keys: Object.keys(output),
});
```

**4. Use VS Code debugger:**

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Kibana",
      "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/yarn",
      "runtimeArgs": ["start", "--no-base-path"],
      "console": "integratedTerminal",
      "env": {
        "NODE_OPTIONS": "--inspect"
      }
    }
  ]
}
```

Set breakpoints in your code and press F5.

### Testing Strategies

**Unit Tests:**

Test individual components in isolation:

```typescript
// server/lib/aesop/agents/my_agent.test.ts
describe('MyAgent', () => {
  it('should process input correctly', async () => {
    const agent = new MyAgent(mockAgentBuilder, mockLogger);

    const result = await agent.invoke({
      data: testData,
      context: 'test',
    });

    expect(result).toMatchObject({
      insights: expect.arrayContaining(['expected insight']),
      confidence: expect.any(Number),
    });
  });
});
```

**Integration Tests:**

Test component interactions:

```typescript
// server/__tests__/aesop_integration/workflow_execution.test.ts
describe('Workflow Execution', () => {
  it('should run full exploration workflow', async () => {
    const executionId = await startExploration({
      agent_role: 'SOC analyst',
      scoped_indices: [testIndexName],
    });

    // Wait for completion
    await waitForWorkflowCompletion(executionId, 60000);

    // Verify results
    const proposedSkills = await getProposedSkills();
    expect(proposedSkills.length).toBeGreaterThan(0);
  });
});
```

**E2E Tests:**

Test full user flows:

```typescript
// server/__tests__/aesop_e2e/full_cycle.test.ts
describe('AESOP Full Cycle E2E', () => {
  it('should complete exploration → validation → approval cycle', async () => {
    // 1. Run exploration
    const { execution_id } = await runExploration();
    await waitForCompletion(execution_id);

    // 2. List proposed skills
    const { skills } = await listProposedSkills();
    expect(skills.length).toBeGreaterThan(0);

    // 3. Validate skill
    const skillId = skills[0].skill_id;
    await validateSkill(skillId);

    // 4. Approve skill
    const { agent_builder_skill_id } = await approveSkill(skillId);

    // 5. Verify deployment
    const deployedSkill = await getAgentBuilderSkill(agent_builder_skill_id);
    expect(deployedSkill).toBeDefined();
  });
});
```

---

## Contributing

### Code Style

**TypeScript:**
- Use `snake_case` for file names
- Use `camelCase` for variables and functions
- Use `PascalCase` for types and classes
- Prefer `interface` over `type` for object shapes
- Avoid `any` and `unknown` (use proper types)

**Imports:**
- Group imports: external, Kibana, local
- Sort alphabetically within groups

**Example:**

```typescript
// External
import { z } from '@kbn/zod';

// Kibana
import type { IRouter, Logger } from '@kbn/core/server';
import type { EvalsRequestHandlerContext } from '../../types';

// Local
import { MyAgent } from './my_agent';
import type { AgentInput, AgentOutput } from './types';
```

### Pull Request Process

**1. Create feature branch:**

```bash
git checkout -b feature/aesop-my-feature
```

**2. Make changes:**

- Follow code style
- Add tests
- Update documentation

**3. Run pre-commit checks:**

```bash
# Type check
yarn test:type_check --project x-pack/platform/plugins/shared/evals/tsconfig.json

# Lint
node scripts/eslint --fix $(git diff --name-only HEAD)

# Test
node scripts/jest --testPathPattern=aesop

# Build
node scripts/build --skip-archives
```

**4. Commit:**

```bash
git add .
git commit -m "feat(aesop): add my new feature

- Implemented X
- Updated Y
- Added tests for Z

Closes #12345"
```

**5. Push and create PR:**

```bash
git push origin feature/aesop-my-feature
```

Open PR on GitHub with:
- Clear title
- Description of changes
- Testing performed
- Screenshots (if UI change)

**6. Address review feedback:**

- Make requested changes
- Push updates
- Re-request review

**7. Merge:**

- Squash and merge (preferred)
- Delete branch after merge

### Documentation

**Update docs when:**
- Adding new API endpoint → Update `api_reference.md`
- Adding new agent → Update this file
- Changing workflow → Update `deployment_guide.md`
- Fixing common issue → Update `troubleshooting_guide.md`

**Documentation style:**
- Write in present tense
- Use active voice
- Include code examples
- Add "Why" not just "How"

### Getting Help

**Channels:**
- Slack: `#evals-aesop` (internal)
- GitHub Discussions: `elastic/kibana` (public)
- Code reviews: Tag @elastic/evals-team

**Before asking:**
1. Check documentation
2. Search existing issues
3. Try debugging yourself
4. Prepare minimal reproduction

**When asking:**
- Describe what you tried
- Share error messages
- Provide context
- Ask specific questions

---

## Appendix

### Useful Scripts

**Generate mock data:**

```bash
cd x-pack/solutions/security/plugins/security_solution/scripts/aesop_demo
./generate_mock_alerts.sh --count 1000
```

**Clear AESOP state:**

```bash
# WARNING: Deletes all AESOP data
curl -X DELETE "http://localhost:9200/.aesop-*"
```

**Export skill for testing:**

```bash
GET /.aesop-proposed-skills/_doc/{skill_id} > skill.json
```

**Replay exploration:**

```bash
# Load previous state
GET /.aesop-exploration-state/_doc/cycle_{N}

# Trigger with same parameters
curl -X POST "http://localhost:5601/internal/aesop/exploration/run" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -u elastic:changeme \
  -d @previous_params.json
```

### Reference Links

**Kibana Development:**
- [Kibana Contributing Guide](https://github.com/elastic/kibana/blob/main/CONTRIBUTING.md)
- [Kibana Style Guide](https://github.com/elastic/kibana/blob/main/STYLEGUIDE.md)
- [TypeScript Best Practices](https://github.com/elastic/kibana/blob/main/packages/kbn-dev-utils/src/ts_node.ts)

**Agent Builder:**
- [Agent Builder API Docs](https://www.elastic.co/guide/en/kibana/current/agent-builder-api.html)
- [Agent Builder Plugin](https://github.com/elastic/kibana/tree/main/x-pack/plugins/agent_builder)

**Workflows:**
- [Workflows Plugin](https://github.com/elastic/kibana/tree/main/x-pack/plugins/workflows)
- [YAML Workflow Syntax](https://www.elastic.co/guide/en/kibana/current/workflows-yaml.html)

**EDOT (OpenTelemetry):**
- [EDOT Collector](https://www.elastic.co/guide/en/observability/current/apm-open-telemetry.html)
- [OpenTelemetry Spec](https://opentelemetry.io/docs/specs/otel/)
