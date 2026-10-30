# WS3 status: Kibana plugin (`taskRunnerPoc`)

Branch `task-runner-poc-plugin` in the Kibana worktree `/Users/cbanta/Developer/kibana/task-runner-poc-plugin`, off `upstream/main`. Local commits only.

**Paused on October 30** while the contract is renamed (run → task, schedule → job with an optional `every`, canvas → flow, new `/jobs` and `/tasks` paths). Only the parts that don't depend on the API shape are built. Route handlers and the page wait for the updated contract.

## Done

- Worktree created with `kw -f task-runner-poc-plugin` and bootstrapped. Upstream `main` now uses **pnpm**, not yarn.
- Plugin skeleton at `x-pack/platform/plugins/private/task_runner_poc`: `kibana.jsonc` (plugin ID `taskRunnerPoc`, private, platform group, requires `share`), `package.json`, `tsconfig.json`, generated `moon.yml`. Linked by re-running bootstrap (root `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `tsconfig.base.json`).
- Config schema (`server/config.ts`), prefix **`task_runner_poc`** (Kibana's default: the snake_case plugin ID):
  - `serviceUrl`: http(s) URI, default `http://localhost:8800`
  - `sharedSecret`: optional string; the plugin logs a warning at startup when it's missing
  - `projectId`: matches the contract's project ID pattern, default `tenant-a`
- API key grant helper (`server/api_keys.ts`): `grantTaskApiKey()` calls core's `security.authc.apiKeys.grantAsInternalUser` for the request's user, with the same role descriptors as `task-runner/scripts/api-key.sh` (read and `view_index_metadata` on `logs-*`; read, write, and `view_index_metadata` on `tr-*`), optional expiration, and metadata `application: task_runner_poc`. Returns the key ID and `base64(id:api_key)`.
- Browser side: an app registered as **Task runner (POC)** (`/app/taskRunnerPoc`, Management category in the classic nav, also findable in the global search bar). For now it shows a placeholder page.
- Type check and lint pass for the plugin project.

Verified on October 30, with Kibana running against tenant A:

- Kibana starts with the plugin; the server logs `[plugins.taskRunnerPoc] Task runner service http://localhost:8803, project tenant-a`.
- The browser side is in the page's plugin list, and its `plugin-taskRunnerPoc` chunk builds and is served. I couldn't open a browser, so the console itself is unchecked.
- `grantTaskApiKey`, called through a temporary dev route (not committed) as `elastic`: the key authenticates as `elastic`, reads `logs-demo-default` (200 docs), gets 403 on `.kibana`, expires 1 hour after creation, and carries the expected role descriptors and metadata. The test key was then invalidated.

## How to test it

1. Tenant A Elasticsearch must be running on `localhost:9201` (`make up` in `task-runner/`).
2. Dev config: `config/kibana.dev.yml` in the worktree (gitignored). It's a real file, not the symlink to the shared `kibana.dev.yml` that `kw` creates. Contents:

   ```yaml
   elasticsearch.hosts: ["http://localhost:9201"]
   elasticsearch.username: kibana_system
   elasticsearch.password: changeme

   task_runner_poc:
     serviceUrl: http://localhost:8803   # Prism mock; use 8800 for the real control plane
     sharedSecret: dev-shared-secret
     projectId: tenant-a
   ```

3. Start Kibana:

   ```bash
   cd /Users/cbanta/Developer/kibana/task-runner-poc-plugin
   nvm use
   pnpm start --no-base-path        # same as: node scripts/kibana --dev --no-base-path
   ```

   Look for `[plugins.taskRunnerPoc] Task runner service http://localhost:8803, project tenant-a` in the log.
4. Open <http://localhost:5601/app/taskRunnerPoc>, log in as `elastic` / `changeme`, and check the placeholder page renders. It's also under **Management** in the side nav.
5. Type check: `node scripts/type_check --project x-pack/platform/plugins/private/task_runner_poc/tsconfig.json` (about 30 seconds).

Mock control plane, once routes exist (serves the examples in `contract/openapi.yaml`, enforces the bearer token):

```bash
cd /Users/cbanta/Developer/kibana/multi-tenant-task-manager/task-runner/contract
npx prism mock -p 8803 openapi.yaml
```

## Assumptions

- Internal routes will follow the pattern in current `main` (for example the `feedback` plugin): unversioned `router.get/post/delete` with `options: { access: 'internal' }` and `security.authz: { enabled: false, reason }`, so any authenticated user can call them and Elasticsearch enforces privileges. Paths under `/internal/task_runner_poc/`. `server.restrictInternalApis` defaults to true, so curl calls need `x-elastic-internal-origin: kibana` as well as `kbn-xsrf`.
- `sharedSecret` has no default in code, so no secret lives in source; the dev value is only in the gitignored `kibana.dev.yml`.
- The app sits in the Management category of the classic nav. A space using a solution nav won't list it in the side nav; use the global search bar or the URL.
- UI strings are plain English, not i18n. Fine for a POC; `node scripts/i18n_check` would need the `xpack.taskRunnerPoc` prefix registered if it's ever kept.
- No `CODEOWNERS` or plugin-list doc entries; those matter only for CI, which this branch never runs.

## Security shortcuts (for the roadmap)

- Routes will require only an authenticated user, with no Kibana feature privilege.
- Keys granted for scheduled work never expire, and nothing invalidates the Elasticsearch API key when a job is deleted: the service deletes its stored copy in Redis, but the key stays valid in Elasticsearch. See the contract change request below.
- Ad-hoc keys expire after 1 hour but aren't invalidated early when the task finishes.

## Open questions

- None blocking. Waiting for the renamed contract (tasks, jobs with optional `every`, flows) before writing routes and the page.

## Contract change requests

- **Let Kibana invalidate a job's API key on delete.** Today Kibana can't tell which Elasticsearch key belongs to which job. Proposal: an optional `apiKeyId` string on the create-job request, stored by the service and returned on the job. On delete, the plugin invalidates that key with `invalidateAsInternalUser`. Not needed for the demo.
