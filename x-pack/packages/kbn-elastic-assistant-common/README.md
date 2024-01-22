# @kbn/elastic-assistant-common

This package provides common code consumed in both the browser, i.e. the
`packages/kbn-elastic-assistant` package, and on the server, i.e. the
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
