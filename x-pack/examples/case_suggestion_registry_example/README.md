# Case Suggestion Registry Example

This example demonstrates how to use the Case Suggestion Registry plugin to register and consume case suggestion definitions in Kibana

## Running the Example Plugin

To run this example plugin, use the following command:

```bash
yarn start --run-examples
```

Ensure that you have the necessary dependencies installed and that your development environment is set up for Kibana.

## Overview

This example showcases:

- How to register a case suggestion definition using the `CaseSuggestionRegistryPlugin`.
- How to create custom case suggestion handlers for fetching and displaying data.
- How to use React components to render the discovered suggestion in the UI.

## Key Files

- **Public Case Suggestion Definition**: [`public/example_suggestion/case_suggestion_definition.tsx`](./public/example_suggestion/case_suggestion_definition.tsx)

  - Defines the case suggestion key and lazy-loaded React components for rendering the suggestion.

- **Public Case Suggestion Children Component**: [`public/example_suggestion/case_suggestion_children.tsx`](./public/example_suggestion/case_suggestion_children.tsx)

  - A React component that displays details about synthetics monitors retrieved via the case suggestion registry. It uses the `caseSuggestion` prop to render monitor details dynamically.

- **Server Case Suggestion Definition**: [`server/example_suggestion/case_suggestion_definition.ts`](./server/example_suggestion/case_suggestion_definition.ts)

  - Registers server-side suggestion handlers and defines tools for processing suggestion requests. It includes logic to handle missing parameters gracefully.

- **Server Handlers**: [`server/example_suggestion/handlers.ts`](./server/example_suggestion/handlers.ts)

  - Implements the logic for fetching and processing suggestion data. The handler uses mocked data to simulate fetching synthetics monitor information.

- **Server Plugin**: [`server/plugin.ts`](./server/plugin.ts)

  - Demonstrates how to register server-side suggestion definitions and expose an API endpoint for retrieving suggestions.

## Example Use Case

The example plugin demonstrates how to fetch and display synthetics monitor data for use as a suggestion on the cases view based on a provided service name and time range from the case context.

## Additional Information

For more details on the Case Suggestion Registry plugin, refer to the [Case Suggestion Registry README](../../platform/plugins/shared/case_suggestion_registry/README.md).
