# SDLC Metrics Reference

## Available metrics

| Metric | Source | Description |
|--------|--------|-------------|
| `total_prs` | sdlc-prs | Total PRs in window |
| `merged_prs` | sdlc-prs | PRs merged in window |
| `open_prs` | sdlc-prs | Currently open PRs |
| `avg_additions` | sdlc-prs | Average lines added per PR |
| `avg_deletions` | sdlc-prs | Average lines deleted per PR |
| `cycle_time` | computed | Time from PR open to merge |
| `review_latency` | computed | Time from PR open to first review |

## Indices

| Index | Purpose |
|-------|---------|
| `sdlc-prs` | Raw PR data from GitHub |
| `sdlc-coverage-summary` | Materialized coverage snapshots |
| `.etl-checkpoints` | Ingest cursor state |
