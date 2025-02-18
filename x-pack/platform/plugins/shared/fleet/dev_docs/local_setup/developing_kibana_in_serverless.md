# Developing Kibana in serverless mode

Fleet is enabled for the observability and security serverless project types.

To run Elasticsearch and Kibana in serverless mode, the relevant commands are:

For the observability project type:

```bash
# Start Elasticsearch in serverless mode as an observability project
yarn es serverless --projectType=oblt --kill

# Run Kibana as an observability project
yarn serverless-oblt
```

and one of:

```bash
# Start Elasticsearch in serverless mode as a security project
yarn es serverless --projectType=security --kill

# Run Kibana as a security project
yarn serverless-security
```

Once running, you can login at `http://localhost:5601` with the username `elastic_serverless` or `system_indices_superuser` and the password `changeme`.

Note: it is not possible to use a base path in serverless mode. In case of issue, make sure the `server.basePath` property is not set in the config.

Tip: to reset Elasticsearch data, delete the following folder:

```bash
# Run this from the kibana folder:
rm -rf .es/stateless
```

## Kibana config

### Setting a project id

Create a `config/serverless.dev.yml` config file if you don't already have one and add a project id:

```yaml
xpack.cloud.serverless.project_id: test-123
```

The project id is required for some functionality, such as the `isServerless` flag in Fleet's cloud setup.

### Fleet config

The `kibana.dev.yml` settings should be mostly the same as for stateful mode. There are however a few key differences.

As noted above, the base path should not be set (`server.basePath` setting).

To enroll agents with a standalone Fleet Server set:

```yaml
xpack.fleet.internal.fleetServerStandalone: true
```

Finally, it may be necessary for the Fleet config to accurately reflect the generated config for serverless projects, which is defined in [project-controller](https://github.com/elastic/project-controller/blob/69dc1e6b0761bd9c933c23c2a471f32e1b8f1d28/internal/application/kibana/fleet_config.go#L43). At the time of writing, this concerns the default Fleet Server host and default output:

```yaml
xpack.fleet.fleetServerHosts:
  - id: default-fleet-server
    name: Default Fleet server
    is_default: true
    host_urls: ['http://localhost:8220']
    # If you want to run a Fleet Server containers via Docker, use this URL:
    # host_urls: ['https://host.docker.internal:8220']
xpack.fleet.outputs:
  - id: es-default-output
    name: Default output
    type: elasticsearch
    is_default: true
    is_default_monitoring: true
    hosts: ['https://localhost:9200']
    # # If you enroll agents via Docker, use this URL:
    # hosts: ['https://host.docker.internal:9200']
```

## Running a Fleet Server and enrolling agents

In serverless mode, Fleet Server runs in standalone mode. Unless you are [simultaneously developing Kibana and Fleet Server](./developing_kibana_and_fleet_server.mddeveloping_), it is easier to run Fleet Server as a Docker container.

The Kibana's dev utils package defines a hard-coded [Fleet Server service token](ttps://github.com/elastic/kibana/blob/92b6fd64cd58fd62f69898c222e86409d5f15b60/packages/kbn-dev-utils/src/dev_service_account.ts#L21-L25) and fingerprint of the ca.crt certificate.

Running a standalone Fleet Server:

```bash
docker run -it --rm \
  -e ELASTICSEARCH_HOSTS="http://host.docker.internal:9200" \
  -e ELASTICSEARCH_SERVICE_TOKEN="AAEAAWVsYXN0aWMvZmxlZXQtc2VydmVyL2ZsZWV0LXNlcnZlci1kZXY6VVo1TWd6MnFTX3FVTWliWGNXNzlwQQ" \
  -e ELASTICSEARCH_CA_TRUSTED_FINGERPRINT="F71F73085975FD977339A1909EBFE2DF40DB255E0D5BB56FC37246BF383FFC84" \
  -p 8220:8220 \
  docker.elastic.co/observability-ci/fleet-server:latest
```

Containerized elastic agents can then be enrolled using:

```bash
docker run \
    -e FLEET_URL=http://host.docker.internal:8220 \
    -e FLEET_ENROLL=1 \
    -e FLEET_ENROLLMENT_TOKEN=<enrollment_token>== \
    -e FLEET_INSECURE=1 \
    --rm docker.elastic.co/elastic-agent/elastic-agent:<version>
```

## Troubleshooting

### `Cannot read existing Message Signing Key pair` issue

At the time of writing, there is a known issue where Fleet may fail to load due to error generating key pair for message signing. This may in particular happen after running API integration tests. The easiest solution in development is to reset Elasticsearch data:

```bash
# Run this from the kibana folder:
rm -rf .es/stateless
```

## Release

Serverless Kibana is periodically released from `main` following a deployment workflow composed of four environments (CI, QA, Staging, Production). It is therefore important to be aware of the release schedule and ensure timely communication with our QA team prior to merging.
