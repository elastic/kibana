# @kbn/isomer

Kibana's host for [Isomer](https://github.com/elastic/isomer): one declarative composition rendered to React, HTML, Markdown, text and Slack Block Kit.

Kibana code imports Isomer through this package rather than from `@elastic/isomer-*` directly. `createKibanaIsomerRuntime` takes the primitive packs to compose and applies Kibana defaults.

The runtime imports `react-dom/server`, so browser code must load it lazily.
