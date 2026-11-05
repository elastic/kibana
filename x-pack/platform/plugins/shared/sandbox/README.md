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
values for the same call. The `rpc.*` fields follow the OpenTelemetry semantic conventions of
`@opentelemetry/semantic-conventions` 1.43.0, the version Kibana pins. `http.request.id` and
`event.duration` are ECS fields.

| Field                      | Value                                                                       |
| -------------------------- | --------------------------------------------------------------------------- |
| `http.request.id`          | The proxy's request id from the response. Omitted when no response arrived. |
| `sandbox.conversation_id`  | `<space>__<conversation>`, the `x-conversation-id` header                   |
| `rpc.system.name`          | `grpc`                                                                      |
| `rpc.method`               | `sandbox.SandboxService/RunCommand`, `.../ReadFiles`, ...                   |
| `rpc.response.status_code` | gRPC status name, for example `OK`, `UNAVAILABLE`                           |
| `event.duration`           | nanoseconds, measured client-side                                           |

Kibana's audit pipeline on Serverless writes its own request id to `http.request.id`, so an audit
event must carry the proxy's id under another name. `nightshift_investigations` uses
`sandbox.proxy_request_id`.

### Pod eviction

A call that fails with gRPC `UNAVAILABLE` (code 14) marks the session as reset: see `isReset` on
`SandboxSession`. `SandboxRpcError` keeps the `code` of the error it wraps.
