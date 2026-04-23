# Evaluation Report: Fix False Positive Alerts Skill

**Date:** 2026-04-16
**Judge Model:** Claude 4.6 Opus (via EIS)
**Skill:** `fix_false_positive_alerts`
**Dataset:** `security-fp-full-workflow` (seeded detection rule with 15 source docs generating >10 alerts)

## Results Summary

| Metric                     | Claude 4.5 Sonnet | Claude 3.7 Sonnet | Claude 4.5 Haiku | Claude 4.6 Sonnet | Claude 4.6 Opus | Gemini 2.5 Flash | GPT-5.4 |
|----------------------------|------------------:|------------------:|-----------------:|------------------:|----------------:|-----------------:|--------:|
| **Factuality**             |              0.68 |              0.59 |             0.35 |              0.66 |            0.60 |             0.37 |    0.62 |
| **Groundedness**           |              0.99 |              0.99 |             0.98 |              0.99 |            0.99 |             1.00 |    1.00 |
| **Relevance**              |              0.50 |              0.67 |             0.58 |              0.44 |            0.50 |             1.00 |    0.33 |
| **Sequence Accuracy**      |              1.00 |              1.00 |             1.00 |              1.00 |            1.00 |             0.71 |    1.00 |
| **ToolUsageOnly**          |              1.00 |              1.00 |             1.00 |              1.00 |            1.00 |             1.00 |    1.00 |
| **DocVersionReleaseDate**  |              1.00 |              1.00 |             1.00 |              1.00 |            1.00 |             1.00 |    1.00 |
| **Tool Calls**             |                 5 |                 6 |                9 |                 6 |               6 |                6 |       6 |
| **Latency (s)**            |             76.7s |             51.1s |            61.5s |            162.3s |           61.1s |            26.7s |  34.4s |
| **Input Tokens**           |           139,512 |           137,060 |          215,322 |           229,932 |         106,132 |          101,031 |  95,822 |
| **Output Tokens**          |             3,081 |             1,854 |            4,947 |             2,529 |           2,379 |            1,050 |   1,085 |
| **Cached Tokens**          |                 0 |                 0 |                0 |                 0 |               0 |                0 |   1,280 |

## Key Findings

### Quality Scores (higher is better)

1. **Claude 4.5 Sonnet** achieves the highest Factuality (0.68) — most accurate in describing the false positive analysis.
2. **Gemini 2.5 Flash** scores highest on Relevance (1.00) and Groundedness (1.00) but lower on Factuality (0.37) and Sequence Accuracy (0.71).
3. **Claude 3.7 Sonnet** offers a balanced profile with strong Factuality (0.59) and the best Relevance (0.67) among Claude models.
4. **All models** correctly invoke the expected skill (ExpectedSkillInvocation = 1.0) and use tools exclusively (ToolUsageOnly = 1.0).
5. **Sequence Accuracy** is perfect (1.0) for all Claude models and GPT-5.4; Gemini deviates from the expected tool call order (0.71).
6. **Claude 4.6 Opus** scores solid Factuality (0.60) and Relevance (0.50), with perfect Sequence Accuracy and ToolUsageOnly. Comparable to Claude 4.5 Sonnet in quality profile.

### Efficiency (lower is better)

1. **Gemini 2.5 Flash** is fast (26.7s) with moderate token usage (101K input).
2. **GPT-5.4** is the second fastest (34.4s) with the fewest input tokens (96K) and fewest output tokens (1,085). Only model using cached tokens.
3. **Claude 3.7 Sonnet** is the most efficient Claude model: 51.1s latency, 137K input tokens.
4. **Claude 4.6 Opus** is mid-range: 61.1s latency, 106K input tokens, 2,379 output tokens.
5. **Claude 4.6 Sonnet** is the slowest (162.3s) and most token-hungry (230K input tokens).
6. **Claude 4.5 Haiku** uses the most output tokens (4,947) and makes the most tool calls (9).

### GPT-5.4

6. **GPT-5.4** is the fastest model (34.4s) and most token-efficient (96K input tokens), with perfect Groundedness (1.0), Sequence Accuracy (1.0), and ToolUsageOnly (1.0). Factuality (0.62) is competitive. Relevance (0.33) is the lowest across all models. It is the only model using cached tokens (1,280), indicating prompt caching is active.


## Recommendation

For the `fix-false-positive-alerts` skill:

- **Best overall quality:** Claude 4.5 Sonnet (highest factuality, perfect sequence accuracy)
- **Best cost/speed trade-off:** GPT-5.4 (34.4s, fewest tokens, strong factuality 0.62, perfect sequence/tool accuracy)
- **Best balance:** Claude 3.7 Sonnet (good quality scores with moderate cost)
- **Fastest:** Gemini 2.5 Flash (26.7s, but lower factuality and sequence accuracy)
