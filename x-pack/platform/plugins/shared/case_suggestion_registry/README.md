# Case Suggestion Registry

The Case Suggestion Registry plugin provides a centralized mechanism for dynamically discovering relevant Kibana assets based on user or application context. It achieves this by registering and accessing context definitions containing client and server side handlers for finding (server) and displaying (client) these assets.

## Features

- **Client-Side Case Suggestion Management**:

  - Register and retrieve context definitions that include metadata, display information, and React components for rendering.
  - Prevent duplicate registrations by enforcing unique keys for each context.

- **Server-Side Case Suggestion Management**:

  - Register and retrieve context definitions that include tools and handlers for server-side operations.
  - Manage tools and handlers associated with specific context types, ensuring no duplicate registrations.

- **Context-Based Asset Discovery**:
  - Define handlers that can process a given context and return relevant Kibana assets.
  - Simplify the process of dynamically finding and displaying assets based on user or application context.

## Client-Side API

### `CaseSuggestionRegistryPublic`

The `CaseSuggestionRegistryPublic` class allows you to register and retrieve context definitions on the client side.

#### Methods

- `registerHandler(contextDefinition: CaseSuggestionDefinitionPublic): void`

  - Registers a new context definition. Throws an error if the key is already registered.

- `getCaseSuggestionByKey(key: string): CaseSuggestionDefinitionPublic | undefined`

  - Retrieves a context definition by its key. Throws an error if the key does not exist.

- `getAll(): CaseSuggestionDefinitionPublic[]`
  - Retrieves all registered context definitions.

#### Example

```typescript
const registry = new CaseSuggestionRegistryPublic();

const context = {
  key: 'example-context',
  displayName: 'Example suggestion',
  description: 'An example context for demonstration purposes.',
  children: React.lazy(() =>
    Promise.resolve({
      default: () => <div>Example</div>,
    })
  ),
};

registry.registerHandler(context);
console.log(registry.getCaseSuggestionByKey('example-context'));
```

## Server-Side API

### `CaseSuggestionRegistryServer`

The `CaseSuggestionRegistryServer` class allows you to register and retrieve context definitions on the server side.

#### Methods

- `register(contextDefinition: CaseSuggestionDefinitionServer): void`

  - Registers a new context definition. Throws an error if the key, tool, or handler is already registered.

- `get(type: string): CaseSuggestionDefinitionServer | undefined`

  - Retrieves a context definition by its type. Returns `undefined` if the type does not exist.

- `getTool(toolName: string): ToolDefinition | undefined`

  - Retrieves a tool definition by its name. Returns `undefined` if the tool does not exist.

- `getToolHandler(handlerName: string): CaseSuggestionHandler | undefined`

  - Retrieves a handler by its name. Returns `undefined` if the handler does not exist.

- `getCaseSuggestionByKey({ key, handlerName, context }: { key: string; handlerName?: string; context: CaseSuggestionRequest }): Promise<CaseSuggestionResponse[]>`

  - Retrieves context data for a specific key. Optionally, a specific handler can be specified. Throws an error if the key or handler does not exist.

#### Example

```typescript
const registry = new CaseSuggestionRegistryServer(logger);

const context = {
  key: 'example-context',
  tools: {
    exampleTool: { name: 'Example Tool', description: 'A tool for demonstration.' },
  },
  handlers: {
    exampleHandler: async (params) => {
      return { data: { result: 'Handled' } };
    },
  },
};

registry.register(context);
console.log(
  await registry.getCaseSuggestionByKey({
    key: 'example-context',
    context: { timeRange: { from: 'now-1h', to: 'now' } },
  })
);
```

## Use Cases

- Centralized management of contexts for both client and server environments.
- Avoiding duplicate registrations of contexts, tools, or handlers.
- Simplifying the retrieval and usage of context-related data and functionality.
- Dynamically finding and displaying relevant Kibana assets based on the provided context.
