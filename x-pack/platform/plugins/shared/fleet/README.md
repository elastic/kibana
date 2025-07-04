# Fleet

Fleet provides a web-based UI in Kibana for centrally managing Elastic Agents and their policies.

Official documentation: https://www.elastic.co/guide/en/fleet/current/index.html.

## Plugin overview

The Fleet plugin is enabled by default. The Fleet API and UI can be disabled by setting the `xpack.fleet.agents.enabled` Kibana setting to `false`.

Available Fleet settings are listed in the [official documentation](https://www.elastic.co/guide/en/kibana/current/fleet-settings-kb.html). For an exhaustive list including internal settings, refer to the [FleetConfigType](https://github.com/elastic/kibana/blob/main/x-pack/platform/plugins/shared/fleet/common/types/index.ts) type definition.

This plugin follows the `common`, `server`, `public` structure described in the [Kibana Developer Guide](https://docs.elastic.dev/kibana-dev-docs/key-concepts/platform-intro). Refer to [The anatomy of a plugin](https://docs.elastic.dev/kibana-dev-docs/key-concepts/anatomy-of-a-plugin) in the guide for further details.

Note: this plugin was previously named Ingest Manager, there are still a few references to that old name in the code.

## Fleet setup

Refer to [the documentation](https://www.elastic.co/guide/en/fleet/current/fleet-deployment-models.html) for details on how to configure Fleet depending on the deployment model (self-managed, Elasticsearch Service or Elastic Cloud serverless).

Running a [self-managed stack](https://www.elastic.co/guide/en/fleet/current/add-fleet-server-on-prem.html) (see below for local development setup), in particular, required setting up a Fleet Server and configuring [Fleet settings](https://www.elastic.co/guide/en/kibana/8.13/fleet-settings-kb.html).

## Development

### Getting started

Refer to the [Contributing to Kibana](https://github.com/elastic/kibana/blob/main/CONTRIBUTING.md) documentation for getting started with developing for Kibana. As detailed under the Contributing section of the documentation, we follow the pattern of developing feature branches under your personal fork of Kibana.

Fleet development usually requires running Kibana from source alongside a snapshot of Elasticsearch, as detailed in the  [Contributing to Kibana](https://github.com/elastic/kibana/blob/main/CONTRIBUTING.md) documentation. The next section provides an overview of this process.

In addition, it is typically needed to set up a Fleet Server and enroll Elastic Agents in Fleet. Refer to one of the following guides depending on your requirements for details:
- [Running a local Fleet Server and enrolling Elastic Agents](dev_docs/local_setup/enrolling_agents.md) for developing Kibana in stateful (not serverless) mode
- [Developing Kibana in serverless mode](dev_docs/local_setup/developing_kibana_in_serverless.md) for developing Kibana in serverless mode
- [Developing Kibana and Fleet Server simultaneously](dev_docs/local_setup/developing_kibana_and_fleet_server.md) for doing simultaneous Kibana and Fleet Server development
- [Testing agentless integrations](dev_docs/local_setup/agentless.md)

### Running Fleet locally in stateful mode

Prerequisites:
- Fork the Kibana repository and clone it locally
- Install the `node` and `yarn` versions required by `.nvmrc`

Once that is set up, the high level steps are:
- Run Elasticsearch from snapshot
- Configure Kibana settings
- Run Kibana from source
- Enroll a Fleet Server
- Enroll Elastic Agents

#### Running Elasticsearch from snapshot

As detailed in [Running Elasticsearch during development](https://www.elastic.co/guide/en/kibana/current/running-elasticsearch.html), there are different ways to run Elasticsearch when developing Kibana, with snapshot being the most common.

To do this, run the following from the Kibana root folder:
```sh
yarn es snapshot --license trial
```

The `--license trial` flag provides the equivalent of a Platinum license (defaults to Basic).

In addition, it can be useful to set a folder for preserving data between runs (by default, data is stored inside the snapshot and lost on exit) with the `-E path.data=<pathToSavedData>` setting. Common path choices are:
- `../data` (or any other name, e.g. `../mycluster`), which saves the data in the `.es` folder (in the Kibana root folder)
- `/tmp/es-data`

Note: the required API key service and token service (cf. [Security settings in Elasticsearch](https://www.elastic.co/guide/en/elasticsearch/reference/current/security-settings.html)) set by `-E xpack.security.authc.api_key.enabled` and `-E xpack.security.authc.token.enabled` are enabled by default.

Finally, setting up a Fleet Server requires setting the HTTP host to Fleet Server default host with `-E http.host=0.0.0.0`.

The complete command usually looks like:
```sh
yarn es snapshot --license trial -E path.data=../data -E http.host=0.0.0.0
```

#### Configure Kibana settings

Create a `config/kibana.dev.yml` file if you don't have one by copying the existing `config/kibana.yml` file.

To get started, it is recommended to set the following settings:

1\. The URL at which Kibana is available for end users: unless explicitly specified, this path is randomized in dev mode (refer to [Considerations for basepath](https://www.elastic.co/guide/en/kibana/current/development-basepath.html) for details). To set it, add the following to your `kibana.dev.yml`:
```yml
server.basePath: /yourPath
```
where `yourPath` is a path of your choice (e.g. your name; must not end with a slash).

2\. The API version resolution: in dev mode, a version is required for all API requests. In other environements (e.g. production), the version falls back to `oldest` in stateful mode and `newest` in serverless mode for public APIs, while internal APIs always require a version. Set the API version resolution with:
```yml
server.versioned.versionResolution: oldest
```

3\. Fleet logging:
```yml
logging:
  loggers:
    - name: plugins.fleet
      appenders: [console]
      level: debug
```

You can find these settings along with others required to run a Fleet Server and enroll Elastic Agents in the [sample kibana.dev.yml file](dev_docs/local_setup/sample_kibana_dev_yml.md).

#### Run Kibana from source

From the Kibana root folder, bootstrap (install dependencies) and run Kibana with:

```sh
yarn kbn bootstrap && yarn start
```

Once the line "Kibana is now availabe" is logged, you can access Kibana in the browser at localhost:5601/your-base-path and log with the default `elastic` username and the password `changeme`.

As a general rule, it is recommended to run `yarn kbn bootstrap` on branch change. Because merges to `main` are frequent, it is a good idea to run `yarn kbn bootstrap && yarn start` instead of just `yarn start` when frequently pulling latest `main`.

If Kibana fails to start after switching branch or pulling the latest, try clearing caches with `yarn kbn clean` before bootstraping again.

If you are still encountering errors after `yarn kbn clean`, you can try a more aggressive reset with `yarn kbn reset`.

#### Set up a Fleet Server and enroll Elastic Agents

[Fleet Server](https://github.com/elastic/fleet-server) is the component that manages Elastic Agents within Fleet. It needs to be set up in order to enroll Elastic Agents into Fleet and is itself a special instance of Elastic Agent.

This means that developing with enrolled agents requires at least two Elastic Agent instances: a Fleet Server and data shipping agents. As only one instance is allowed per host, the usual method is to run these instances in virtual machines or Docker containers. The [Running a local Fleet Server and enrolling Elastic Agents](dev_docs/local_setup/enrolling_agents.md) guide details this.

Note: if you need to do simultaneous Kibana and Fleet Server development, refer to the [Developing Kibana and Fleet Server simultaneously](dev_docs/local_setup/developing_kibana_and_fleet_server.md) guide

### Tests

#### Unit tests

Kibana primarily uses Jest for unit testing. Each plugin or package defines a `jest.config.js` that extends a preset provided by the `@kbn/test` package. Unless you intend to run all unit tests within the project, you should provide the Jest configuration for Fleet. The following command runs all Fleet unit tests:

```sh
yarn jest --config x-pack/platform/plugins/shared/fleet/jest.config.dev.js
```

You can also run a specific test by passing the filepath as an argument, e.g.:

```sh
yarn jest --config x-pack/platform/plugins/shared/fleet/jest.config.dev.js x-pack/platform/plugins/shared/fleet/common/services/validate_package_policy.test.ts
```

Or alternatively:
```sh
yarn test:jest x-pack/platform/plugins/shared/fleet/common/services/validate_package_policy.test.ts
```

#### API integration tests (stateful)

API integration tests are run using the functional test runner (FTR). When developing or troubleshooting tests, it is convenient to run the server and tests separately as detailed below.

Note: Docker needs to be running to run these tests.

1\. In one terminal, run the server from the Kibana root folder with

   ```sh
   FLEET_PACKAGE_REGISTRY_PORT=12345 yarn test:ftr:server --config x-pack/test/fleet_api_integration/<configFile>
   ```

   where `configFile` is the relevant config file relevant from the following:
   - config.agent.ts
   - config.agent_policy.ts
   - config.epm.ts
   - config.fleet.ts
   - config.package_policy.ts

2\. In a second terminal, run the tests from the Kibana root folder with

   ```sh
   FLEET_PACKAGE_REGISTRY_PORT=12345 yarn test:ftr:runner --config x-pack/test/fleet_api_integration/<configFile>
   ```

   Optionally, you can filter which tests you want to run using `--grep`

   ```sh
   FLEET_PACKAGE_REGISTRY_PORT=12345 yarn test:ftr:runner --config x-pack/test/fleet_api_integration/<configFile> --grep='my filter string'
   ```

Note: you can supply which Docker image to use for the Package Registry via the `FLEET_PACKAGE_REGISTRY_DOCKER_IMAGE` env variable. For example,

```sh
FLEET_PACKAGE_REGISTRY_DOCKER_IMAGE='docker.elastic.co/package-registry/distribution:production' FLEET_PACKAGE_REGISTRY_PORT=12345 yarn test:ftr:runner
```

You can also speed up the tests execution with the `FLEET_SKIP_RUNNING_PACKAGE_REGISTRY=true` flag, which avoids rerunning the package registry each time. Running the tests the first time will output the Docker command for running the package registry.

```bash
FLEET_SKIP_RUNNING_PACKAGE_REGISTRY=true FLEET_PACKAGE_REGISTRY_PORT=12345 yarn test:ftr:runner
```

#### API integration tests (serverless)

The process for running serverless API integration tests is similar to above. Security and observability project types have Fleet enabled. At the time of writing, the same tests exist for Fleet under these two project types.

Security:
```sh
FLEET_PACKAGE_REGISTRY_PORT=12345 yarn test:ftr:server --config x-pack/test_serverless/api_integration/test_suites/security/fleet/config.ts
FLEET_PACKAGE_REGISTRY_PORT=12345 yarn test:ftr:runner --config  x-pack/test_serverless/api_integration/test_suites/security/fleet/config.ts
```

Observability:
```sh
FLEET_PACKAGE_REGISTRY_PORT=12345 yarn test:ftr:server --config x-pack/test_serverless/api_integration/test_suites/observability/fleet/config.ts
FLEET_PACKAGE_REGISTRY_PORT=12345 yarn test:ftr:runner --config  x-pack/test_serverless/api_integration/test_suites/observability/fleet/config.ts
```

#### Cypress tests

We support UI end-to-end testing with Cypress. Refer to [cypress/README.md](./cypress/README.md) for how to run these tests.

#### Jest integration tests

Some features require testing under specific conditions, such as different Kibana configurations or multiple Kibana instances. Jest integration tests allow starting Elasticsearch and Kibana as required for each test.

These tests, however, are slow and difficult to maintain. API integration tests should therefore be preferred whenever possible.

Note: Docker needs to be running to run these tests.

Run the tests from the Kibana root folder with:

```sh
node scripts/jest_integration.js x-pack/platform/plugins/shared/fleet/server/integration_tests/<YOUR_TEST_FILE>
```

Running the tests with [Node Inspector](https://nodejs.org/en/learn/getting-started/debugging) allows inspecting Elasticsearch indices. To do this, add a `debugger;` statement in the test (cf. [Jest documentation](https://jestjs.io/docs/troubleshooting)) and run `node` with `--inspect` or `--inspect-brk`:

```sh
node --inspect scripts/jest_integration.js x-pack/platform/plugins/shared/fleet/server/integration_tests/<YOUR_TEST_FILE>
```

### Storybook

Fleet contains [Storybook](https://storybook.js.org/) stories for developing UI components in isolation. To start the Storybook environment for Fleet, run the following from your `kibana` project root:

```sh
yarn storybook fleet
```

Write stories by creating `.stories.tsx` files colocated with the components you're working on. Consult the [Storybook docs](https://storybook.js.org/docs/react/get-started/introduction) for more information.

## Dependent applications using Fleet

The projects below are dependent on Fleet, most using Fleet API as well. In case of breaking changes in Fleet functionality/API, the project owners have to be notified to make sure they can plan for the necessary changes on their end to avoid unexpected break in functionality.

- [Elastic Agent](https://github.com/elastic/beats/blob/master/x-pack/elastic-agent): uses Fleet API to enroll agents. [Check here](https://github.com/elastic/beats/blob/master/x-pack/elastic-agent/pkg/agent/cmd/container.go)
- [Fleet Server](https://github.com/elastic/fleet-server): uses Fleet API to enroll fleet server [Check here](https://github.com/elastic/fleet-server/blob/master/cmd/fleet/router.go)
- [elastic-package](https://github.com/elastic/elastic-package): command line tool, uses Fleet with docker compose and Fleet API [Check here](https://github.com/elastic/elastic-package/tree/master/internal/kibana)
- [Azure VM extension](https://github.com/elastic/azure-vm-extension): automation tool for Azure VMs, uses Fleet API to enroll agents [Check here](https://github.com/elastic/azure-vm-extension/blob/main/src/handler/windows/scripts/enable.ps1)
- [e2e-testing](https://github.com/elastic/e2e-testing): internal project that runs Fleet and tests Fleet API [Check here](https://github.com/elastic/e2e-testing/tree/main/internal/kibana)
- [observability-test-environments](https://github.com/elastic/observability-test-environments): internal project, uses Fleet API [Check here](https://github.com/elastic/observability-test-environments/blob/master/ansible/tasks-fleet-config.yml)
- [ECK](https://github.com/elastic/cloud-on-k8s): Elastic Cloud on Kubernetes, orchestrates Elastic Stack applications, including Kibana with Fleet (no direct dependency, has examples that include Fleet config) [Check here](https://github.com/elastic/cloud-on-k8s/blob/main/docs/orchestrating-elastic-stack-applications/agent-fleet.asciidoc)
- [APM Server](https://github.com/elastic/apm-server) APM Server, receives data from Elastic APM agents. Using docker compose for testing. [Check here](https://github.com/elastic/apm-server/pull/7227/files)
- [APM Integration Testing](https://github.com/elastic/apm-integration-testing) APM integration testing. [Check here](https://github.com/elastic/apm-integration-testing/blob/53ec49f80bb8dc8175e21e9ac26452fa8c3b7cf0/docker/apm-server/managed/main.go#L188)

## Bundled Packages

Fleet supports shipping integrations as `.zip` archives with Kibana's source code through a concept referred to as _bundled packages_. This allows integrations like APM, which is enabled by default in Cloud, to reliably provide upgrade paths without internet access, and generally improves stability around Fleet's installation/setup processes for several common integrations.

The set of bundled packages included with Kibana is dictated by a top-level `fleet_packages.json` file in the Kibana repo. This file includes a list of packages with a pinned version that Kibana will consider bundled. When the Kibana distributable is built, a [build task](https://github.com/elastic/kibana/blob/main/src/dev/build/tasks/bundle_fleet_packages.ts) will resolve these packages from the Elastic Package Registry, download the appropriate version as a `.zip` archive, and place it in a directory configurable by a `xpack.fleet.bundledPackageLocation` value in `kibana.yml`. By default, these archives are stored in `x-pack/platform/plugins/shared/fleet/.target/bundled_packages/`. In CI/CD, we [override](https://github.com/elastic/kibana/blob/main/x-pack/test/fleet_api_integration/config.base.ts#L19) this default with `/tmp/fleet_bundled_packages`.

Until further automation is added, this `fleet_packages.json` file should be updated as part of the release process to ensure the latest compatible version of each bundled package is included with that Kibana version. **This must be done before the final BC for a release is built.**
Tracking issues should be opened and tracked by the Fleet UI team. See https://github.com/elastic/kibana/issues/129309 as an example.

As part of the bundled package update process, we'll likely also need to update the pinned Docker image that runs in Kibana's test environment. We configure this pinned registry image in

- `x-pack/test/fleet_api_integration/config.ts`
- `x-pack/platform/plugins/shared/fleet/server/integration_tests/helpers/docker_registry_helper.ts`
- `x-pack/test/functional/config.base.js`

To update this registry image, pull the digest SHA from the package storage Jenkins pipeline at https://beats-ci.elastic.co/blue/organizations/jenkins/Ingest-manager%2Fpackage-storage/activity and update the files above. The digest value should appear in the "publish Docker image" step as part of the `docker push` command in the logs.

![image](https://user-images.githubusercontent.com/6766512/171409455-64f9ab1d-08fe-4872-9b74-58359ed938dd.png)
