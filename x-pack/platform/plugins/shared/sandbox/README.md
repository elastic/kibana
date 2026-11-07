# Sandbox plugin

Remote sandboxed containers for AI agents. Plugins get a `SandboxSession` from
`SandboxPluginStart.getSession` (or `getSessionForSpace` when no `KibanaRequest` is
available, for example in workflow step handlers) and use it to run commands and read, write
and stat files inside the sandbox.

## Every sandbox RPC reports itself

Every method on `SandboxSession` (`runCommand`, `readFiles`, `writeFiles`, `mkdirs`,
`statFiles`) resolves with `{ value, rpc }`, and a failed call rejects with a
`SandboxRpcError` that carries the same `rpc`:

```ts
const { value: result, rpc } = await session.runCommand({ command: 'ls' });
```

`rpc` is what the call reports about itself: the request id the Elastic Cloud proxy assigned to
it, the gRPC method and status, and the duration. It is what lets one RPC be followed across
Kibana, the proxy and sandbox-api, which an investigation of an incident needs. The plugin cannot
tell which tool call or workflow step issued the RPC, so the code that can must record it:

- Log `rpc` together with the tool call or workflow step, using `sandboxRpcLogMeta(rpc)`. An
  audit event is the better place when the call should be answerable for later: see
  `nightshift_investigations/server/sandbox_audit.ts`, which does this once, where the session is
  obtained, so that the code that uses the session does not have to.
- Do not drop `rpc` on the way, for example by wrapping a session in a helper that returns only
  the value, unless that helper records it first.
- A call that fails before it reaches sandbox-api, such as a refused connection or a deadline,
  has no `rpc.requestId`. It still has the method, the status and the duration.

The plugin writes one debug line for every RPC as well, but it knows only the conversation.

### Log fields

`sandboxRpcLogMeta(rpc)` returns the fields below. sandbox-api logs the same fields with the same
values for the same call. The `rpc.*` fields follow the OpenTelemetry semantic conventions, where the
status code is `rpc.status_code` since 1.45.0 (1.43.0, the version of
`@opentelemetry/semantic-conventions` Kibana pins, still calls it `rpc.response.status_code`).
`event.duration` is an ECS field.

| Field                      | Value                                                                       |
| -------------------------- | --------------------------------------------------------------------------- |
| `sandbox.conversation_id`  | `<space>__<conversation>`, the `x-conversation-id` header                   |
| `sandbox.proxy_request_id` | The proxy's request id from the response. Omitted when no response arrived. |
| `rpc.method`               | `sandbox.SandboxService/RunCommand`, `.../ReadFiles`, ...                   |
| `rpc.status_code`          | gRPC status name, for example `OK`, `UNAVAILABLE`                           |
| `event.duration`           | nanoseconds, measured client-side                                           |

The proxy's request id is not `http.request.id`: Kibana's audit pipeline on Serverless writes its own
request id to that field. Every record of a call (Kibana's debug log, Kibana's audit event and
sandbox-api's logs) carries it as `sandbox.proxy_request_id`, so one search finds them all.

### Pod eviction

A call that fails with gRPC `UNAVAILABLE` (code 14) marks the session as reset: see `isReset` on
`SandboxSession`. `SandboxRpcError` keeps the `code` of the error it wraps.
