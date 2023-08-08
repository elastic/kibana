# @kbn/elastic-assistant

The `Elastic Assistant` is a user interface for interacting with generative AIs, like `ChatGPT`.

This package provides:

- Components for rendering the `Elastic Assistant`
- Hooks for passing context (for example, fields in an alert) to the `Elastic Assistant`, enabling users to include this content in their queries

## Maintainers

Maintained by the Security Solution team

## Running unit tests with code coverage

To (interactively) run unit tests with code coverage, run the following command:

```sh
cd $KIBANA_HOME && node scripts/jest --watch x-pack/packages/kbn-elastic-assistant --coverage
```
