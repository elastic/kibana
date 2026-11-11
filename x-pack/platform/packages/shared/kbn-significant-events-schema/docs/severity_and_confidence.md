# Severity and confidence of a significant event

This describes what Discovery's `severity` and `confidence` mean, what evidence each tier needs, and
which combinations are legitimate (nightshift-program #2250). The agent-facing text lives in
`SEVERITY_CONTRACT_RULE`, `DISCOVERY_SEVERITY_APPLICATION_RULE` and `CONFIDENCE_CONTRACT_RULE`
(`src/significant_events`); this document is for the operator reading the flyout.

## Severity: what each tier needs

Severity is impact: how badly the operation fails (degree) and how many attempts, requests or users
it reaches (reach), against the operation's own normal. An error line is evidence of a failure mode,
not of impact. When the evidence for a higher tier is missing, Discovery rates the lower tier and its
assessment note says which of outcome or reach is missing.

| Tier | Needs |
| --- | --- |
| `critical` | One of the contract's critical conditions, stated by the descriptions or shown by the blast radius: a global outage, several core operations blocked, a mandatory component blocked end-to-end, or confirmed exposure of sensitive data. No share is needed. |
| `high` | A stated failed outcome for the operation, the failure still happening, and one of: a reach (a numerator and denominator in operations, attempts, requests or users); a rate clearly above the operation's own normal for the same period, citing its prior-period figure; or a dependent's own operation stated failing because of a named dependency or component (a service logging that its own operation failed because a named dependency failed; "all dependencies failed" names none). |
| `medium` | An error, a log-line share, error volume across several services, partial results without a request-level share, or an unresolved completion, with limited or unevidenced reach. A share or count of log lines measures volume, not how many attempts or users are affected. |
| `low` | Confirmed recovery, or confirmed absence of impact. |

A rate that has stayed at about the same level for days is the operation's normal, not evidence of a
new impact. Trend (easing or worsening) is urgency and does not set the tier.

## The rows and the knowledge base

Discovery reads the log rows and the knowledge base (KI topology, `blast_radius` and
`causal_features`, and knowledge gaps) together. The rows outrank the knowledge base.

- Rows show a dependency failing and the knowledge base holds the edge: the strongest case.
- A dependent logs the failing call and the knowledge base has no edge or entity: the row is itself
  the evidence, and the name is recorded as a knowledge gap in the note as unverified.
- The knowledge base holds an edge that no failing row shows: context only.

An edge, an empty `blast_radius` or a knowledge gap never raises or lowers the tier, and never lowers
confidence, by itself. "None found in the knowledge base" means unknown, not none.

## Confidence: what it covers

Confidence is how credibly the evidence supports two things together, the symptom the event reports
and the tier rated, with the weaker of the two limiting it:

- symptom support: the signals show the failure is real, current, consistent and measured (timing and
  scope). The cause is stated only as far as the evidence supports it, and a cause that is not
  established is not a deduction;
- tier support: how well the evidence backs the tier actually rated. A missing requirement that
  already lowered the tier does not lower confidence a second time.

A recovery or an unchanged continuation keeps the stored confidence. A reopen is a new episode,
rated like a new event.

## Permitted combinations

| Severity | Confidence | Reading |
| --- | --- | --- |
| high or critical | high | The symptom and the tier are both well supported. |
| high or critical | low | A warning sign: the symptom evidence is weak, or the tier rests on thin evidence. Check the note. |
| medium | high | The evidence supports a limited or unquantified impact. |
| medium | low | The impact is limited or unevidenced and the symptom evidence is also thin. |
| low | any | Recovered or no impact. |

An unestablished cause is not a reason for low confidence: it is stated in the hypothesis and the
note. When the doubt is about the impact itself (reach, completion or strength), the event is rated at
the lower tier instead, so a high or critical event with low confidence should be rare.

## Existing events: no backfill, and a discontinuity

Stored events keep the severity and confidence they were written with; there is no backfill. A
continuation keeps its stored tier until an item with a new confirming signal re-rates it, so the
share of high and critical events falls gradually after the release, not at once. Counts, tiles and
period comparisons therefore have a discontinuity at the release that introduced the evidence
requirements: do not read a drop in high or critical events across that date as an improvement or a
regression on its own.

Before the change, on c0 about 72% of active episodes were high or critical, and no high event stated
a request-level share (grounding sees log lines). An earlier, looser version of the rule was
estimated to keep 44% of the `high` events (a crude estimate from regex over the signal descriptions
on 2026-11-11); the final rule, which needs a dependent's own operation stated failing, keeps fewer.
