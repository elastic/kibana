# Context Engine memory + Wiki

AlertZero Rule Tuning uses **two stores on one AI index** (`alertzero-wiki`):

| Store | Job |
| --- | --- |
| Wiki (`agentKnowledge.recall` / `record`) | Standing, sectioned, corroborated knowledge after the proposal gate |
| CE memory (`memory.session_fact`) | Tentative facts during/after diagnose; query before diagnose |

## Rules of thumb

1. Recalled wiki is standing truth; recalled CE memories are hypotheses (“verify before trusting”).
2. After **approve**, promote durable facts into the wiki page and prefer wiki as source of truth.
3. After **reject**, archive tentative wiki claims that asserted the rejected change; forget conflicting session facts when a write path exists.
4. After **expire**, do not write wiki content; leave memories to natural expiry (default 90 days).
5. Do **not** block Rule Tuning correctness on dreaming → `fact.*` / `entity.*`.

## Managed index + `memory_enabled`

Managed AI indices default `memory_enabled: false` and the Kibana UI cannot enable memory on them. AlertZero sets `memory_enabled: true` in `registerAiIndex` so 1P can write session memories on the wiki index. If that is not supported in a deployment, use a companion user-writable memory-enabled index and point the ES|QL recall step at it.

## Nightshift

Nightshift keeps semantic memory in `nightshift_investigations/server/memory/**` for v1. A later RFC may migrate it onto CE memory + dreaming. Nightshift wiki already uses this shared kernel.
