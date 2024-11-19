# @kbn/elastic-assistant-common

This package provides common code consumed in both the browser, i.e. the
`packages/kbn-elastic-assistant` package and `plugins/security_solution` plugin, and on the server, i.e. the
`plugins/elastic_assistant` plugin.

For example, the data anonymization functions exported by this package
are be used in both the browser, and on the server.

## Maintainers

Maintained by the Security Solution team

## Running unit tests with code coverage

To (interactively) run unit tests with code coverage, run the following command:

```sh
cd $KIBANA_HOME && node scripts/jest --watch x-pack/packages/kbn-elastic-assistant-common --coverage
```

## OpenAPI Codegen

Implemented using the new OpenAPI codegen and bundle packages:
* Includes OpenAPI codegen script and CI action as detailed in: https://github.com/elastic/kibana/pull/166269
* Includes OpenAPI docs bundling script as detailed in: https://github.com/elastic/kibana/pull/171526

To run codegen/bundling locally, cd to `x-pack/packages/kbn-elastic-assistant-common/` and run any of the following commands:

```bash
yarn openapi:generate
yarn openapi:generate:debug
yarn openapi:bundle
```

Codegen is configured to run on CI by means of the `.buildkite/scripts/steps/code_generation/elastic_assistant_codegen.sh` script, which is run as part of the `checks` pipeline, and is registered in `.buildkite/scripts/steps/checks.sh`.
