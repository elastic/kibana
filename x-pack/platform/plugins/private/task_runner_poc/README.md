# Task runner POC (`taskRunnerPoc`)

A proof-of-concept page for submitting and watching jobs on the multi-tenant task runner, a standalone background job service outside Kibana.

Kibana grants an API key on behalf of the current user and sends it with each job; the service runs the job on its own workers against Elasticsearch, and Kibana stores no job state. The plugin is disabled by default and is not meant to ship. The service, its contract, and a Docker Compose stack to run it locally are in [elastic/task-runner-poc](https://github.com/elastic/task-runner-poc) (private).

## Configuration

```yaml
task_runner_poc:
  enabled: true
  serviceUrl: http://localhost:8800 # the service's control plane
  sharedSecret: <the service's TR_SHARED_SECRET>
  projectId: tenant-a # the project (tenant) this Kibana submits jobs for
```

`projectId` is fixed by configuration; the browser can't choose another project. `sharedSecret` stays on the server.

## What it does

- **Page** at `/app/taskRunnerPoc`: run an ES|QL `esql_summary` job now, at a set time (`runAt`), or on a schedule (`every`); list scheduled jobs and recent tasks; expand a task to see its executions and its result document from `tr-results`.
- **Kibana feature** "Task runner (POC)": `All` can create and delete jobs, `Read` can only view them.
- **Internal versioned routes** under `/internal/task_runner_poc` (version `1`): `POST /jobs`, `GET /jobs`, `GET /jobs/{jobId}`, `GET /jobs/{jobId}/tasks`, `DELETE /jobs/{jobId}`, `GET /tasks`, `GET /tasks/{taskId}`, and `GET /tasks/{taskId}/output`. The output route reads `tr-results` with the current user's Elasticsearch client.

## Security shortcuts

This is a POC, and these are deliberate:

- Scheduled jobs' API keys never expire, and deleting a job doesn't invalidate its key.
- One-shot keys last one hour past when the job fires and aren't invalidated when the task finishes.
- A retried create with the same idempotency key grants a new key that the service discards.
- One set of index privileges (`logs-*` read, `tr-*` read and write) serves every task type.
- Kibana authenticates to the service with one shared secret.
- Feature privileges are per Kibana, not per space: anyone with the privilege sees every job in the configured project.
- UI strings aren't internationalized.

## Checks

```bash
node scripts/type_check --project x-pack/platform/plugins/private/task_runner_poc/tsconfig.json
node scripts/jest x-pack/platform/plugins/private/task_runner_poc
node scripts/eslint x-pack/platform/plugins/private/task_runner_poc
```
