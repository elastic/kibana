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
              # document must be a YAML object with templates only at the leaves:
              # the step's `with` schema is a union, and the workflow validator
              # cannot suppress a whole-object template (`${{ }}`) inside a union.
              document:
                type: '{{ foreach.item.type }}'
                title: '{{ foreach.item.title }}'
                description: '{{ foreach.item.description }}'
                content: '{{ foreach.item.content }}'
                tags: '${{ foreach.item.tags }}'
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

## Part 2: Re-verify existing KIs and hard-delete failures (human in the loop)

The same `context-engine.verifyKi` step composes into a standalone sweep workflow that re-verifies KIs already in the AI index and hard-deletes the ones that no longer pass — with a `waitForApproval` gate before every delete. This covers the on-demand re-trigger and externally-added-KI sweep cases from the verification automation epic, and the hard-delete recommendation (with human in the loop) from the exclusion epic.

A KI that was valid at creation can fail later for external reasons. To demo that, first break one: delete the source index the "Find canyon parks" KI queries (or index a KI with bad ES|QL directly, simulating an out-of-workflow write):

```
POST ai-index-idx-poc-verified-kis/_doc?refresh=true
{
  "type": "access_pattern",
  "title": "Externally added, broken",
  "content": "```esql\nFROM poc-national-parks | WHERE | LIMIT\n```",
  "tags": ["poc"]
}
```

Then create and run:

```yaml
version: '1'
name: POC - Re-verify existing KIs
description: |
  Sweeps an AI index backing index, re-verifies each KI with
  context-engine.verifyKi, and hard-deletes failures after human approval.
enabled: true
tags: ['poc', 'context-engine']
consts:
  aiIndexBackingIndex: ai-index-idx-poc-verified-kis
triggers:
  - type: manual # use a scheduled trigger for a recurring sweep
steps:
  - name: fetch_kis
    type: elasticsearch.search
    with:
      index: '{{ consts.aiIndexBackingIndex }}'
      size: 100
      query:
        match_all: {}
  - name: reverify_kis
    type: foreach
    foreach: '${{ steps.fetch_kis.output.hits.hits }}'
    steps:
      - name: verify_ki
        type: context-engine.verifyKi
        with:
          ki: '${{ foreach.item._source }}'
      - name: gate_ki
        type: if
        condition: 'steps.verify_ki.output.valid : false'
        steps:
          - name: request_delete_approval
            type: waitForApproval
            timeout: 24h
            with:
              message: |-
                KI "{{ foreach.item._source.title }}" ({{ foreach.item._id }}) failed re-verification: {{ steps.verify_ki.output.results | json: 2 }}. Approve hard delete?
              approveLabel: Delete KI
              rejectLabel: Keep KI
          - name: gate_delete
            type: if
            condition: 'steps.request_delete_approval.output.response.approved : true'
            steps:
              - name: delete_ki
                type: elasticsearch.bulk
                with:
                  index: '{{ consts.aiIndexBackingIndex }}'
                  operations:
                    - delete:
                        _id: '{{ foreach.item._id }}'
              - name: log_deleted
                type: console
                with:
                  message: 'KI "{{ foreach.item._source.title }}" hard-deleted (approved by {{ steps.request_delete_approval.output.respondedBy }})'
            else:
              - name: log_kept
                type: console
                with:
                  message: 'KI "{{ foreach.item._source.title }}" failed re-verification but deletion was rejected'
```

The run pauses at `request_delete_approval` for each failing KI; approve or reject from the workflow execution view. After approving, the broken KI is gone from the index and the valid one is untouched.

Caveats for anything past a POC:

- The ES|QL verifier fails a KI on *execution* errors too, which can be transient (source index temporarily missing, permissions). Parse errors are strong delete signals; execution errors are weaker. Before automating deletes without HITL, the verifier result should distinguish the two so the delete gate can be stricter.
- `elasticsearch.search` is capped at `size` here; a real sweep needs pagination.
- `waitForApproval` is tech preview.

## Notes / follow-ups

- The step is opt-in per workflow, matching the M2 scope ("initially we want to verify before persisting, opt in").
- The verifier framework is the extension point: additional verifiers (groundedness, entailment, TTL) register through `KiVerifierRegistry` without changes to the step.
- The step definition approval file (`workflows_extensions` Scout gate) is intentionally not included in this POC branch; it is required before merging.
- Stale handling (criteria and TTLs) is out of scope for this POC; the Part 2 sweep is the mechanism it would plug into.
