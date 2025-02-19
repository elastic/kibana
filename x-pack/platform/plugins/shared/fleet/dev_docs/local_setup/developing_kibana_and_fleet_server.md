# Developing Kibana and Fleet Server simultaneously

Many times, a contributor to Fleet will only need to make changes to [Fleet Server](https://github.com/elastic/fleet-server) or [Kibana](https://github.com/elastic/kibana) - not both. But, there are times when end-to-end changes across both componenents are necessary. To facilitate this, we've created a guide to help you get up and running with a local development environment that includes both Kibana and Fleet Server. This is a more involved process than setting up either component on its own.

This guide seeks to get you up and running with the following stack components for local development:

- Kibana (from source)
- Elasticsearch (from a snapshot)
- Fleet Server (from source, in standalone mode)

Getting this development environment up and running will allow you to make changes to both Kibana and Fleet Server simultaneously to develop and test features end-to-end.

Before continuing, please review the developer documentation for both Fleet Server and Kibana. Make sure your local workstation can run each service independently. This means setting up Go, Node.js, Yarn, resolving dependencies, etc.

- https://github.com/elastic/fleet-server?tab=readme-ov-file#development
- https://github.com/elastic/kibana/blob/main/CONTRIBUTING.md

You can either run your local stack over HTTPS or HTTP. Each has its own set of instructions below. An HTTPS environment more closely resembles production, but requires a bit more setup. HTTPS may be necessary when developing certain features related to certificates. An HTTP environment is easier to set up, and will generally be the fastest and easiest way to get up and running for end-to-end development.

_This guide expects you have forked + cloned the https://github.com/elastic/fleet-server and https://github.com/elastic/kibana repoisitories locally._

## Running a local stack over HTTP

1. In your `kibana` directory, run a local Elasticsearch server from the latest snapshot build by running:

```bash
# Set a data path to prevent blowing away your Elasticsearch data between server restarts
$ yarn es snapshot --license trial -E path.data=/tmp/es-data
```

2. Add the following to your `kibana.dev.yml`

```yaml
server.basePath: '/some-base-path' # Optional, if used, sets basePath in kibana url e.g. https://localhost:5601/some-base-path/app/fleet
server.versioned.versionResolution: oldest
elasticsearch.hosts: [http://localhost:9200]

# Optional - set up an APM service in a cloud.elastic.co cluster to send your dev logs, traces, etc
# Can be helpful for troubleshooting and diagnosting performance issues
# elastic.apm:
# active: true
# serverUrl: <https://some-cluster.apm.us-east4.gcp.elastic-cloud.com:443>
# secretToken: some-token
# breakdownMetrics: true
# transactionSampleRate: 0.1

logging:
  loggers:
    - name: plugins.fleet
      appenders: [console]
      level: debug

# Allows enrolling agents when standalone Fleet Server is in use
xpack.fleet.internal.fleetServerStandalone: true

xpack.fleet.fleetServerHosts:
  - id: localhost
    name: Localhost
    host_urls: ['http://localhost:8220']
  # If you want to run a Fleet Server containers via Docker, use this Fleet Server host
  - id: docker
    name: Docker Internal Gateway
    host_urls: ['http://host.docker.internal:8220']
    is_default: true

xpack.fleet.packages:
  - name: fleet_server
    version: latest

xpack.fleet.outputs:
  - id: preconfigured-localhost-output
    name: Localhost Output
    type: elasticsearch
    hosts: ['https://localhost:9200']
    is_default: true

  # If you enroll agents via Docker, use this output so they can output to your local
  # Elasticsearch cluster
  - id: preconfigured-docker-output
    name: Docker Output
    type: elasticsearch
    hosts: ['https://host.docker.internal:9200']

xpack.fleet.agentPolicies:
  - name: Fleet Server Policy
    id: fleet-server-policy
    is_default_fleet_server: true
    package_policies:
      - package:
          name: fleet_server
        name: Fleet Server
        id: fleet_server
        inputs:
          - type: fleet-server
            keep_enabled: true
            vars:
              - name: host
                value: 0.0.0.0
                frozen: true
              - name: port
                value: 8220
                frozen: true
```

4. Navigate to https://localhost:5601/app/fleet and click "Add Fleet Server"
5. Ensure your `localhost` Fleet Server host is selected and generate a service token
6. Copy the service token somewhere convenient - you'll need it to run Fleet Server below
7. In a new terminal session, navigate to your `fleet-server` directory
8. Create a `fleet-server.dev.yml` file if one doesn't exist. This file is git ignored, so we can make our configuration changes directly instead of having to use environment variables or accidentally tracking changes to `fleet-server.yml`.

```bash
$ cp fleet-server.yml fleet-server.dev.yml
```

9. Add the following to your `fleet-server.dev.yml` file

```yaml
output:
  elasticsearch:
    hosts: 'http://localhost:9200'
    # Copy the service token from the Fleet onboarding UI in Kibana
    service_token: 'your_service_token'

fleet:
  agent:
    id: '${FLEET_SERVER_AGENT_ID:dev-fleet-server}'

inputs:
  - type: fleet-server
    policy.id: '${FLEET_SERVER_POLICY_ID:fleet-server-policy}'

logging:
  to_stderr: true # Force the logging output to stderr
  pretty: true
  level: '${LOG_LEVEL:DEBUG}'

# Enables the stats endpoint under <http://localhost:5601> by default.
# Additional stats can be found under <http://127.0.0.1:5066/stats> and <http://127.0.0.1:5066/state>
http.enabled: true
#http.host: <http://127.0.0.1>
#http.port: 5601
```

10. Run the following in your `fleet-server` directory to build and run your local Fleet Server

```bash
# Create standalone dev build
$ DEV=true SNAPSHOT=true make release-darwin/amd64

# Run dev build, provide your fingerprint and service token from before
# Replace 8.13.0-SNAPSHOT with the latest version on main
$ ./build/binaries/fleet-server-8.13.0-SNAPSHOT-darwin-aarch64/fleet-server -c fleet-server.dev.yml
```

Now you should have a local ES snapshot running on http://localhost:9200, a local Kibana running on http://localhost:5601, and a local Fleet Server running on http://localhost:8220. You can now navigate to http://localhost:5601/app/fleet and [enroll agents](#enroll-agents).

## Running a local stack over HTTPS

The instructions for HTTPS are largely the same, with a few key differences:

1. You'll need to provide the `--ssl` flag to your ES + Kibana commands, e.g.

```bash
# In your `kibana` directory
$ yarn es snapshot --license trial --ssl -E path.data=/tmp/es-data
$ yarn start --ssl
```

2. Change various URLs in `kibana.dev.yml` to use `https` instead of `http`, and add a `ca_trusted_fingerprint` calculated from the `ca.crt` certificate in Kibana's dev utils package. Your `kibana.dev.yml` should be the same as above, with the following changes:

```yaml
server.basePath: '/some-base-path' # Optional, if used, sets basePath in kibana url e.g. https://localhost:5601/some-base-path/app/fleet
server.versioned.versionResolution: oldest
elasticsearch.hosts: [https://localhost:9200] # <-- Updated to https

# Optional - set up an APM service in a cloud.elastic.co cluster to send your dev logs, traces, etc
# Can be helpful for troubleshooting and diagnosting performance issues
# elastic.apm:
# active: true
# serverUrl: <https://some-cluster.apm.us-east4.gcp.elastic-cloud.com:443>
# secretToken: some-token
# breakdownMetrics: true
# transactionSampleRate: 0.1

logging:
  loggers:
    - name: plugins.fleet
      appenders: [console]
      level: debug

# Allows enrolling agents when standalone Fleet Server is in use
xpack.fleet.internal.fleetServerStandalone: true

xpack.fleet.fleetServerHosts:
  - id: localhost
    name: Localhost
    # Make sure this is `https` since we're running our local Fleet Server with SSL enabled
    host_urls: ['https://localhost:8220'] # <-- Updated to https
    is_default: true
  # If you want to run a Fleet Server in Docker, use this Fleet Server host
  - id: docker
    name: Docker Internal Gateway
    host_urls: ['https://host.docker.internal:8220'] # <-- Updated to https

xpack.fleet.packages:
  - name: fleet_server
    version: latest

xpack.fleet.outputs:
  - id: preconfigured-localhost-output
    name: Localhost Output
    type: elasticsearch
    hosts: ['https://localhost:9200'] # <-- Updated to https
    ca_trusted_fingerprint: 'f71f73085975fd977339a1909ebfe2df40db255e0d5bb56fc37246bf383ffc84' # <-- Added
    is_default: true

  # If you enroll agents via Docker, use this output so they can output to your local
  # Elasticsearch cluster
  - id: preconfigured-docker-output
    name: Docker Output
    type: elasticsearch
    hosts: ['https://host.docker.internal:9200'] # <-- Updated to https
    ca_trusted_fingerprint: 'f71f73085975fd977339a1909ebfe2df40db255e0d5bb56fc37246bf383ffc84' # <-- Added

xpack.fleet.agentPolicies:
  - name: Fleet Server Policy
    id: fleet-server-policy
    is_default_fleet_server: true
    package_policies:
      - package:
          name: fleet_server
        name: Fleet Server
        id: fleet_server
        inputs:
          - type: fleet-server
            keep_enabled: true
            vars:
              - name: host
                value: 0.0.0.0
                frozen: true
              - name: port
                value: 8220
                frozen: true
```

Some packages are bundled with kibana e.g. apm, elastic_agent (see [bundled packages doc](https://github.com/elastic/kibana/blob/main/x-pack/platform/plugins/shared/fleet/README.md#bundled-packages)). To use the latest versions, download the latest kibana distributable from [here](https://artifacts-api.elastic.co/v1/versions/latest), extract, and set the `bundledPackageLocation` in kibana config.

Alternatively, turn on beta integrations on the UI, to use the newest prerelease versions from the registry.

```yaml
xpack.fleet.developer.bundledPackageLocation: /path/to/downloaded/kibana/kibana-8.16.0-SNAPSHOT/node_modules/@kbn/fleet-plugin/target/bundled_packages
```

3. Update your `fleet-server.dev.yml` to look as follows

```yaml
# This config is intended to be used with a stand-alone fleet-server instance for development.
output:
  elasticsearch:
    hosts: 'https://localhost:9200' # <-- Updated to https
    # Copy the service token from the Fleet onboarding UI in Kibana
    service_token: 'your_service_token'
    # Fingerprint of the ca.crt certificate in Kibana's dev utils package
    ssl.ca_trusted_fingerprint: 'f71f73085975fd977339a1909ebfe2df40db255e0d5bb56fc37246bf383ffc84'

fleet:
  agent:
    id: '${FLEET_SERVER_AGENT_ID:dev-fleet-server}'

inputs:
  - type: fleet-server
    policy.id: '${FLEET_SERVER_POLICY_ID:fleet-server-policy}'
    # Enable SSL, point at Kibana's self-signed certs
    server:
      ssl:
        enabled: true
        certificate: ../kibana/packages/kbn-dev-utils/certs/fleet_server.crt
        key: ../kibana/packages/kbn-dev-utils/certs/fleet_server.key
        key_passphrase: ../kibana/packages/kbn-dev-utils/certs/fleet_server.key

logging:
  to_stderr: true # Force the logging output to stderr
  pretty: true
  level: '${LOG_LEVEL:DEBUG}'

# Enables the stats endpoint under <http://localhost:5601> by default.
# Additional stats can be found under <http://127.0.0.1:5066/stats> and <http://127.0.0.1:5066/state>
http.enabled: true
#http.host: <http://127.0.0.1>
#http.port: 5601
```

With these changes in place, the process to start up your local stack is the same as above.

## Enroll agents

Once you have your local stack up and running, you can enroll agents to test your changes end-to-end. There are a few ways to do this. The fastest is to spin up a Docker container running Elastic Agent, e.g.

```bash
docker run  --add-host host.docker.internal:host-gateway  \
  --env FLEET_ENROLL=1  --env FLEET_INSECURE=true\
  --env FLEET_URL=https://localhost:8220 \
  --env FLEET_ENROLLMENT_TOKEN=enrollment_token \
  docker.elastic.co/elastic-agent/elastic-agent:8.13.0-SNAPSHOT # <-- Update this version as needed
```

You can also use the [run_dockerized_agent.sh](./run_dockerized_elastic_agent.sh) script to make this process easier. This script will run a Docker container with Elastic Agent and enroll it to your local Fleet Server. You can also use it to run a Dockerized Fleet Server container if you don't need to develop Fleet Server locally.

Another option is to use a lightweight virtualization provider like https://multipass.run/ and enroll agents using an enrollment token generated via Fleet UI. You will need to update your Fleet Settings with a Fleet Server Host entry + Output that corresponds with your Multipass bridge network interface, similar to how we've set up Docker above. Refer to [Running a local Fleet Server and enrolling Elastic Agents](./enrolling_agents.md) for details about how to use Multipass.

## Running in serverless mode

If you want to run your local stack in serverless mode, you'll only need to alter the commands used to start Elasticsearch and Kibana. Fleet Server does not require any changes outside of what's listed above to run in a serverless context. From your Kibana, start a serverless Elasticsearch snapshot as either a security or observability project, and then run Kibana using the same project type.

```bash
# Start Elasticsearch in serverless mode as a security project
yarn es serverless --projectType=security --kill

# Start Elasticsearch in serverless mode as an observability project
yarn es serverless --projectType=oblt --kill

# Run kibana as a security project
yarn serverless-security

# Run kibana as an observability project
yarn serverless-oblt
```

Once running, you can login with the username `elastic_serverless` or `system_indices_superuser` and the password `changeme`.
