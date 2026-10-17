# @kbn/sandbox-proto

Hand-written protobuf codecs and the gRPC service definition for the subset of
`sandbox.SandboxService` (see `proto/sandbox/sandbox.proto` in
[elastic/sandbox-service](https://github.com/elastic/sandbox-service)) that Kibana uses:
`RunCommand`, `StatFiles`, `ReadFiles`, `WriteFiles` and `Mkdirs`.

The codecs do plain `Buffer` manipulation — no `eval` and no code generation.
`sandboxServiceDefinition` works both as a client definition
(`grpc.makeClientConstructor`) and as a server definition (`grpc.Server#addService`).

Used by the `sandbox` plugin (client) and `@kbn/mock-sandbox` (local mock server).
