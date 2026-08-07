# POC: Verify KIs at creation

This POC demonstrates the M2 "verify before persist" requirement for the KI Schema, Lifecycle & Verification workstream ([workstream](https://github.com/elastic/search-team/issues/15526), [verification framework](https://github.com/elastic/search-team/issues/15640), [verification automation](https://github.com/elastic/search-team/issues/15641)).

Candidate knowledge items (KIs) are verified by the `context-engine.verifyKi` workflow step before they are persisted to an AI index. KIs that fail verification are never written.

## What's included

- **Verification framework** (`server/ki_verification/`) — a `KiVerifierRegistry` to register verifiers, a `KiVerificationService` that applies them to a candidate KI, and the first verifier:
  - **ES|QL verifier** — extracts ES|QL from fenced ` ```esql ` blocks in the KI `content` and from the `esql` attribute, validates that each query parses (`validateQuery` from `@kbn/esql-language`, no round-trip), then confirms it executes (`<query> | LIMIT 0` must return 200, even with empty results).
- **`context-engine.verifyKi` workflow step** — runs the verifiers against a candidate KI and outputs `{ valid, results }`. Verification failures are step *output*, not step errors, so workflows can branch on `valid`.

No verification metadata is written to the KI record, and no retrieval-side changes are needed: with verify-before-persist, everything in the AI index passed verification by construction.

## Demo

1. Start ES and Kibana from this branch.
2. Enable the feature gates in Stack Management → Advanced Settings: `contextEngine:enabled` (and ensure Workflows is available).
3. Create the workflow below (Management → Workflows → Create), then run it manually.

The workflow seeds a small source index, then processes two candidate KIs: one whose ES|QL is valid, and one whose ES|QL does not parse. Only the valid one lands in `ai-index-idx-poc-verified-kis`.

```yaml
version: '1'
name: POC - Verify KIs at creation
description: |
  Verifies candidate knowledge items with context-engine.verifyKi before
  persisting them to an AI index backing index. Candidates that fail
  verification are rejected and logged, not persisted.
enabled: true
tags: ['poc', 'context-engine']
consts:
  sourceIndex: poc-national-parks
  aiIndexBackingIndex: ai-index-idx-poc-verified-kis
  candidateKis:
    - type: access_pattern
      title: Find canyon parks
      description: How to find parks in the canyon category
      tags: ['poc']
      content: |
        To list canyon parks, run:
        ```esql
        FROM poc-national-parks | WHERE category == "canyon" | LIMIT 10
        ```
    - type: access_pattern
      title: Broken access pattern
      description: This KI contains ES|QL that does not parse
      tags: ['poc']
      content: |
        This query is broken:
        ```esql
        FROM poc-national-parks | WHERE | LIMIT
        ```
triggers:
  - type: manual
steps:
  - name: create_source_data
    type: elasticsearch.bulk
    with:
      index: '{{ consts.sourceIndex }}'
      operations:
        - name: 'Grand Canyon National Park'
          category: 'canyon'
        - name: 'Zion National Park'
          category: 'canyon'
        - name: 'Yosemite National Park'
          category: 'mountain'
  - name: process_candidates
    type: foreach
    foreach: '${{ consts.candidateKis }}'
    steps:
      - name: verify_ki
        type: context-engine.verifyKi
        with:
          ki: '${{ foreach.item }}'
      - name: gate_ki
        type: if
        condition: 'steps.verify_ki.output.valid : true'
        steps:
          - name: persist_ki
            type: elasticsearch.index
            with:
              index: '{{ consts.aiIndexBackingIndex }}'
              document: '${{ foreach.item }}'
          - name: log_persisted
            type: console
            with:
              message: 'KI "{{ foreach.item.title }}" verified and persisted to {{ consts.aiIndexBackingIndex }}'
        else:
          - name: log_rejected
            type: console
            with:
              message: |-
                KI "{{ foreach.item.title }}" failed verification and was NOT persisted: {{ steps.verify_ki.output.results | json: 2 }}
```

4. Verify the outcome:

```
GET ai-index-idx-poc-verified-kis/_search
```

Only the "Find canyon parks" KI is present. The workflow execution log shows the rejected KI with the parse errors from the ES|QL verifier.

## Notes / follow-ups

- The step is opt-in per workflow, matching the M2 scope ("initially we want to verify before persisting, opt in").
- The verifier framework is the extension point: additional verifiers (groundedness, entailment, TTL) register through `KiVerifierRegistry` without changes to the step.
- The step definition approval file (`workflows_extensions` Scout gate) is intentionally not included in this POC branch; it is required before merging.
- On-demand re-verification, sweeps for externally added KIs, and stale handling are out of scope for this POC.
