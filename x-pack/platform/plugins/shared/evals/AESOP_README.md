# AESOP: Agent-driven Exploration for Security Operations Proficiency

**Experimental PoC - Internal Research Project**

---

## Overview

AESOP demonstrates **self-directed skill acquisition** for Agent Builder. Instead of manually creating skills, an LLM agent:

1. **Explores** Elasticsearch environment (read-only)
2. **Discovers** schemas, relationships, and query patterns
3. **Proposes** Agent Builder skills based on observed workflows
4. **Validates** skills via @kbn/evals with O11y trace analysis
5. **Awaits** human approval before deployment

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Self-Exploration Workflow (Kibana Workflows YAML)      │
│  → Discovers indices, profiles data, mines patterns     │
│  → Generates Agent Builder skills (stored in ES)        │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│  Skill Validation Workflow (YAML + @kbn/evals)          │
│  → Runs evaluations with O11y trace capture            │
│  → Analyzes OTEL spans from traces-* indices            │
│  → Iteratively improves until convergence (2 passes)    │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│  Human Review UI (extends evals plugin)                 │
│  → View proposed skills + eval scores + traces          │
│  → Approve → Deploy to Agent Builder                    │
│  → Reject → Provide feedback                            │
└─────────────────────────────────────────────────────────┘
```

---

## Key Files

**Workflows** (`server/workflows/aesop/`):
- `self_exploration.yaml` - Main exploration workflow (5 phases)
- `skill_validation.yaml` - Validation with iterative improvement
- `skill_validation_iteration.yaml` - Single validation iteration

**API Routes** (`server/routes/aesop/`):
- `run_exploration.ts` - POST /internal/aesop/exploration/run
- `list_proposed_skills.ts` - GET /internal/aesop/skills/proposed
- `run_skill_validation.ts` - POST /internal/aesop/skills/{id}/validate
- `approve_skill.ts` - POST /internal/aesop/skills/{id}/approve

**UI** (`public/pages/aesop/`):
- `proposed_skills_list.tsx` - List proposed skills
- `components/skill_review_flyout.tsx` - Review/approve interface

**Agent Definitions** (`server/lib/aesop/agents/`):
- `create_aesop_agents.ts` - 6 custom Agent Builder agents

**Demo** (`security_solution/scripts/aesop_demo/`):
- `data_generator.ts` - Synthetic multi-persona data
- `setup_environment.sh` - Automated environment setup

---

## Technology Stack

**100% Elastic-Native**:
- ✅ **Kibana Workflows** - Orchestration (not LangGraph)
- ✅ **@kbn/evals** - Evaluation framework
- ✅ **O11y Traces** - OTEL spans in `traces-*` (not LangSmith)
- ✅ **Agent Builder** - Skill storage and execution
- ✅ **Evals Plugin** - UI (extends existing PR #254845)

---

## Configuration

Add to `kibana.dev.yml`:

```yaml
xpack.evals.enabled: true
xpack.workflows.enabled: true

telemetry.enabled: true
telemetry.tracing.enabled: true
telemetry.tracing.sample_rate: 1
telemetry.tracing.exporters:
  - http:
      url: "http://localhost:4318/v1/traces"
```

Start EDOT collector:
```bash
node scripts/edot_collector
```

---

## Usage

```bash
# 1. Setup demo environment
./x-pack/solutions/security/plugins/security_solution/scripts/aesop_demo/setup_environment.sh

# 2. Navigate to AESOP UI
open http://localhost:5601/app/evals/aesop

# 3. Trigger exploration → validate → review → approve
```

See [AESOP Demo Guide](../../../docs/aesop_demo_guide.md) for detailed walkthrough.

---

## Safety & Security

- ✅ **Read-only exploration**: Agent has zero write permissions
- ✅ **Human approval gate**: No skill deploys without review
- ✅ **Audit logging**: All queries logged with trace IDs
- ✅ **Scoped access**: Agent only sees permitted indices

---

## Validation Approach

**PRIMARY**: O11y Traces (Elastic-native)
- Extract metrics from OTEL spans in `traces-*`
- Trace-based evaluators: tokens, latency, tool calls, errors
- TraceWaterfall UI for visualization

**SECONDARY**: LangSmith (cross-validation only - goal: remove)
- Verify Elastic metrics match LangSmith
- Log parity results
- Drop after ≥95% agreement proven

---

## Status

**Current**: Experimental PoC (Week 5 of 5)

**Next**: Production hardening (if PoC successful)

**Goal**: Prove self-directed skill acquisition is viable alternative to prescribed intelligence

---

## References

- Architecture: [`docs/aesop_poc_architecture.md`](../../../docs/aesop_poc_architecture.md)
- O11y Traces: [`docs/aesop_o11y_traces_validation.md`](../../../docs/aesop_o11y_traces_validation.md)
- Demo Guide: [`docs/aesop_demo_guide.md`](../../../docs/aesop_demo_guide.md)
- Evals Plugin: [PR #254845](https://github.com/elastic/kibana/pull/254845)
