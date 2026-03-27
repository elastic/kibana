# @kbn/evals-extensions

Advanced evaluation capabilities for `@kbn/evals` - **standalone extensions package**.

## Purpose

This package extends `@kbn/evals` with advanced features ported from [cursor-plugin-evals](https://github.com/patrykkopycinski/cursor-plugin-evals) and serves as the home for Phases 3-5 of the evals roadmap.

## Architecture: Independent Package Design

**Critical principle:** This package is designed to be **completely independent** from `@kbn/evals`.

```
┌─────────────────────────────────────────────────────┐
│              Evaluation Suites                      │
│  (agent-builder, obs-ai-assistant, security)        │
└──────────────────┬──────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
┌──────────────────┐   ┌─────────────────────────────┐
│   @kbn/evals     │   │   @kbn/evals-extensions     │
│   (core)         │   │   (advanced features)       │
│                  │   │                             │
│ ✅ Evaluators    │   │ ✅ Safety evaluators        │
│ ✅ Scout/PW      │   │ ✅ Cost tracking            │
│ ✅ ES export     │   │ ✅ Dataset management       │
│ ✅ Stats         │   │ ✅ UI components            │
│ ✅ CLI basics    │   │ ✅ Watch mode               │
│                  │   │ ✅ A/B testing              │
│ ❌ NO imports    │   │ ✅ Human-in-the-loop        │
│    from ext ─────┼───┼──X                          │
│                  │   │                             │
└──────────────────┘   └──────────┬──────────────────┘
                                  │
                                  │ depends on
                                  ▼
                       ┌──────────────────┐
                       │   @kbn/evals     │
                       │   (types, utils) │
                       └──────────────────┘
```

**Dependency Rules:**
- ✅ `kbn-evals-extensions` CAN import from `kbn-evals`
- ❌ `kbn-evals` MUST NOT import from `kbn-evals-extensions`
- ✅ Evaluation suites can use both packages independently

## Features

### Current Status: Foundation (PR #1)
- ✅ Package structure established
- ✅ Build configuration
- ✅ Test infrastructure
- ❌ No functional features yet (placeholder exports only)

### Roadmap

#### **PR #2: Cost Tracking & Metadata** (Weeks 2-3)
- Token-based cost calculation
- Hyperparameter tracking (temperature, top_p, etc.)
- Environment snapshots (Kibana/ES versions, plugins)
- Run tagging and annotations

#### **PR #3: Dataset Management** (Weeks 4-6)
- Dataset versioning (semantic versioning)
- Schema validation (Zod-based)
- Deduplication (similarity-based)
- Merging and splitting utilities
- Filtering and statistics

#### **PR #4: Safety Evaluators** (Weeks 7-10)
- Toxicity detection
- PII detection
- Bias detection
- Hallucination detection
- Refusal testing
- Content moderation

#### **PR #5: UI Components** (Weeks 11-16)
- Run comparison viewer (side-by-side diff)
- Example explorer (worst-case analysis)
- Score distribution charts
- Integration with evals Kibana plugin

#### **PR #6: DX Enhancements** (Weeks 17-21)
- Watch mode (auto-rerun on changes)
- Parallel execution (multi-suite concurrency)
- Result caching (skip unchanged examples)
- Incremental evaluation (delta-only runs)
- Interactive mode (step-through debugging)
- Dry-run mode (validation without execution)

#### **PR #7: Advanced Analytics** (Weeks 22-24)
- Confidence intervals (bootstrapping)
- Outlier detection (Z-score, IQR, Isolation Forest)
- Failure clustering (K-means, hierarchical)
- Error taxonomy
- Ensemble evaluation
- Calibration analysis

#### **PR #8: A/B Testing & Active Learning** (Weeks 25-29)
- A/B testing framework with statistical tests
- Bandit algorithms (epsilon-greedy, UCB, Thompson sampling)
- Active learning (uncertainty and diversity sampling)

#### **PR #9: Human-in-the-Loop** (Weeks 30-35)
- Review queue UI
- Annotation interface
- Assignment workflow
- Inter-rater reliability
- Conflict resolution

#### **PR #10: IDE Integration** (Weeks 36-39)
- VS Code extension
- Cursor skills for eval authoring
- AI-assisted dataset creation

## Usage

### Opting In to Extensions

Evaluation suites import extensions explicitly:

```typescript
// Example: agent-builder evaluation suite
import { evaluate } from '@kbn/evals';
import {
  createToxicityEvaluator,
  createPiiDetector,
  createBiasEvaluator,
  costTracker,
  watchMode
} from '@kbn/evals-extensions';

evaluate('security test', async ({ executorClient }) => {
  // Mix core and extension evaluators
  await executorClient.runExperiment(
    { dataset, task },
    [
      ...createCorrectnessEvaluators(),     // core kbn/evals
      createToxicityEvaluator(),            // extension
      createPiiDetector(),                  // extension
    ]
  );

  // Use extension features
  await costTracker.logRunCost(executorClient.getRunId());
});
```

### Feature Flags

Extensions use environment variables for opt-in behavior:

```bash
# Enable watch mode
KBN_EVALS_EXT_WATCH_MODE=true node scripts/evals run --suite <id>

# Enable parallel execution
KBN_EVALS_EXT_PARALLEL=true node scripts/evals run --suite <id>

# Enable result caching
KBN_EVALS_EXT_CACHE=true node scripts/evals run --suite <id>
```

## Why a Separate Package?

1. **Clear boundaries** - Extensions don't pollute core framework
2. **Independent evolution** - Iterate without affecting core
3. **Optional adoption** - Suites choose which features to use
4. **Parallel development** - Teams work without conflicts
5. **Easier testing** - Integration tests isolated
6. **Future migration** - Can promote mature features to core later

## Vision Alignment

All features follow principles from "Future of @kbn/evals":
- **Trace-first**: Leverage OTel traces when applicable
- **Elastic-native**: No external dependencies
- **Shared layer**: Provide composable primitives
- **Code-defined**: Datasets versioned in code

## Development

### Running Tests

```bash
yarn test:jest --testPathPattern=kbn-evals-extensions
```

### Type Checking

```bash
yarn test:type_check --project x-pack/platform/packages/shared/kbn-evals-extensions/tsconfig.json
```

### Linting

```bash
node scripts/eslint --fix x-pack/platform/packages/shared/kbn-evals-extensions
```

## Contributing

See individual feature directories for contribution guidelines. All PRs should:
- Follow Kibana code standards
- Include unit tests
- Update this README with new exports
- Maintain independence from `@kbn/evals` core
