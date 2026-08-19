# Workflows connector events example

Registers a **dual connector** (one echo action + one `received` event) and a pre-created instance so you can use it as a Workflows **step** and **trigger** without calling the Connectors API.

## How to run

```bash
yarn start --run-examples
```

## Connector

| Field | Value |
|-------|--------|
| Type id | `.exampleWebhook` |
| Instance id | `sales-ingress` (in-memory, created on plugin start) |
| Action | `echo` (`{ message }` → `{ echo }`) |
| Event id | `exampleWebhook.received` |
| Feature | `workflows` |
| License | gold (Actions requires gold+ for third-party types) |
| Auth | none |

## Workflow YAML

```yaml
name: Echo from sales-ingress
enabled: true
triggers:
  - type: manual
steps:
  - name: echo
    type: exampleWebhook
    connector-id: sales-ingress
    with:
      subAction: echo
      subActionParams:
        message: hello
```

`connector-id: sales-ingress` is the instance this plugin registers. You can still create more instances with `POST /api/actions/connector` if you need a second id.
