# Context Registry Example

This example demonstrates how to use the Context Registry plugin to register and consume context definitions in Kibana.

## Running the Example Plugin

To run this example plugin, use the following command:

```bash
yarn start --run-examples
```

Ensure that you have the necessary dependencies installed and that your development environment is set up for Kibana.

## Overview

This example showcases:

- How to register a context definition using the `ContextRegistryPlugin`.
- How to create custom context handlers for fetching and displaying data.
- How to use React components to render context data in the UI.

## Key Files

- **Public Context Definition**: [`public/example_context/context_definition.tsx`](./public/example_context/context_definition.tsx)

  - Defines the context key and lazy-loaded React components for rendering context data.

- **Public Context Children Component**: [`public/example_context/context_children.tsx`](./public/example_context/context_children.tsx)

  - A React component that displays details about synthetics monitors retrieved via the context registry. It uses the `context` prop to render monitor details dynamically.

- **Server Context Definition**: [`server/example_context/context_definition.ts`](./server/example_context/context_definition.ts)

  - Registers server-side context handlers and defines tools for processing context requests. It includes logic to handle missing parameters gracefully.

- **Server Context Handlers**: [`server/example_context/handlers.ts`](./server/example_context/handlers.ts)

  - Implements the logic for fetching and processing context data. The handler uses mocked data to simulate fetching synthetics monitor information.

- **Server Plugin**: [`server/plugin.ts`](./server/plugin.ts)

  - Demonstrates how to register server-side context definitions and expose an API endpoint for retrieving context data.

## Example Use Case

The example plugin demonstrates how to fetch and display synthetics monitor data based on a provided service name and time range. The context registry is used to define and handle this context, making it reusable across Kibana. The server-side logic includes mocked data to simplify the demonstration.

## Additional Information

For more details on the Context Registry plugin, refer to the [Context Registry README](../../platform/plugins/shared/context_registry/README.md).
