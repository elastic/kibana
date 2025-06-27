# Input Packages

Input packages are a specific type of integrations available since version 8.8.0.

Github issue: https://github.com/elastic/kibana/issues/133296

Design Document: https://docs.google.com/document/d/1vzBh2frnlxEBBcab8-ist8pu_PDZUjOHdsV-QuUn_WA/edit

## Background

To enable the collection, transformation, and analysis of data flowing between elasticsearch and an external data source, a user needs a bunch of components including agent configuration, inputs, ingest pipelines, data streams, index templates, visualizations, etc. When these assets and their definitions are encapsulated together, we call it a package.

Until `input` packages, there used to be only one type of package - `integration`. An input-type package is composed of only an input and agent configuration. These packages leave all other assets for users to define and are very generic intentionally.

An example of an input package is the `logs` package.

## Summary

Input-type packages only define the input, allowing the user to create the data stream dynamically.

The only way a user can customize an `input` type package is by specifying a new or existing dataset to send the data to.
- To allow this, these packages include the `data_stream.dataset` variable definition in their package spec
- They can only have one datastream (as opposed to multiple ones for integration-type packages)

Another important difference with integration-type packages is that Kibana creates the assets (index and component templates, ingest pipelines etc) at integration policy creation time (as opposed to at package install time).

There are also some key differences regarding the generated assets:

- They are tied to the policy: if the integration is installed without generating a policy those assets are empty.
- They are only created if the user selects a datastream which doesn't yet exist.

In Fleet code it's possible to find the related code by searching for `packageInfo.type === 'input'` or similar queries.

### UI dataset selector

The dataset selector in the UI shows the user all available datasets to send to or gives the option to send to a new datastream.

To get all available datastream Fleet uses the datastreams API which returns all Fleet "managed" datastreams, detected using the datastream metadata. This is why all a users datastreams will not show in this selector.

## Package structure

An input-type package expects the following structure:
```
├── agent/input
│   └── input.yml.hbs
├── changelog.yml
├── docs
│   └── README.md
├── fields
│   └── input.yml
├── img
│   └── input-logo.svg
└── manifest.yml
```
1. File `manifest.yml` describes the properties of the package, similarly to the `integration` type, including a policy template, and all Beats input options.
    - type: input
    - File `input.yml` contains definitions of fields set by the input, generic ones, and unrelated to the processed data.

2. File `input.yml.hbs` is a template used to build the agent’s policy.
    - It needs to include if-conditions for all Beats input options.
    - It will accept a special configuration for extra Beats processors. For example: to strip some fields on the agent level before passing to the ingest pipeline.
3. Files `changelog.yml`, `docs/*`, `img/*` are the same as for `integration` type packages.

## FAQ

### Why don't input packages allow assets e.g dashboards to be defined?

Because input packages allow dataset to be configured, the data could end up anywhere. Therefore a dashboard would not know where to point to fetch their data. This isn't an impossible problem to solve but this is the reason input packages don't currently allow assets.
