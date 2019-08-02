# The `infra` plugin

This is the home of the `infra` plugin, which aims to provide a solution for
the infrastructure monitoring use-case within Kibana.

## UI Structure

The plugin provides two main apps in Kibana - the *Infrastructure UI* and the
*Logs UI*. Both are reachable via their own main navigation items and via links
from other parts of Kibana.

The *Infrastructure UI* consists of three main screens, which are the
*Inventory*, the *Node details* and the *Metrics explorer*.

The *Logs UI* provides one log viewer screen.

## Communicating

In order to address the whole infrastructure monitoring team, the
@elastic/infra-logs-ui team alias can be used as a mention or in review
requests.

The [Infrastructure forum] and [Logs forum] on Discuss are frequented by the
team as well.

## Contributing

Since the `infra` plugin lives within the Kibana repository, [Kibana's
contribution procedures](../../../CONTRIBUTING.md) apply. In addition to that,
this section details a few plugin-specific aspects.

### Ingesting metrics for development

The *Infrastructure UI* displays [ECS]-compatible metric data from indices
matching the `metricbeat-*` pattern by default. The primary way to ingest these
is by running [Metricbeat] to deliver metrics to the development Elasticsearch
cluster. It can be used to ingest development host metrics using the `system`
module.

A setup that ingests docker and nginx metrics is described in
[./docs/test_setups/infra_metricbeat_docker_nginx.md].

### Ingesting logs for development

Similarly, the *Logs UI* assumes [ECS]-compatible log data to be present in
indices matching the `filebeat-*` pattern. At the time of writing the minimum
required fields are `@timestamp` and `message`, but the presence of other [ECS]
fields enable additional functionality such as linking to and from other
solutions.

The primary way to ingest such log data is via [Filebeat]. A convenient source
of log entries are the Kibana and Elasticsearch log files produced by the
development environment itself. These can easily be consumed by enabling the modules

```
$ filebeat modules enable elasticsearch
$ filebeat modules enable kibana
```

and then editing the `modules.d/elasticsearch.yml` and `modules.d/kibana.yml`
to change the `var.paths` settings to contain paths to the development
environment's log files, e.g.:

```
- module: elasticsearch
  server:
    enabled: true
    var.paths:
      - "${WORK_ENVIRONMENT}/kibana/.es/8.0.0/logs/elasticsearch_server.json"
    var.convert_timezone: true
```

### Creating PRs

As with all of Kibana, we welcome contributions from everyone. The usual
life-cycle of a PR looks like the following:

1. **Create draft PR**: To make ongoing work visible, we recommend creating
   [draft PRs] as soon as possible. PRs are usually targetted at `master` and
   backported later. The checklist in the PR description template can be used
   to guide the progress of the PR.
2. **Label the PR**: To ensure that a newly created PR gets the attention of
   the @elastic/infra-logs-ui team, the following label should be applied to
   PRs:
   * `Team:infra-logs-ui`
   * `Feature:Infra UI` if it relates to the *Intrastructure UI*
   * `Feature:Logs UI` if it relates to the *Logs UI*
   * `[zube]: In Progress` to track the stage of the PR
   * Version labels for merge and backport targets (see [Kibana's contribution
     procedures]), usually:
     * the version that `master` currently represents
     * the version of the next minor release
   * Release note labels (see [Kibana's contribution procedures])
     * `release_note:enhancement` if the PR contains a new feature or enhancement
     * `release_note:fix` if the PR contains an external-facing fix
     * `release_note:breaking` if the PR contains a breaking change
     * `release_note:deprecation` if the PR contains deprecations of publicly
       documented features.
     * `release_note:skip` if the PR contains only house-keeping changes, fixes
       to unreleased code or documentation changes
3. **Satisfy CI**: The PR will automatically be picked up by the CI system,
   which will run the full test suite as well as some additional checks. A
   comment containing `jenkins, test this` can be used to manually trigger a CI
   run. The result will be reported on the PR itself. Out of courtesy for the
   reviewers the checks should pass before requesting reviews.
4. **Request reviews**: Once the PR is ready for reviews it can be marked as
   such by [changing the PR state to ready].  In addition the label `[zube]: In
   Progress` should be replaced with `[zube]: In Review` and `review`. If the
   GitHub automation doesn't automatically request a review from
   `@elastic/infra-logs-ui` it should be requested manually.
5. **Incorporate review feedback**: Usually one reviewer's approval is
   sufficient. Particularly complicated or cross-cutting concerns might warrant
   multiple reviewers.
6. **Merge**: Once CI is green and the reviewers are approve, PRs in the Kibana
   repo are "squash-merged" to `master` to keep the history clean.
7. **Backport**: After merging to `master`, the PR is backported to the
   branches that represent the versions indicated by the labels. The `yarn
   backport` command can be used to automate most of the process.

There are always exceptions to the rule, so seeking guidance about any of the
steps is highly recommended.

[Kibana's contribution procedures]: ../../../CONTRIBUTING.md
[Infrastructure forum]: https://discuss.elastic.co/c/infrastructure
[Logs forum]: https://discuss.elastic.co/c/logs
[ECS]: https://github.com/elastic/ecs/
[Metricbeat]: https://www.elastic.co/products/beats/metricbeat
[Filebeat]: https://www.elastic.co/products/beats/filebeat
[draft PRs]: https://help.github.com/en/articles/about-pull-requests#draft-pull-requests
[changing the PR state to ready]: https://help.github.com/en/articles/changing-the-stage-of-a-pull-request
