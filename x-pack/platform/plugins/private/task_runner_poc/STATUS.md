# WS3 status: Kibana plugin (`taskRunnerPoc`)

Branch `task-runner-poc-plugin` in the Kibana worktree `/Users/cbanta/Developer/kibana/multi-tenant-task-manager/worktrees/ws3-kibana-plugin`, off `upstream/main`. Local commits only.

**October 30: stages A (server routes), B (the page), and C (scheduled jobs) are done**, built against the contract at task-runner `f1c2ac5`. They're tested with unit tests, the Prism mock, and tenant A's real Elasticsearch for the output. Not yet tested against the real control plane on `localhost:8800`; that waits for WS1's stage C.

## Done

### Setup

- Plugin at `x-pack/platform/plugins/private/task_runner_poc`: plugin ID `taskRunnerPoc`, private, platform group, requires `features` and `share`. Upstream `main` uses **pnpm**; the plugin is linked through bootstrap and `moon.yml` is generated.
- Config prefix `task_runner_poc`: `serviceUrl` (default `http://localhost:8800`), `sharedSecret` (no default; a warning is logged when it's missing), `projectId` (default `tenant-a`, exposed to the browser).
- Kibana feature **Task runner (POC)** (Management category). `All` grants the `read_task_runner_poc` and `manage_task_runner_poc` API privileges; `Read` grants only `read_task_runner_poc`.

### Stage A: server routes

Internal versioned routes (version `1`) under `/internal/task_runner_poc`:

| Route | Privilege | Does |
|---|---|---|
| `POST /jobs` | manage | Grants an API key for the current user, then calls the service's `POST /jobs` |
| `GET /jobs?limit` | read | Lists the project's jobs |
| `GET /jobs/{jobId}` | read | Gets one job |
| `GET /jobs/{jobId}/tasks?limit` | read | Lists one job's recent tasks |
| `DELETE /jobs/{jobId}` | manage | Deletes a job (204) |
| `GET /tasks?limit` | read | Lists recent tasks |
| `GET /tasks/{taskId}` | read | Gets one task; the `:` in the ID is URL-encoded on the way to the service |
| `GET /tasks/{taskId}/output` | read | Reads the task's result document from `tr-results` (`_id` = taskId) with the **current user's** Elasticsearch client |

- **Create body:** `{ query, everySeconds?, runAt?, idempotencyKey? }`. The plugin fills in `taskType: esql_summary`, `params.resultIndex: tr-results`, `timeout: 60s`, and `maxExecutions: 3`. `everySeconds` (a whole number from 1 to 86,400, the contract's 1 second to 24 hours) becomes `every: "{n}s"`. `runAt` must be at most 30 days ahead and is normalized to ISO 8601. Both limits are checked before any API key is granted. A missing `idempotencyKey` becomes `kbn-{uuid}`.
- **API key lifetime:**
  - One-shot job: 1 hour. With a future `runAt`, 1 hour past `runAt`, which covers the timeout and retries.
  - Scheduled job: never expires (see security shortcuts).
  - Role descriptors match `task-runner/scripts/api-key.sh`.
- **Error mapping:** the service's `{error: {code, message}}` becomes a Kibana error with `attributes.code`.
  - 400, 404, 501, and 503 pass through.
  - 401 and 403 from the service become **502** with "check task_runner_poc.sharedSecret". The browser never sees a 401 that would log the user out, and the secret is never in a response or log.
  - `project_not_found` becomes 502 with "check task_runner_poc.projectId".
  - Unreachable service: 502. Timeout after 10 seconds: 504. Missing secret: 500, with no call made.
  - An Elasticsearch error on the output route keeps its status, so a user who can't read `tr-results` gets 403.
- **Logging:** create and delete log with ECS identity meta (`task_runner.project.id`, `task_runner.job.id`, `task_runner.task.id`, `event.action`, `event.outcome`).
- **Contract follow-up (`cd9e875`, `f1c2ac5`):**
  - Types include `workerType` and `runAt`. `Task.flowId` is non-null; `Job.flowId` is null for a standalone job.
  - A repeated idempotency key's first response is passed through unchanged.
  - The output route reads right after the task's status is `succeeded`.
  - The plugin doesn't call flows or queue metrics.

### Stage B: the page (`/app/taskRunnerPoc`)

- **New job:**
  - An ES|QL text area with the default query `FROM logs-* | STATS errors = COUNT(*) WHERE log.level == "error" BY service.name`.
  - **Run now** creates a one-shot `esql_summary` job writing to `tr-results`. Each click sends a fresh idempotency key, and the button is disabled while the request is in flight, so a double click creates one job.
  - Without the `All` privilege the button is disabled, with a tooltip.
  - **Open query in Discover** opens the query over the last 30 days.
- **Tasks:**
  - A table polling `GET /tasks` every 2 seconds. Polls never overlap, and the last good data stays when a poll fails.
  - Columns: status badge, query, "execution N of maxExecutions" (plus the next execution's time while retrying), started, duration, rows, error, and a Discover link to the result document (`FROM tr-results | WHERE taskId == "…"`, 15 minutes either side of `finishedAt`).
- **Expanded row:**
  - The last execution's error, in a callout.
  - Task, job, and flow IDs, created time, and timeout.
  - Every execution with its worker, start, duration, and error.
  - For a succeeded task, the output table built from the result document's `columns` and `values`, with "N rows" or "Showing X of rowCount rows", plus a note when the output was truncated.

### Stage C: scheduled jobs

- **New job form:**
  - **Repeat every** (a switch plus a seconds field, 1 to 86,400) creates a scheduled job with `every`.
  - **Run at** (a switch plus a date-time picker, at most 30 days ahead) sends `runAt`. Alone, the job fires once at that time; with Repeat every, it's the first occurrence.
  - The button reads **Run now**, **Create job** (Run at only), or **Create scheduled job**. It's disabled while the input is invalid, and the field shows why.
  - `taskId` is null for these jobs, so the toast says when the job fires ("It fires every 10s, first at …" or "It fires once at …") instead of naming a task.
- **Scheduled jobs list:**
  - Polls `GET /jobs` every 2 seconds and shows jobs with `every`, plus one-shot jobs still waiting for their `runAt` (`nextFireAt` set).
  - Columns: query, how the job fires ("every 10s" or "once at …"), `nextFireAt`, running or idle, and the last task's status and finish time.
  - Expanding a job polls `GET /jobs/{jobId}/tasks` (10 most recent) and shows them in the same tasks table, output included.
  - **Delete** asks for confirmation, then calls the service's delete. It's disabled without the `All` privilege. The Elasticsearch API key isn't invalidated (see security shortcuts).
- **Tasks list:** a **Job** column shows how each task's job fires ("every 10s" or "one-shot"), from the polled jobs list. It shows "—" when the job is no longer listed; the tooltip has the job ID.

## Verified (October 30)

- **Checks:**
  - Type check: exit 0.
  - Jest: 41 tests pass (29 route tests in `server/routes/routes.test.ts`, 12 form and job-helper tests in `public/lib/new_job.test.ts`).
  - ESLint and oxlint: clean.
- **curl through Kibana against Prism (`f1c2ac5`):**
  - Create one-shot, and scheduled with `runAt`: 200. Prism accepted both request bodies.
  - Bad `everySeconds`: 400. Bad job ID: 400. Missing `elastic-api-version`: 400.
  - List and get jobs: 200, with `workerType` and `runAt` present. Delete: 204.
  - List and get tasks: 200, with the task ID's `%3A` encoding.
  - Prism stopped: `GET /tasks` returns 502 `unreachable`.
  - Stage C: `GET /jobs/{jobId}/tasks`: 200 (and 400 for a bad job ID). `runAt` 31 days ahead and `everySeconds: 86401`: 400, with no API key granted.
- **Output route against tenant A's Elasticsearch:**
  - I indexed a test document with a unique `taskId`, read it through Kibana (200), checked a missing one returns 404, and deleted the document.
  - The Discover query (`FROM tr-results | WHERE taskId == …`) finds it.
- **The page, in headless Chromium (Playwright) against the mock:**
  - The tasks table renders and refreshes.
  - The failed task's row shows its error and executions.
  - The succeeded task's row shows the output table (18 web, 15 api, 9 db) from the contract's fixture result document, which I indexed into `tr-results` under the mock's task ID and deleted afterward.
  - **Run now** shows a success toast.
  - The result-document Discover link opens Discover with one hit.
  - No plugin console errors. Kibana's own CSP notice about an inline script appears on every page.
- **Stage C in the browser against the mock:**
  - The scheduled jobs list shows the mock's scheduled job (every 10s, next fire time, idle, last task succeeded).
  - Expanding it shows its recent task, and the row stays expanded through refreshes.
  - The tasks list's Job column shows "every 10s" and "one-shot" for the mock's tasks.
  - Repeat every 0 disables the button. Repeat every 10 with Run at sends `{"everySeconds":10,"runAt":"…"}` and toasts "Created scheduled job … It fires every 10s, first at …".
  - Delete opens the confirmation; confirming sends `DELETE /jobs/{jobId}` (204) and toasts "Deleted job …".
- **Cleanup:**
  - Invalidated every API key Kibana granted during mock testing: 5 in stage B and 1 in stage C. Two were never-expiring scheduled-job keys.
  - Kibana and Prism are stopped.

Not verified:
- The real control plane: real `nextFireAt` and `running` values, and whether a deleted job disappears from `GET /jobs`. The mock always returns the same examples, so a deleted job stays listed.
- A real worker writing a result.
- A user with only the `Read` privilege in the browser (covered by unit tests on the route privileges).

## How to try it

1. Tenant A Elasticsearch on `localhost:9201` (`make up` in `task-runner/`).
2. `config/kibana.dev.yml` in the worktree (gitignored, a real file):

   ```yaml
   elasticsearch.hosts: ["http://localhost:9201"]
   elasticsearch.username: kibana_system
   elasticsearch.password: changeme

   # Kibana main redirects every app to a first-launch solution picker in dev mode; skip it.
   xpack.spaces.initialSolutionSetup.enabled: false

   task_runner_poc:
     serviceUrl: http://localhost:8803   # Prism mock; use 8800 for the real control plane
     sharedSecret: dev-shared-secret
     projectId: tenant-a
   ```

3. Start the mock (it serves the `openapi.yaml` examples and enforces the bearer token):

   ```bash
   cd /Users/cbanta/Developer/kibana/multi-tenant-task-manager/task-runner/contract
   npx prism mock -p 8803 openapi.yaml
   ```

4. Start Kibana in another terminal:

   ```bash
   cd /Users/cbanta/Developer/kibana/multi-tenant-task-manager/worktrees/ws3-kibana-plugin
   source ~/.nvm/nvm.sh && nvm use     # Node 24.22.1 from .nvmrc
   node scripts/kibana --dev --no-base-path
   ```

   Wait for `Kibana is now available` and look for `[plugins.taskRunnerPoc] Task runner service http://localhost:8803, project tenant-a`.

5. Open <http://localhost:5601/app/taskRunnerPoc> and log in as `elastic` / `changeme`.
6. Or use curl. Internal versioned routes need all four headers:

   ```bash
   H=(-u elastic:changeme -H 'kbn-xsrf: true' -H 'x-elastic-internal-origin: kibana' -H 'elastic-api-version: 1' -H 'Content-Type: application/json')
   B=http://localhost:5601/internal/task_runner_poc
   curl -s "${H[@]}" -X POST $B/jobs -d '{"query":"FROM logs-* | STATS errors = COUNT(*) WHERE log.level == \"error\" BY service.name"}'
   curl -s "${H[@]}" -X POST $B/jobs -d '{"query":"FROM logs-* | LIMIT 5","everySeconds":10}'
   curl -s "${H[@]}" -X POST $B/jobs -d "{\"query\":\"FROM logs-* | LIMIT 5\",\"everySeconds\":30,\"runAt\":\"$(date -u -v+5M +%Y-%m-%dT%H:%M:%SZ)\"}"
   curl -s "${H[@]}" "$B/jobs?limit=10"
   curl -s "${H[@]}" "$B/jobs/job_01JBX3K1ZP7Q2W4E6R8T0Y1U3I/tasks?limit=10"
   curl -s "${H[@]}" "$B/tasks?limit=10"
   curl -s "${H[@]}" "$B/tasks/job_01JBX4Q7M2ZK8V3N5R6T9W0YAB%3A1793631815000"
   curl -s "${H[@]}" "$B/tasks/job_01JBX4Q7M2ZK8V3N5R6T9W0YAB%3A1793631815000/output"   # 404 unless tr-results has that document
   curl -s "${H[@]}" -X DELETE "$B/jobs/job_01JBX3K1ZP7Q2W4E6R8T0Y1U3I" -w '%{http_code}\n'
   ```

   Each create against the mock grants a real Elasticsearch API key that the mock never stores. Invalidate them afterward (`GET /_security/api_key?name=task_runner_poc*` and `DELETE /_security/api_key`).

7. Checks (from the worktree; under the agent sandbox they need network permission because Node's `os.networkInterfaces()` is blocked):

   ```bash
   node scripts/type_check --project x-pack/platform/plugins/private/task_runner_poc/tsconfig.json
   node scripts/jest x-pack/platform/plugins/private/task_runner_poc
   node scripts/eslint x-pack/platform/plugins/private/task_runner_poc
   ```

## Assumptions

- Routes are versioned internal routes (`router.versioned`, `access: 'internal'`, version `1`) with feature API privileges. Elasticsearch still enforces data access: the output route uses the user's own client, and the task's key is the user's.
- The plugin picks the job's `timeout` (60s) and `maxExecutions` (3); the page doesn't expose them.
- A one-shot key lasts 1 hour past when the job fires. A task that keeps retrying past that would fail on credentials.
- The tasks list shows whatever `GET /tasks` returns, newest first, up to 50. The Prism example list includes a `tenant-b` task, which is a mock artifact; the real service scopes by project.
- The scheduled jobs list is the first 50 jobs from `GET /jobs`, keeping those with `every` or a `nextFireAt`. A one-shot job leaves the list once it has fired, since the contract sets its `nextFireAt` to null. Deleting a pending one-shot job cancels it, per the contract.
- The tasks list's Job column looks the job up in that same list of 50, so it shows "—" for a job that isn't in it.
- The Run at picker uses the browser's time zone and sends UTC. It defaults to 5 minutes from now, on the minute.
- The Discover link for the query uses the last 30 days; the seed data is about 13 hours of `logs-demo-default`.
- UI strings are plain English, not i18n. The app is in the Management category of the classic nav; spaces with a solution nav find it through the global search bar or the URL.
- No `CODEOWNERS` or plugin-list doc entries; those matter only for CI, which this branch never sees.

## Security shortcuts (for the roadmap)

- Scheduled-job keys never expire, and nothing invalidates a key in Elasticsearch when its job is deleted. **A deleted scheduled job's key stays valid in Elasticsearch indefinitely**; the service deletes only its copy in Redis. A deleted pending one-shot job's key stays valid until it expires (1 hour past `runAt`). See the `apiKeyId` item below.
- One-shot keys expire on their own but aren't invalidated when the task finishes.
- A repeated idempotency key (a retried request) still grants a new key before calling the service. The service discards it and returns the first response, so the extra key is never used or invalidated, and for a scheduled job it never expires.
- The shared secret is a static bearer token in `kibana.yml`.
- Feature privileges are per Kibana, not per space; any user with the privilege sees every job and task in the configured project.

## Open questions

None blocking. To confirm against the real control plane:

- Does `GET /jobs` keep listing one-shot jobs after they fire? The page hides them either way.
- After a delete, do the job's past tasks still appear in `GET /tasks`? The contract doesn't say. The confirmation only says what the contract does: the job stops firing, and a task in flight finishes normally.

## Contract change requests

- **Let Kibana invalidate a job's API key on delete** (on the roadmap, not in the contract this week). Proposal: an optional `apiKeyId` string on the create-job request, stored by the service and returned on the job. On delete, the plugin invalidates that key with `invalidateAsInternalUser`.
