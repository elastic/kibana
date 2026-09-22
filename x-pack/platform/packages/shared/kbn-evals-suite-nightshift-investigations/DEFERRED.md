# Deferred sandbox provisioning

The external sandbox launcher and tests. Known open review: native binaries must be cached by resolved sandbox-service commit; the Docker backend also has an intermittent startup race. Neither this launcher nor its CI integration blocks the trace-only runner.

Source: `b656789f07c89379c2d82deb34636f262138fdc5`; base: `b0a6c50cf43447489e6f93aa4820105f0732c3e8`. Original complete snapshot: `nightshift/archive-291002-b656789f`. Preserved for follow-up; not validated on this extracted branch. Historical validation is in PR #291002 before its scope rewrite. None of this branch is required for task 1 of deductive-ai/deductive#10565.

## Historical implementation notes

### External sandbox prerequisite

The golden eval needs [elastic/sandbox-service](https://github.com/elastic/sandbox-service) running
natively with its Docker backend and mTLS. The eval stack does not start it; one script does:

```bash
node scripts/nightshift_sandbox.js
```

The script clones the private repository with your git credentials, builds `container-manager`
and `sandbox-api` with Go, builds the sandbox image, creates its Docker network, generates a
private certificate authority with server and client certificates, generates an API key, and runs
both services in the foreground until you press Ctrl+C. It needs git access to the repository, Go
(the version in sandbox-service's `.tool-versions`), openssl, and a running Docker whose container
IPs are reachable from the host: native on Linux, OrbStack on macOS. Later runs reuse the clone,
binaries, image, certificates and key; pass `--rebuild` after changing `--ref`, and see `--help`
for ports and an existing checkout.

Everything lives under the git-ignored `data/nightshift_sandbox`, kept owner-only. Once the script
reports ready, load the connection variables in the terminal that runs the evals:

```bash
source data/nightshift_sandbox/sandbox.env
```

That file holds the API key; do not commit it or include it in evidence reports. The key reaches
`sandbox-api` through its environment, never through process arguments. CI does not run this
script yet: an agent would need Go, Docker, and read access to the private repository.

Known issue in sandbox-service's Docker backend: a conversation's first call can reach the sandbox
before its data port is listening. sandbox-api then drops the session, and every later call for
that conversation fails with `allocate sandbox: ... DeadlineExceeded`, because the sandbox only
exchanges keys once. It is intermittent. An affected investigation either gives up on the sandbox
or runs into the 20-minute task limit, so check the Kibana log for that error and re-run.

Scout reads the PEM files into the `xpack.sandbox.ssl` configuration and connects with mTLS.
The sandbox configuration is passed through a mode-0600 temporary file in a private directory,
so sandbox credentials, connector secrets, and trace-exporter headers do not appear in process arguments. Scout removes the
temporary directory when its process exits normally.
The gRPC API listens on `9090`; `8090` is only for probes. Leave the `WORKSPACE_SNAPSHOT_*`
variables unset so each new conversation starts independently. Persistence is owned by
sandbox-api; the Kibana workspace persistence and backup hook were removed in #289300. The shared
`space__conversation` scoping is applied by the sandbox plugin (#291391) for the sandbox tools
and Cortex hydration. The Docker network must allow
native sandbox-api to reach container ports `8080` and `8081`. The sandbox must also reach
Scout Elasticsearch at `http://host.docker.internal:9220`; override
`NIGHTSHIFT_SANDBOX_ELASTICSEARCH_URL` if your Docker networking uses another address.
