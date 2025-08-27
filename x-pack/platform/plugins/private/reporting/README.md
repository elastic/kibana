# Kibana Reporting Plugin

This plugin provides reporting capabilities for Kibana. Combined with integration code from Kibana applications, users can generate reports of various types of content, such as visualizations, dashboards, and Discover sessions.

## csv_v2. 
This new endpoint is designed to have a more automation-friendly signature. It will replace csv_searchsource in the UI at some point, when there is more capacity in reporting. It will need a little more work to have parity: it needs to be able to export "unsaved" searches.

## csv_searchsource. 
This is the deprecated endpoint that is no longer used in the Discover UI. It exists in the code for backwards compatibility, as automated reports may still be using it.

## Generate CSV
Although historically related to reporting, the CsvGenerator class has now be moved into its own package `@kbn/generate-csv`. 

## Serverless configuration
There are several improvements made for reporting in serverless environments. Most changes are reflected in `reporting/server/config/schema.ts` for reference. 

PNG and PDF reports are currently not possible in serverless. Those export types are not enabled in serverless configuration, and are left out of Reporting's internal registry of export types.
