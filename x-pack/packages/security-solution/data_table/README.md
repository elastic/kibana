# Security Solutions's Data Table

## Motivation

The idea behind this package is to have a reusable data table component, embedding the features
available to alerts table in security solution plugin.

## How to use this

Standalone examples will follow. In the meantime:

Consult the following file to get the idea of what is necessary to reuse the component

`x-pack/plugins/security_solution/public/common/components/events_viewer/index.tsx`

The following file:
`kibana/x-pack/plugins/security_solution/public/common/store/reducer.ts`

showcases the redux store setup for the package.

## The most important public api members

- DataTableComponent itself
- dataTableReducer

### Extras

Be sure to check out provided helpers

## Storybook

General look of the component can be checked visually running the following storybook:
`yarn storybook security_solution_data_table`

Note that all the interactions are mocked.