# Pipeline Suggestion Evaluation Plan

## Overview

Create an evaluation suite for the pipeline suggestion logic (similar to the existing pattern extraction eval) that tests the full end-to-end pipeline generation including parsing, enrichment, and schema compliance.

## Key Differences from Pattern Extraction Eval

- **Scope**: Tests entire pipeline (parsing + normalization + cleanup), not just pattern extraction
- **LLM Reasoning**: Evaluates LLM's ability to choose appropriate processors for post-parsing normalization
- **Schema Compliance**: Validates ECS/OTel field naming standards
- **Efficiency**: Checks for unnecessary or redundant processors

## Supported Processors

The pipeline suggestion currently supports these processor types:
- **grok**: Pattern extraction (pre-generated, included as first step)
- **dissect**: Pattern extraction (pre-generated, included as first step)
- **date**: Timestamp parsing and normalization
- **rename**: Field renaming for schema compliance
- **convert**: Type conversion (string to number, boolean, IP, etc.)
- **remove**: Remove temporary/unwanted fields

**NOT supported** (yet): geoip, user_agent, set, replace, drop, append

## Files to Create

### 1. `evals/pipeline_suggestion.spec.ts`
Main evaluation spec that:
- Extracts patterns from sample documents (grok/dissect)
- Calls `suggest_processing_pipeline` route
- Simulates the suggested pipeline
- Calculates quality metrics
- Runs code-based and LLM-based evaluators

### 2. `evals/pipeline_suggestion_datasets.ts`
Ground truth data structure:
```typescript
{
  source_id: string;
  expected_processors: {
    parsing?: { 
      type: 'grok' | 'dissect',
      should_parse_field: string,
      expected_fields: string[]
    }
    normalization?: Array<{
      type: 'date' | 'rename' | 'convert' | 'remove',
      description: string,
      target_field?: string
    }>
  };
  quality_thresholds: {
    min_parse_rate: number,
    min_field_count: number,
    max_field_count: number,
    required_semantic_fields: string[]
  };
  schema_expectations: {
    should_follow_ecs: boolean,
    should_follow_otel: boolean,
    expected_schema_fields: string[]
  };
}
```

### 3. `evals/pipeline_suggestion_metrics.ts`
Calculate metrics:
- Parse rate and field count
- Processor counts by type (grok/dissect, date, rename, convert, remove) and failure rates
- ECS/OTel schema compliance (% of fields matching schema)
- Semantic field coverage (timestamp, log level, service name, etc.)
- Type correctness (fields have proper types, not all strings)
- Pipeline efficiency score (no unnecessary processors)

## Evaluation Workflow

1. **Index system logs** via synthtrace (e.g., `sample_logs` with `--scenarioOpts.systems="Apache"`)
2. **Create partitioned stream** for that system (e.g., fork `logs` → `logs.apache`)
3. **Fetch sample documents** from the stream (raw logs before processing)
4. **Extract patterns** from documents (client-side grok/dissect extraction)
5. **Call API** `/internal/streams/{name}/_suggest_processing_pipeline` with patterns + documents
6. **Parse SSE response** to get final pipeline
7. **Simulate pipeline** against sample documents
8. **Calculate metrics** (parse rate, schema compliance, type correctness, efficiency)
9. **Run evaluators** (code-based + LLM-based)
10. **Clean up** (delete stream and documents)

## Evaluators

### Code-Based Evaluator
Automated metrics:
- Parse rate ≥ 80%
- ECS/OTel compliance
- Semantic field coverage
- Processor failure rates < 20%

### LLM-Based Evaluator
Criteria:
1. **Parsing Quality**: Extract key fields from raw logs, follow schema standards
2. **Schema Compliance**: Proper ECS/OTel field naming (e.g., `source.ip`, `resource.attributes.*`)
3. **Normalization Quality**: 
   - **Date parsing**: Convert custom timestamps to `@timestamp`
   - **Type conversions**: String fields converted to proper types (number, boolean, IP)
   - **Field cleanup**: Remove temporary fields after conversion
4. **Efficiency**: Minimal steps, no redundant processors, no overwriting already-correct fields
5. **Error Handling**: Graceful handling of missing fields
## Success Criteria

A good pipeline suggestion should:
- ✅ Parse ≥80% of documents (via pre-generated grok/dissect processor)
- ✅ Extract semantic fields (timestamp, log.level, source.ip, etc.)
- ✅ Follow schema standards (ECS or OTel field naming)
- ✅ Normalize timestamps (convert custom timestamps to `@timestamp`)
- ✅ Convert field types (strings to numbers, booleans, IPs as needed)
- ✅ Clean up temporary fields (remove intermediate extraction fields)
- ✅ Have efficient structure (no redundant processors, no overwriting correct values)
- ✅ Handle errors gracefully (processor failure rates <20%)

## Dataset Structure

Use **LogHub systems** from synthtrace `sample_logs` scenario to generate real log data. Available systems include:
- Apache, BGL, Hadoop, HDFS, HealthApp, HPC
- Mac, OpenSSH, OpenStack, Proxifier
- Spark, Thunderbird, Zookeeper

### Data Preparation Requirements

**Critical**: Unlike feature identification (which tests mixed systems), pipeline suggestion evaluates **one system at a time**:

1. **Index logs per system**: Use synthtrace with `--scenarioOpts.systems="Apache"` to index one system
2. **Create partitioned stream**: Fork stream per system (e.g., `logs.apache`, `logs.zookeeper`)
3. **Query documents**: Fetch sample documents from the system-specific stream
4. **Run evaluation**: Test pipeline suggestion on that single system's logs

### Dataset Definition

Each dataset example should specify:
```typescript
{
  input: {
    stream_name: 'logs.apache',  // System-specific stream
    system: 'Apache',             // LogHub system to index
    sample_document_count: 100    // Documents to fetch for evaluation
  },
  output: {
    expected_processors: {
      parsing: { type: 'grok', expected_fields: ['source.ip', 'http.response.status_code', ...] },
      normalization: [
        { type: 'date', target_field: '@timestamp', description: 'Parse Apache timestamp' },
        { type: 'convert', target_field: 'http.response.status_code', description: 'Convert to long' },
        ...
      ]
    },
    quality_thresholds: { min_parse_rate: 0.9, ... },
    schema_expectations: { should_follow_ecs: true, ... }
  }
}
```

### Example Systems to Test

Start with diverse log formats:
- **Apache/Nginx**: Web server access logs (structured, space/dash delimited)
- **OpenSSH**: Authentication logs (syslog format)
- **Zookeeper**: Java application logs (timestamp + level + message)
- **HDFS/Hadoop**: Big data system logs (custom formats)
- **PostgreSQL** (if available): Database logs (structured queries)

Each system tests different parsing patterns and normalization requirements.

## Implementation Notes

- Reuse pattern extraction helpers (`@kbn/grok-heuristics`, `@kbn/dissect-heuristics`)
- Use existing simulation API for validation
- Integrate with Phoenix experiment tracking
- Follow same test structure as `pattern_extraction.spec.ts`
