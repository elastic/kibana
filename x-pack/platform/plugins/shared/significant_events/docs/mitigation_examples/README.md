# Mitigation workflows (POC)

Curated **mitigation workflows** are ordinary Kibana workflows a user prepares up front for
the destructive things an SRE might do to fix a system — restarts, scaling, rollbacks,
deleting pods. The significant-events investigation pipeline can then act on them:

1. **Discovery** — the investigation agent lists them via the `find_mitigation_workflows`
   tool (it can search them, but never execute them).
2. **Proposal** — when a workflow matches the confirmed root cause, the agent's final output
   carries a structured `next_steps` entry with the workflow id, concrete inputs, and an
   honest `confidence`/`risk` assessment.
3. **Auto-run gate** — a dedicated agent step inside the investigation workflow compares each
   proposal against the workflow's own policy (`metadata.mitigation`) and either triggers it
   automatically, leaves it as a suggestion, or rejects it. Every decision is recorded on the
   significant event.
4. **UI** — the event flyout shows the proposals as cards with the auto-run outcome, links to
   mitigation executions, and a one-click **Run workflow** button for suggested ones.

## Conventions

A workflow becomes a mitigation workflow through three things:

- **`tags: [mitigation]`** — makes it discoverable (tags are indexed and searchable).
- **`metadata.mitigation`** — the auto-run policy enforced by the gate:

  ```yaml
  metadata:
    mitigation:
      auto_run: true          # may an automated caller trigger this at all?
      min_confidence: high    # minimum proposal confidence (low < medium < high)
      max_risk: low           # maximum proposal risk (low < medium < high)
      guardrail: >            # free-text constraint the gate checks against the conclusion
        Only for stateless services.
  ```

  Omit `auto_run` or set it to `false` for actions that must always go through a human
  (they still show up as one-click suggestions in the flyout).

- **A manual trigger with typed inputs** — the agent reads this schema and fills in concrete
  values when proposing a run:

  ```yaml
  triggers:
    - type: manual
      inputs:
        properties:
          namespace: { type: string }
          deployment: { type: string }
        required: [namespace, deployment]
  ```

## Examples in this folder

| File | What it does | Auto-run policy |
| --- | --- | --- |
| `scale_up_deployment.yaml` | Scale a k8s deployment | yes — high confidence, low risk |
| `rollout_restart_deployment.yaml` | Rolling restart of a k8s deployment | yes — high confidence, up to medium risk |
| `delete_crashlooping_pod.yaml` | Capture logs, then delete a pod | never — human only |
| `simulated_restart.yaml` | No-op simulation (no connector needed) | yes — for pipeline testing |

## Setup

1. **Kubernetes connector** (not needed for `simulated_restart.yaml`): create one under
   *Stack Management → Connectors → Kubernetes* (requires the spec-based Kubernetes connector,
   PR #275922). Pick the auth flavor matching your cluster (static token, GKE, EKS, or AKS).
2. **Import the workflows**: *Management → Workflows → Create workflow*, paste a YAML, save.
   Or via API:

   ```bash
   curl -s -X POST -u elastic:changeme \
     -H 'kbn-xsrf: true' -H 'Content-Type: application/json' \
     -H 'x-elastic-internal-origin: kibana' \
     http://localhost:5601/api/workflows/workflow \
     --data "$(jq -n --rawfile yaml scale_up_deployment.yaml '{yaml: $yaml}')"
   ```

3. Edit `consts.kubernetes_connector` in each imported workflow to your connector's name/id.
4. Verify discovery: `GET /api/workflows?tags=mitigation` should list them with
   `definition.metadata.mitigation` populated.

## Trying it end-to-end

Trigger an investigation on a significant event (flyout → **Run investigation**, or
`POST /internal/significant_events/events/{id}/investigate`). When the agent confirms a root
cause that one of these workflows addresses, the flyout's **Next steps** section shows the
proposal card — auto-run (with an execution link) when the gate cleared it, or with a
**Run workflow** button when it didn't.
