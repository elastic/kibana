# @kbn/mock-sandbox

A local stand-in for [sandbox-api](https://github.com/elastic/sandbox-service) so you can develop
and test the `sandbox` plugin and its consumers (Nightshift investigations) without minikube,
gVisor, or Cloud-issued certificates. It only needs Docker.

```bash
node scripts/mock_sandbox.js
```

Then start Kibana with the command the script prints:

```bash
node scripts/kibana --dev -c config/kibana.yml -c config/kibana.dev.yml -c config/kibana.mock_sandbox.yml --no-dev-config
```

`config/kibana.mock_sandbox.yml` is loaded last, so it overrides any `xpack.sandbox` settings in
`kibana.dev.yml`.

## What it does

- Serves the `sandbox.SandboxService` RPCs that Kibana uses (`RunCommand`, `StatFiles`,
  `ReadFiles`, `WriteFiles`, `Mkdirs`) over TLS on `localhost:9090`. It uses the Kibana dev
  certificate from `@kbn/dev-utils`. The codecs come from `@kbn/sandbox-proto`, the same package
  the plugin uses.
- Runs each conversation (`x-conversation-id`) in its own container, `kbn-mock-sandbox-<id>`,
  and implements every RPC with `docker exec`. It follows the real pod's rules: paths are limited
  to `/workspace`, `/tmp` and `/home/appuser`; relative paths resolve under `/workspace`; commands
  get a timeout of at least 600 s; stdout and stderr are each capped at 1.5 MiB.
- Builds a light image the first time it runs (about 1–2 minutes). The image is Ubuntu with bash,
  curl, jq, ripgrep, git, and a Python venv at `/home/appuser/.venv` with requests, numpy, pandas
  and tabulate. To run the full sandbox image, build `Dockerfile.sandbox` from sandbox-service and
  pass it with `--image`.
- Writes `config/kibana.mock_sandbox.yml`, which contains:
  - `xpack.sandbox`, pointing at the mock;
  - a preconfigured `.http` connector, `mock-sandbox-local-es`, for your local Elasticsearch.
    Inside the container it is reached as `host.docker.internal`, and it authenticates with an
    API key minted with `elastic:changeme`. The key is reused across restarts while it stays valid.
  - `xpack.nightshift_investigations.sandbox.telemetry_connector_id: mock-sandbox-local-es`, so
    the investigation agent can query local Elasticsearch from the first command.
- Removes all sandbox containers on Ctrl+C. Pass `--keep` to keep them; the next start reuses them.

## Simulating pod eviction

Remove a container while Kibana uses it:

```bash
docker rm -f kbn-mock-sandbox-<conversation-id>
```

The next RPC fails with `UNAVAILABLE`, as it does when a real pod is evicted, and the session's
`isReset` flag flips. The call after that gets a fresh container.

## Differences from the real service

- There is no gVisor and no network policy. Containers can reach your host and your LAN.
- There are no workspace snapshots: a removed container loses its `/workspace`.
- The API key is the only authentication. The default is `mock-sandbox`; change it with `--api-key`.
- Environment changes don't persist between commands. This matches the real service, because
  Kibana sends an empty `task_group_id`.

Run `node scripts/mock_sandbox.js --help` to see all flags.
