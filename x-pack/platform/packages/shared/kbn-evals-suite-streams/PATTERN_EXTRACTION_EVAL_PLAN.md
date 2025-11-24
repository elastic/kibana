# Grok/Dissect Pattern Extraction Evaluation Plan

## 📋 Overview

**Goal:** Convert command-line evaluation scripts into structured evaluation scenarios and add quality metrics beyond parse rate.

**Status:** Planning Phase  
**Target Completion:** 3 weeks  
**Branch:** `flash1293/pattern-generation-evals`

---

## 🎯 Objectives

1. **Convert CLI scripts → Evaluation scenarios** in `/evals` directory
2. **Add comprehensive quality metrics:**
   - ✅ Parse rate (existing - % of docs successfully parsed)
   - 🆕 Timestamp accuracy (correct field mapping & format detection)
   - 🆕 Log level accuracy (proper severity field detection)
   - 🆕 Field quality score (appropriate field names/values matching ECS/OTEL)
   - 🆕 Field count penalty (penalize over-extraction of unnecessary fields)
3. **Build 20+ ground truth examples** from real integration packages + LogHub datasets

---

## 📊 Data Sources

### Primary Sources (Use These)

#### 1. **LogHub Datasets** ✅ 
**Location:** `x-pack/platform/packages/shared/kbn-sample-parser/parsers/`

**Available systems:**
- Apache (web server)
- Android (mobile logs)
- BGL (Blue Gene/L supercomputer)
- HDFS (Hadoop Distributed File System)
- Hadoop
- HPC (High Performance Computing)
- HealthApp
- Linux (system logs)
- Mac (system logs)
- OpenSSH (SSH daemon)
- OpenStack (cloud platform)
- Proxifier (proxy client)
- Spark (data processing)
- Thunderbird (Mozilla email)
- Windows (system logs)
- Zookeeper (coordination service)

**Advantages:**
- Already have parsers with timestamp extraction logic
- Proven to work with synthtrace for data generation
- Good variety of log formats (structured, semi-structured, unstructured)
- Suitable for both Grok AND Dissect pattern extraction

#### 2. **Elastic Integrations** ✅
**Location:** `tmp_integrations/packages/`

**Priority integrations for ground truth:**

**Web Servers:**
- `apache/` - Access logs, error logs
- `nginx/` - Access logs, error logs, stub status
- `iis/` - IIS web server logs

**Databases:**
- `mongodb/` - Database logs
- `mysql/` - Database logs, slow query logs
- `postgresql/` - Database logs (multiple formats: CSV, syslog-style)
- `redis/` - Database logs

**Message Queues:**
- `kafka/` - Kafka server logs
- `rabbitmq/` - Message broker logs

**Big Data (overlap with LogHub):**
- `hadoop/` - Already in LogHub
- `zookeeper/` - Already in LogHub

**Container/Orchestration:**
- `docker/` - Container logs
- `kubernetes/` - K8s logs

**Operating Systems:**
- `system/` - Generic system logs
- `linux/` - Linux-specific logs
- `windows/` - Windows event logs

**Security/Network:**
- `cisco_asa/` - Firewall logs
- `pfsense/` - Firewall logs
- `snort/` - IDS logs
- `suricata/` - IDS/IPS logs

**Application Servers:**
- `tomcat/` - Application server logs
- `activemq/` - Message broker logs

**Cloud Providers:**
- `aws/` - CloudTrail, VPC Flow
- `azure/` - Azure logs
- `gcp/` - Google Cloud logs

**Structure for each integration:**
```
tmp_integrations/packages/<integration>/
  └── data_stream/
      └── <stream_name>/
          ├── _dev/test/pipeline/
          │   └── test-*.log          # Sample log files
          ├── elasticsearch/ingest_pipeline/
          │   └── default.yml         # Expected grok/dissect patterns
          └── fields/
              └── fields.yml          # Expected field mappings (ground truth)
```

### Sources to EXCLUDE ❌

- **Serverless logs** - Not suitable for this evaluation (highly specific internal format)
- **Synthetic-only integrations** - No real log samples

---

## 🏗️ Implementation Plan

### Phase 1: Ground Truth Dataset Creation (Week 1)

#### Task 1.1: Select 20-25 Diverse Sources

**From LogHub (10 sources):**
1. Apache (web)
2. HDFS (big data)
3. Hadoop (big data)
4. Linux (system)
5. OpenSSH (security)
6. OpenStack (cloud)
7. Proxifier (network)
8. Spark (data processing)
9. Thunderbird (application)
10. Zookeeper (coordination)

**From Elastic Integrations (12-15 sources):**
1. Nginx (web)
2. PostgreSQL (database)
3. MongoDB (database)
4. MySQL (database)
5. Kafka (messaging)
6. Docker (containers)
7. Redis (database)
8. RabbitMQ (messaging)
9. Tomcat (app server)
10. Cisco ASA (security)
11. System (OS)
12. Suricata (IDS)
13. *(Optional)* Windows (OS)
14. *(Optional)* AWS CloudTrail (cloud)
15. *(Optional)* Snort (IDS)

#### Task 1.2: Extract Ground Truth Data

Create structured ground truth for each source:

```typescript
interface PatternExtractionGroundTruth {
  // Metadata
  source_id: string;                    // e.g., "apache-access"
  source_type: 'loghub' | 'integration'; 
  integration_package?: string;         // For integrations: "apache"
  loghub_system?: string;              // For LogHub: "Apache"
  
  // Sample data
  sample_messages: string[];           // 10-20 representative log lines
  
  // Expected extraction results
  expected_fields: {
    // Timestamp is critical - always check this
    timestamp: {
      field_name: string;              // e.g., "@timestamp"
      format?: string;                 // e.g., "dd/MMM/yyyy:HH:mm:ss Z"
      example_value: string;           // e.g., "26/Dec/2016:16:16:29 +0200"
      grok_pattern?: string;           // Expected pattern like "HTTPDATE"
    };
    
    // Log level (if present)
    log_level?: {
      field_name: string;              // e.g., "log.level"
      example_values: string[];        // e.g., ["error", "info", "warn"]
      grok_pattern?: string;           // e.g., "LOGLEVEL"
    };
    
    // All other expected fields
    other_fields: Array<{
      name: string;                    // ECS/OTEL field name
      type: 'keyword' | 'number' | 'ip' | 'text' | 'boolean';
      example_values: string[];        // Sample extracted values
      required: boolean;               // Must be extracted for full credit
      grok_pattern?: string;          // Expected pattern component
      description?: string;            // What this field represents
    }>;
  };
  
  // Expected pattern characteristics
  pattern_characteristics?: {
    should_handle_multiline?: boolean;
    should_extract_quoted_strings?: boolean;
    should_handle_optional_fields?: boolean;
    delimiter?: string;                // For dissect patterns
    expected_min_fields: number;       // Minimum fields that should be extracted
    expected_max_fields: number;       // Maximum fields (penalty beyond this)
  };
  
  // Reference patterns (from integration or manual)
  reference_patterns?: {
    grok?: string[];                   // Official grok patterns
    dissect?: string;                  // Official dissect pattern
    source: string;                    // Where pattern came from
  };
}
```

#### Task 1.3: Organize Ground Truth Data

**File:** `evals/pattern_extraction_datasets.ts`

```typescript
export interface PatternExtractionEvaluationExample {
  input: {
    stream_name: string;
    connector_id: string;
    sample_messages: string[];
    field_to_parse: string;  // Usually "body.text" or "message"
  };
  output: PatternExtractionGroundTruth;
  metadata: {
    difficulty: 'easy' | 'medium' | 'hard';
    notes?: string;
  };
}

export interface PatternExtractionEvaluationDataset {
  name: string;
  description: string;
  examples: PatternExtractionEvaluationExample[];
}

export const GROK_PATTERN_DATASETS = {
  web_servers: {
    name: 'Web Server Logs - Grok Extraction',
    description: 'Apache, Nginx, IIS access and error logs',
    examples: [ /* ... */ ]
  },
  databases: {
    name: 'Database Logs - Grok Extraction',
    description: 'MongoDB, MySQL, PostgreSQL, Redis logs',
    examples: [ /* ... */ ]
  },
  big_data: {
    name: 'Big Data Systems - Grok Extraction',
    description: 'HDFS, Hadoop, Spark, Zookeeper logs',
    examples: [ /* ... */ ]
  },
  security: {
    name: 'Security Logs - Grok Extraction',
    description: 'Firewall, IDS/IPS logs',
    examples: [ /* ... */ ]
  },
  system_logs: {
    name: 'System Logs - Grok Extraction',
    description: 'Linux, Windows system logs',
    examples: [ /* ... */ ]
  }
};

export const DISSECT_PATTERN_DATASETS = {
  structured_logs: {
    name: 'Structured Logs - Dissect Extraction',
    description: 'Consistently formatted logs with clear delimiters',
    examples: [ /* ... */ ]
  },
  csv_logs: {
    name: 'CSV-style Logs - Dissect Extraction', 
    description: 'Comma or pipe-separated log formats',
    examples: [ /* ... */ ]
  }
};
```

---

### Phase 2: Quality Scoring Functions (Week 1-2)

#### Task 2.1: Implement Evaluation Metrics

**File:** `src/evaluators/pattern_quality_metrics.ts`

```typescript
/**
 * Evaluates timestamp extraction accuracy
 * 
 * Scoring:
 * - 1.0: Correct field name + correct format + successfully parsed
 * - 0.7: Correct field name + successfully parsed but suboptimal format
 * - 0.5: Extracted to wrong field but successfully parsed
 * - 0.0: Not extracted or parse failure
 */
export function evaluateTimestampExtraction(
  extractedFields: Record<string, any>,
  groundTruth: PatternExtractionGroundTruth,
  simulationResult: any
): {
  score: number;
  correct_field: boolean;
  correct_format: boolean;
  details: {
    extracted_field?: string;
    expected_field: string;
    extracted_pattern?: string;
    expected_pattern?: string;
  };
} {
  // Implementation
}

/**
 * Evaluates log level extraction accuracy
 * 
 * Scoring:
 * - 1.0: Correct field name + all values correctly categorized
 * - 0.8: Correct field name + most values correct
 * - 0.5: Extracted but wrong field name
 * - 0.0: Not extracted
 */
export function evaluateLogLevelExtraction(
  extractedFields: Record<string, any>,
  groundTruth: PatternExtractionGroundTruth,
  simulationResult: any
): {
  score: number;
  correct_field: boolean;
  correct_values: boolean;
  details: {
    extracted_field?: string;
    expected_field: string;
    value_match_rate: number;
  };
} {
  // Implementation
}

/**
 * Evaluates overall field quality
 * 
 * Considers:
 * - Required fields present (30% weight)
 * - Field name accuracy/similarity to ECS (30% weight)
 * - Value type correctness (20% weight)
 * - Field count penalty (20% weight)
 */
export function calculateFieldQualityScore(
  extractedFields: Record<string, any>[],
  groundTruth: PatternExtractionGroundTruth,
  simulationResult: any
): {
  score: number;
  metrics: {
    required_fields_extracted: number;    // % of required fields found
    field_name_similarity: number;        // Avg similarity to expected names
    value_type_correctness: number;       // % of correct types
    field_count_penalty: number;          // Penalty for over-extraction
  };
  details: {
    missing_required_fields: string[];
    unexpected_fields: string[];
    field_mapping: Array<{
      extracted: string;
      expected?: string;
      similarity: number;
    }>;
  };
} {
  // Implementation using:
  // - String similarity (Levenshtein distance) for field names
  // - Type validation (IP regex, number parsing, etc.)
  // - Count penalty: score *= max(0.5, 1 - (actual_count - expected_max) / expected_max)
}

/**
 * Composite overall quality score
 * 
 * Weights:
 * - Parse rate: 30%
 * - Timestamp: 25%
 * - Log level: 15%
 * - Field quality: 30%
 */
export function calculateOverallPatternQuality(
  parseRate: number,
  timestampResult: ReturnType<typeof evaluateTimestampExtraction>,
  logLevelResult: ReturnType<typeof evaluateLogLevelExtraction>,
  fieldQualityResult: ReturnType<typeof calculateFieldQualityScore>
): {
  overall_score: number;
  breakdown: {
    parse_rate_score: number;
    timestamp_score: number;
    log_level_score: number;
    field_quality_score: number;
  };
  grade: 'excellent' | 'good' | 'fair' | 'poor';
} {
  const overall = 
    parseRate * 0.30 +
    timestampResult.score * 0.25 +
    logLevelResult.score * 0.15 +
    fieldQualityResult.score * 0.30;
    
  return {
    overall_score: overall,
    breakdown: {
      parse_rate_score: parseRate,
      timestamp_score: timestampResult.score,
      log_level_score: logLevelResult.score,
      field_quality_score: fieldQualityResult.score,
    },
    grade: overall >= 0.9 ? 'excellent' :
           overall >= 0.7 ? 'good' :
           overall >= 0.5 ? 'fair' : 'poor'
  };
}
```

#### Task 2.2: Create Custom Evaluators

**File:** `src/evaluators/pattern_extraction_evaluators.ts`

```typescript
import type { Evaluator } from '@kbn/evals';
import type { BoundInferenceClient } from '@kbn/inference-common';

export function createParseRateEvaluator(): Evaluator {
  return {
    name: 'Parse Rate',
    kind: 'numeric',
    evaluate: async ({ output }) => {
      return {
        score: output.parse_rate,
        label: `${(output.parse_rate * 100).toFixed(1)}%`,
        explanation: `${output.parsed_count}/${output.total_count} documents parsed successfully`
      };
    }
  };
}

export function createTimestampEvaluator(): Evaluator {
  return {
    name: 'Timestamp Accuracy',
    kind: 'numeric',
    evaluate: async ({ output, expected }) => {
      const result = evaluateTimestampExtraction(
        output.extracted_fields,
        expected,
        output.simulation_result
      );
      return {
        score: result.score,
        label: result.correct_field && result.correct_format ? '✓ Correct' : '✗ Issues',
        explanation: JSON.stringify(result.details, null, 2)
      };
    }
  };
}

export function createLogLevelEvaluator(): Evaluator {
  return {
    name: 'Log Level Accuracy',
    kind: 'numeric',
    evaluate: async ({ output, expected }) => {
      const result = evaluateLogLevelExtraction(
        output.extracted_fields,
        expected,
        output.simulation_result
      );
      return {
        score: result.score,
        label: result.correct_field ? '✓ Correct Field' : '✗ Wrong Field',
        explanation: JSON.stringify(result.details, null, 2)
      };
    }
  };
}

export function createFieldQualityEvaluator(): Evaluator {
  return {
    name: 'Field Quality',
    kind: 'numeric',
    evaluate: async ({ output, expected }) => {
      const result = calculateFieldQualityScore(
        output.extracted_fields,
        expected,
        output.simulation_result
      );
      return {
        score: result.score,
        label: `${(result.score * 100).toFixed(0)}% Quality`,
        explanation: JSON.stringify({
          metrics: result.metrics,
          missing: result.details.missing_required_fields,
          unexpected: result.details.unexpected_fields.slice(0, 5)
        }, null, 2)
      };
    }
  };
}

export function createOverallQualityEvaluator(): Evaluator {
  return {
    name: 'Overall Pattern Quality',
    kind: 'numeric',
    evaluate: async ({ output, expected }) => {
      const timestampResult = evaluateTimestampExtraction(
        output.extracted_fields,
        expected,
        output.simulation_result
      );
      const logLevelResult = evaluateLogLevelExtraction(
        output.extracted_fields,
        expected,
        output.simulation_result
      );
      const fieldQualityResult = calculateFieldQualityScore(
        output.extracted_fields,
        expected,
        output.simulation_result
      );
      
      const overall = calculateOverallPatternQuality(
        output.parse_rate,
        timestampResult,
        logLevelResult,
        fieldQualityResult
      );
      
      return {
        score: overall.overall_score,
        label: `${overall.grade.toUpperCase()} (${(overall.overall_score * 100).toFixed(0)}%)`,
        explanation: JSON.stringify(overall.breakdown, null, 2)
      };
    }
  };
}

/**
 * Optional: LLM-based sanity check evaluator
 * Uses AI to qualitatively assess pattern sensibility
 */
export function createPatternSanityEvaluator(
  inferenceClient: BoundInferenceClient
): Evaluator {
  return {
    name: 'Pattern Sanity Check (LLM)',
    kind: 'qualitative',
    evaluate: async ({ input, output, expected }) => {
      // Construct prompt for LLM evaluation
      const prompt = `
Evaluate this log parsing pattern for quality and sensibility:

Original Sample Logs:
${input.sample_messages.slice(0, 3).join('\n')}

Generated Pattern:
${output.suggested_pattern}

Sample Extracted Fields (first document):
${JSON.stringify(output.extracted_fields[0], null, 2)}

Expected Fields:
${JSON.stringify(expected.expected_fields, null, 2)}

Rate on scale 0-1 considering:
1. Are field names appropriate and follow ECS/OTEL conventions?
2. Is the timestamp correctly extracted and formatted?
3. Are there obviously incorrect or redundant field extractions?
4. Does the pattern make logical sense for this log format?

Provide score and brief reasoning.
      `;
      
      const response = await inferenceClient.prompt({
        prompt,
        // ... configuration
      });
      
      return {
        score: response.score,
        label: response.label,
        explanation: response.reasoning
      };
    }
  };
}
```

---

### Phase 3: Evaluation Scenarios (Week 2)

#### Task 3.1: Create Grok Evaluation Scenario

**File:** `evals/grok_pattern_extraction.spec.ts`

```typescript
import { evaluate } from '../src/evaluate';
import { 
  GROK_PATTERN_DATASETS,
  type PatternExtractionEvaluationExample 
} from './pattern_extraction_datasets';
import {
  createParseRateEvaluator,
  createTimestampEvaluator,
  createLogLevelEvaluator,
  createFieldQualityEvaluator,
  createOverallQualityEvaluator,
} from '../src/evaluators/pattern_extraction_evaluators';
import {
  getGrokSuggestion,
  simulateProcessing,
} from '../src/helpers/pattern_evaluation_helpers';

evaluate.describe.configure({ timeout: 600_000 });

evaluate.describe('Grok Pattern Extraction Quality', { tag: '@svlOblt' }, () => {
  
  Object.entries(GROK_PATTERN_DATASETS).forEach(([category, dataset]) => {
    evaluate.describe(dataset.name, () => {
      
      dataset.examples.forEach((example) => {
        evaluate(
          `${example.output.source_id} - ${example.metadata.difficulty}`,
          async ({ 
            phoenixClient, 
            apiServices,
            inferenceClient,
            evaluators,
            logger,
            connector
          }) => {
            
            await phoenixClient.runExperiment({
              dataset: {
                name: dataset.name,
                description: dataset.description,
                examples: [example]
              },
              concurrency: 1,
              task: async ({ input, expected, metadata }) => {
                logger.info(`Testing grok extraction for: ${expected.source_id}`);
                
                // 1. Get AI-powered grok suggestion
                const grokSuggestion = await getGrokSuggestion(
                  input.stream_name,
                  connector.id,
                  input.sample_messages,
                  input.field_to_parse
                );
                
                // 2. Simulate processing with suggested pattern
                const simulationResult = await simulateProcessing(
                  input.stream_name,
                  input.sample_messages,
                  {
                    action: 'grok',
                    from: input.field_to_parse,
                    patterns: grokSuggestion.patterns,
                    pattern_definitions: grokSuggestion.pattern_definitions
                  }
                );
                
                // 3. Return results for evaluation
                return {
                  source_id: expected.source_id,
                  suggested_pattern: grokSuggestion.patterns[0],
                  pattern_definitions: grokSuggestion.pattern_definitions,
                  parse_rate: simulationResult.parse_rate,
                  parsed_count: simulationResult.parsed_count,
                  total_count: simulationResult.total_count,
                  extracted_fields: simulationResult.documents.map(d => d.value),
                  simulation_result: simulationResult,
                  metadata: {
                    heuristic_pattern: grokSuggestion.heuristic_pattern,
                    ai_modifications: grokSuggestion.ai_modifications
                  }
                };
              },
              evaluators: [
                createParseRateEvaluator(),
                createTimestampEvaluator(),
                createLogLevelEvaluator(),
                createFieldQualityEvaluator(),
                createOverallQualityEvaluator(),
                
                // LLM-based criteria evaluation
                evaluators.criteria([
                  'The timestamp field is correctly extracted and named according to ECS conventions',
                  'The log level field (if present) is correctly identified',
                  'Field names follow ECS or OTEL naming conventions',
                  'No excessive or redundant fields are extracted',
                  'The pattern successfully parses at least 90% of sample messages'
                ])
              ]
            });
          }
        );
      });
    });
  });
});
```

#### Task 3.2: Create Dissect Evaluation Scenario

**File:** `evals/dissect_pattern_extraction.spec.ts`

Similar structure to grok evaluation, but:
- Use `DISSECT_PATTERN_DATASETS`
- Call `getDissectSuggestion()` instead
- Focus on delimiter-based parsing metrics

```typescript
import { evaluate } from '../src/evaluate';
import { DISSECT_PATTERN_DATASETS } from './pattern_extraction_datasets';
import { getDissectSuggestion, simulateProcessing } from '../src/helpers/pattern_evaluation_helpers';
// ... similar structure to grok evaluation
```

---

### Phase 4: Helper Functions (Week 2-3)

#### Task 4.1: Pattern Suggestion Helpers

**File:** `src/helpers/pattern_evaluation_helpers.ts`

```typescript
import { 
  extractGrokPatternDangerouslySlow,
  getReviewFields,
  getGrokProcessor,
  type GrokProcessorResult
} from '@kbn/grok-heuristics';
import {
  extractDissectPattern,
  getReviewFields as getDissectReviewFields,
  getDissectProcessorWithReview
} from '@kbn/dissect-heuristics';
import type { StreamsClient } from '@kbn/streams-plugin/server/lib/streams/client';

export async function getGrokSuggestion(
  streamName: string,
  connectorId: string,
  messages: string[],
  fieldName: string
): Promise<GrokProcessorResult & { 
  heuristic_pattern: string;
  ai_modifications: any;
}> {
  // 1. Extract pattern using heuristics
  const nodes = extractGrokPatternDangerouslySlow(messages);
  const heuristicPattern = getGrokPattern(nodes);
  const reviewFields = getReviewFields(nodes, 10);
  
  // 2. Get AI suggestions via API
  const response = await fetch(
    `${KIBANA_URL}/internal/streams/${streamName}/processing/_suggestions/grok`,
    {
      method: 'POST',
      headers: getKibanaAuthHeaders(),
      body: JSON.stringify({
        connector_id: connectorId,
        sample_messages: messages.slice(0, 10),
        review_fields: reviewFields,
      }),
    }
  );
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  
  const aiResult = await parseSSEStream(response);
  
  // 3. Combine heuristics + AI
  const processor = getGrokProcessor(nodes, aiResult.grokProcessor);
  
  return {
    ...processor,
    heuristic_pattern: heuristicPattern,
    ai_modifications: aiResult.grokProcessor
  };
}

export async function getDissectSuggestion(
  streamName: string,
  connectorId: string,
  messages: string[],
  fieldName: string
): Promise<any> {
  // Similar to getGrokSuggestion but for dissect
  const dissectPattern = extractDissectPattern(messages);
  const reviewFields = getDissectReviewFields(dissectPattern, 10);
  
  // Call dissect suggestion API
  // ...
  
  return processor;
}

export async function simulateProcessing(
  streamName: string,
  messages: string[],
  processorConfig: any
): Promise<{
  parse_rate: number;
  parsed_count: number;
  total_count: number;
  documents: Array<{ status: string; value: any }>;
  detected_fields: any[];
}> {
  const response = await fetch(
    `${KIBANA_URL}/internal/streams/${streamName}/processing/_simulate`,
    {
      method: 'POST',
      headers: getKibanaAuthHeaders(),
      body: JSON.stringify({
        documents: messages.map(msg => ({ 'body.text': msg })),
        processing: {
          steps: [processorConfig]
        }
      }),
    }
  );
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  
  const result = await response.json();
  
  const parsedCount = result.documents.filter(
    (d: any) => d.status === 'parsed'
  ).length;
  
  return {
    parse_rate: parsedCount / result.documents.length,
    parsed_count: parsedCount,
    total_count: result.documents.length,
    documents: result.documents,
    detected_fields: result.detected_fields || []
  };
}
```

---

### Phase 5: Integration & Testing (Week 3)

#### Task 5.1: Update Package Configuration

**Update:** `package.json`
- Ensure dependencies on `@kbn/grok-heuristics`, `@kbn/dissect-heuristics`
- Add `string-similarity` for field name comparison

#### Task 5.2: Run Evaluations

```bash
# Start Scout server
node scripts/scout.js start-server --stateful

# Load LogHub sample data (if needed)
node scripts/synthtrace.js sample_logs \
  --live \
  --liveBucketSize=1000 \
  --scenarioOpts.systems="Apache,HDFS,Linux,Zookeeper"

# Run grok pattern evaluation
node scripts/playwright test \
  --config x-pack/platform/packages/shared/kbn-evals-suite-streams/playwright.config.ts \
  --grep "Grok Pattern Extraction Quality"

# Run dissect pattern evaluation
node scripts/playwright test \
  --config x-pack/platform/packages/shared/kbn-evals-suite-streams/playwright.config.ts \
  --grep "Dissect Pattern Extraction Quality"

# Run specific category
node scripts/playwright test \
  --config x-pack/platform/packages/shared/kbn-evals-suite-streams/playwright.config.ts \
  --grep "Web Server Logs"
```

#### Task 5.3: Verify Results

Expected output structure in Phoenix:
```
Dataset: Web Server Logs - Grok Extraction
├── apache-access (easy)
│   ├── Parse Rate: 95% ✓
│   ├── Timestamp Accuracy: 1.0 ✓
│   ├── Log Level Accuracy: N/A
│   ├── Field Quality: 0.85 ✓
│   └── Overall Quality: GOOD (88%)
├── nginx-access (medium)
│   ├── Parse Rate: 92% ✓
│   └── ...
```

---

## 📁 Final File Structure

```
x-pack/platform/packages/shared/kbn-evals-suite-streams/
├── PATTERN_EXTRACTION_EVAL_PLAN.md (this file)
├── evals/
│   ├── feature_identification.spec.ts (existing)
│   ├── significant_events.spec.ts (existing)
│   ├── grok_pattern_extraction.spec.ts (NEW)
│   ├── dissect_pattern_extraction.spec.ts (NEW)
│   └── pattern_extraction_datasets.ts (NEW - ground truth)
├── src/
│   ├── evaluators/
│   │   ├── pattern_quality_metrics.ts (NEW - scoring functions)
│   │   └── pattern_extraction_evaluators.ts (NEW - evaluator instances)
│   └── helpers/
│       └── pattern_evaluation_helpers.ts (NEW - API helpers)
└── scripts/
    ├── evaluate_heuristic_grok_patterns.ts (DELETE after migration)
    └── evaluate_heuristic_dissect_patterns.ts (DELETE after migration)
```

---

## ✅ Success Criteria

1. **20-25 ground truth examples** created from LogHub + Elastic integrations
2. **Comprehensive metrics** tracked:
   - Parse rate (existing)
   - Timestamp accuracy (new)
   - Log level accuracy (new)
   - Field quality score (new)
3. **Evaluation scenarios** running in CI/CD via Scout/Playwright
4. **Regression tracking** - scores logged to Phoenix for trending
5. **Actionable feedback** - detailed breakdowns guide improvements

---

## 📈 Scoring Weights

```
Overall Pattern Quality Score = 
  Parse Rate (30%) +
  Timestamp Accuracy (25%) +
  Log Level Accuracy (15%) +
  Field Quality (30%)

Grade Scale:
  90-100%: Excellent (production-ready)
  70-89%:  Good (minor improvements needed)
  50-69%:  Fair (significant improvements needed)
  0-49%:   Poor (major issues, not suitable)
```

---

## 🔄 Future Enhancements

1. **Automated ground truth sync** - Pull latest integration patterns automatically
2. **Pattern comparison** - Compare heuristic vs AI vs manual reference patterns
3. **Performance metrics** - Track latency and cost of AI suggestions
4. **Active learning** - Use low-scoring examples to improve prompts
5. **Multi-pattern support** - Handle logs with multiple format variations

---

## 📝 Notes

- LogHub datasets already have timestamp extraction logic in parsers - use this as reference
- Integration packages have `fields.yml` files with field definitions - these are ground truth
- Some integrations have multiple pipeline files - choose the most representative
- Focus on quality over quantity - 20 well-documented examples better than 50 poor ones
- Test both "happy path" and "edge cases" (multiline, optional fields, variations)
