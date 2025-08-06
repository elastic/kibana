# Case Suggestion Example

This example demonstrates how to use the Cases plugin to register a case suggestions in Kibana.

## Background

A case suggestion is a suggested attachment that appears on the Case Details page. These attachments are suggested based on how relevant they are to the existing content of the case. To allow for discovering relevant attachments, client-side and server-side handlers can be registered via the Cases plugin's attachment framework. Server side handlers are responsible for receiving some context about the case and returning a relevant Kibana asset if possible. Client-side handlers are responsible for defining custom UI components that can be rendered when the suggestion is presented to the user.

This plugin provides a generic, simplified example of how these pieces works together.

## Running the Example Plugin

To run this example plugin, use the following command:

```bash
yarn start --run-examples
```

Ensure that you have the necessary dependencies installed and that your development environment is set up for Kibana.

## Overview

This example showcases:

- How to register a case suggestion definition via the Cases plugin's attachment framework.
- How to specify custom case suggestion handlers for fetching the relevant data data, on the client-side.
- How to specifcy custom React components to render for the discovered suggestion in the UI, on the server-side d.

## Key Files

- **Server Plugin**: [`server/plugin.ts`](./server/plugin.ts)

  - Demonstrates how to register server-side suggestion definitions.

- **Server Case Suggestion Definition**: [`server/example_suggestion/case_suggestion_definition.ts`](./server/example_suggestion/case_suggestion_definition.ts)

  - Registers server-side suggestion handlers and defines tools for processing suggestion requests by an LLM. It includes logic to handle missing parameters gracefully.

- **Server Handlers**: [`server/example_suggestion/handlers.ts`](./server/example_suggestion/handlers.ts)

  - Implements the logic for fetching and formatting suggestion data, including the associated attachment. The handler uses mocked data to simulate fetching synthetics monitor information, as an example.

- **Public Plugin** [`server/plugin.ts`](./server/plugin.ts)

  - Demonstrates how to register client-side suggestion.

- **Public Case Suggestion Definition**: [`public/example_suggestion/case_suggestion_definition.tsx`](./public/example_suggestion/case_suggestion_definition.tsx)

  - Defines the case suggestion id and lazy-loaded React components for rendering the suggestion.

- **Public Case Suggestion Children Component**: [`public/example_suggestion/case_suggestion_children.tsx`](./public/example_suggestion/case_suggestion_children.tsx)

  - A React component that displays details about synthetics monitors retrieved via the case suggestion registry. It uses the `suggestion` prop to render monitor details related to the suggestion dynamically.

## Example Use Case

The example plugin demonstrates how to fetch and display synthetics monitor data for use as a suggestion on the cases view based on a provided service name and time range from the case context.
