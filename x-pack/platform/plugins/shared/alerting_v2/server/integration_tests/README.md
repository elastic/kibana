# Non-HTTP Integration Tests for Alerting V2

## Context

From [PR #282447](https://github.com/elastic/kibana/pull/282447#issuecomment-5199601012) (Jason Rhodes):

> The plumbing is all in place but there aren't a lot of examples of doing it.

Components like `EpisodesClient` and `PrivilegeChecker` are not exposed via HTTP routes, so they can't be tested with supertest. Instead, we can run ES and Kibana inside a Jest integration test and invoke plugin internals directly.

## References

- **Existing example** — Security Solution's `receiver.test.ts` runs ES + Kibana in a Jest test without supertest or browser interactions:
  https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/plugins/security_solution/server/integration_tests/receiver.test.ts

- **Cross-plugin sketch** — Jason's gist showing how the spy system could work across plugin boundaries:
  https://gist.github.com/jasonrhodes/8ad58e5e80dca2658ad119da6e031cbd

## Next Steps

- Build shared utils so this pattern is easy to adopt across Alerting V2.
- Candidate components for non-HTTP integration tests:
  - `EpisodesClient` — space isolation, single-episode reads
  - `PrivilegeChecker` — privilege checks at the correct space scope
  - `RulesClient` / `ActionPolicyClient` — CRUD with real saved objects
