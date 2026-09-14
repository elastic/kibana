# Kibana Reporting

An awesome Kibana reporting plugin

## csv_searchsource.

This is the endpoint used in the Discover UI. It must be replaced by csv_v2 at some point, when we have more capacity in reporting. https://github.com/elastic/kibana/issues/151190

## csv_v2.

This new endpoint is designed to have a more automation-friendly signature. It will replace csv_searchsource in the UI at some point, when there is more capacity in reporting. It will need a little more work to have parity: it needs to be able to export "unsaved" searches.

## Generate CSV

Although historically related to reporting, the CsvGenerator class has now be moved into its own package `@kbn/generate-csv`.

## Serverless configuration

Serverless defaults live in `@kbn/reporting-server` (`config_schema.ts`). CSV is enabled. PDF and PNG are disabled (`export_types.{pdf,png}.enabled: false`) and are not registered. `xpack.screenshotting.enabled` is `false` in `config/serverless.yml`. Users and Support cannot turn screenshot reporting on.

Current Serverless capability by surface:

| Surface                                     | Generate      | Schedule |
| ------------------------------------------- | ------------- | -------- |
| Discover CSV                                | Yes           | Yes      |
| Lens CSV                                    | Download only | No       |
| Dashboard / Lens / visualization PDF or PNG | No            | No       |
| Dashboard JSON                              | Yes           | n/a      |

`Schedule export` is shown only when a schedulable export type is registered for that object. On Serverless dashboards that means the action is hidden. Discover still offers it for CSV.
