# LLM Tasks plugin

This plugin contains various LLM tasks.

## Retrieve documentation

This task allows to retrieve documents from our Elastic product documentation.

The task depends on the `product-doc-base` plugin, as this dependency is used
to install and manage the product documentation.

### Checking if the task is available

A `retrieveDocumentationAvailable` API is exposed from the start contract, that
should be used to assert that the `retrieve_doc` task can be used in the current
context.

That API receive the inbound request as parameter.

Example:
```ts
if (await llmTasksStart.retrieveDocumentationAvailable({ request })) {
  // task is available
} else {
  // task is not available
}
```

### Executing the task

The task is executed as an API of the plugin's start contract, and can be invoked
as any other lifecycle API would.

Example:
```ts
const result = await llmTasksStart.retrieveDocumentation({
  searchTerm: "How to create a space in Kibana?",
  request,
  connectorId: 'my-connector-id',
});

const { success, documents } = result;
```

The exhaustive list of options for the task is available on the `RetrieveDocumentationParams` type's TS doc.
