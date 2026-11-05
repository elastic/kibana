#### Summary

| Model | Correct | yes/no | pick one | score | Consistent across runs | Median latency | p95 latency | Budget | Over budget |
|---|---|---|---|---|---|---|---|---|---|
| Jev 1.13 | 51/54 (94%) | 100% | 100% | 83% | 100% | 196 ms | 270 ms | 1s | 0/54 |
| Gemini 3.5 Flash Lite | 51/54 (94%) | 100% | 100% | 83% | 100% | 918 ms | 1168 ms | 2s | 0/54 |

```mermaid
xychart-beta
  title "Accuracy by question type (%)"
  x-axis ["Jev yes/no", "Jev pick one", "Jev score", "Gemini yes/no", "Gemini pick one", "Gemini score"]
  y-axis "Correct (%)" 0 --> 100
  bar [100, 100, 83, 100, 100, 83]
```

```mermaid
xychart-beta
  title "Median latency by question type (ms)"
  x-axis ["Jev yes/no", "Jev pick one", "Jev score", "Gemini yes/no", "Gemini pick one", "Gemini score"]
  y-axis "Median latency (ms)" 0 --> 2000
  bar [206, 196, 184, 852, 871, 978]
  line [1000, 1000, 1000, 2000, 2000, 2000]
```

The line is each provider's budget: 1s for Jev, 2s for the fast model.

```mermaid
xychart-beta
  title "Median latency per case (ms): Jev bars, Gemini line"
  x-axis ["P1", "P2", "P3", "P4", "P5", "P6", "C1", "C2", "C3", "C4", "C5", "C6", "S1", "S2", "S3", "S4", "S5", "S6"]
  y-axis "Median latency (ms)" 0 --> 1250
  bar [183, 210, 220, 203, 206, 190, 179, 196, 188, 192, 213, 205, 189, 202, 196, 174, 181, 177]
  line [980, 843, 726, 838, 992, 962, 928, 976, 918, 871, 605, 643, 1043, 749, 953, 983, 984, 844]
```

#### Confidence when right vs wrong (pick one and score)

| Model | Mean confidence when right | Mean confidence when wrong | Wrong calls |
|---|---|---|---|
| Jev 1.13 | 0.90 | 0.20 | 3 |
| Gemini 3.5 Flash Lite | 0.93 | 0.70 | 3 |

#### yes/no

| Case | Expected | Jev runs | Jev median | Gemini runs | Gemini median |
|---|---|---|---|---|---|
| **P1** Direct question to the agent | yes | ✅ yes 0.98<br>✅ yes 0.98<br>✅ yes 0.98 | 183 ms | ✅ yes 1.00<br>✅ yes 1.00<br>✅ yes 1.00 | 980 ms |
| **P2** "@agent do not reply to this" | no | ✅ no 0.15<br>✅ no 0.14<br>✅ no 0.14 | 210 ms | ✅ no 0.00<br>✅ no 0.00<br>✅ no 0.00 | 843 ms |
| **P3** Message for a person | no | ✅ no 0.06<br>✅ no 0.07<br>✅ no 0.07 | 220 ms | ✅ no 0.00<br>✅ no 0.00<br>✅ no 0.00 | 726 ms |
| **P4** Follow-up for the agent, no mention | yes | ✅ yes 0.93<br>✅ yes 0.92<br>✅ yes 0.92 | 203 ms | ✅ yes 1.00<br>✅ yes 1.00<br>✅ yes 1.00 | 838 ms |
| **P5** "thanks!" after the agent answered | no | ✅ no 0.08<br>✅ no 0.09<br>✅ no 0.09 | 206 ms | ✅ no 0.05<br>✅ no 0.02<br>✅ no 0.02 | 992 ms |
| **P6** Mentions the agent, but for later | no | ✅ no 0.11<br>✅ no 0.10<br>✅ no 0.09 | 190 ms | ✅ no 0.00<br>✅ no 0.00<br>✅ no 0.00 | 962 ms |

#### pick one

| Case | Expected | Jev runs | Jev median | Gemini runs | Gemini median |
|---|---|---|---|---|---|
| **C1** Latency spike | observability | ✅ observability 1.00<br>✅ observability 1.00<br>✅ observability 1.00 | 179 ms | ✅ observability 0.95<br>✅ observability 0.95<br>✅ observability 0.95 | 928 ms |
| **C2** Detection alerts | security | ✅ security 1.00<br>✅ security 1.00<br>✅ security 1.00 | 196 ms | ✅ security 0.90<br>✅ security 0.95<br>✅ security 0.95 | 976 ms |
| **C3** Find documents | search | ✅ search 1.00<br>✅ search 1.00<br>✅ search 1.00 | 188 ms | ✅ search 1.00<br>✅ search 1.00<br>✅ search 1.00 | 918 ms |
| **C4** Small talk | none | ✅ none 1.00<br>✅ none 1.00<br>✅ none 1.00 | 192 ms | ✅ none 0.95<br>✅ none 1.00<br>✅ none 1.00 | 871 ms |
| **C5** Failed logins (security or o11y?) | security | ✅ security 0.88<br>✅ security 0.87<br>✅ security 0.84 | 213 ms | ✅ security 0.90<br>✅ security 0.90<br>✅ security 0.90 | 605 ms |
| **C6** Slowest traces | observability | ✅ observability 1.00<br>✅ observability 1.00<br>✅ observability 1.00 | 205 ms | ✅ observability 1.00<br>✅ observability 1.00<br>✅ observability 1.00 | 643 ms |

#### score

| Case | Expected | Jev runs | Jev median | Gemini runs | Gemini median |
|---|---|---|---|---|---|
| **S1** Time in UTC | low | ✅ low 0.96<br>✅ low 0.97<br>✅ low 0.96 | 189 ms | ✅ low 0.95<br>✅ low 0.95<br>✅ low 0.90 | 1043 ms |
| **S2** Count errors | low | ✅ low 0.24<br>✅ low 0.20<br>✅ low 0.19 | 202 ms | ✅ low 0.85<br>✅ low 0.70<br>✅ low 0.85 | 749 ms |
| **S3** Compare two services | medium | ✅ medium 0.80<br>✅ medium 0.82<br>✅ medium 0.82 | 196 ms | ✅ medium 0.90<br>✅ medium 0.90<br>✅ medium 0.90 | 953 ms |
| **S4** Root-cause investigation | high | ✅ high 1.00<br>✅ high 1.00<br>✅ high 1.00 | 174 ms | ✅ high 0.95<br>✅ high 0.90<br>✅ high 0.90 | 983 ms |
| **S5** Summarize today's alerts | medium | ❌ low 0.19<br>❌ low 0.17<br>❌ low 0.24 | 181 ms | ❌ low 0.70<br>❌ low 0.70<br>❌ low 0.70 | 984 ms |
| **S6** "Thanks!" | low | ✅ low 1.00<br>✅ low 1.00<br>✅ low 1.00 | 177 ms | ✅ low 0.98<br>✅ low 0.85<br>✅ low 0.95 | 844 ms |
