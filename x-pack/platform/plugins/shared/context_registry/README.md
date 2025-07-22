# Context Registry

The Context Registry plugin provides a centralized mechanism for managing and accessing context definitions in both the client and server environments. Its primary purpose is to register handlers and tools for finding and displaying relevant Kibana assets based on context.

## Features

- **Client-Side Context Management**:

  - Register and retrieve context definitions that include metadata, display information, and React components for rendering.
  - Prevent duplicate registrations by enforcing unique keys for each context.

- **Server-Side Context Management**:

  - Register and retrieve context definitions that include tools and handlers for server-side operations.
  - Manage tools and handlers associated with specific context types, ensuring no duplicate registrations.

- **Context-Based Asset Discovery**:
  - Define handlers that can process a given context and return relevant Kibana assets.
  - Simplify the process of dynamically finding and displaying assets based on user or application context.

## Client-Side API

### `ContextRegistryPublic`

The `ContextRegistryPublic` class allows you to register and retrieve context definitions on the client side.

#### Methods

- `register(contextDefinition: ContextDefinitionPublic): void`

  - Registers a new context definition. Throws an error if the key is already registered.

- `get(key: string): ContextDefinitionPublic | undefined`

  - Retrieves a context definition by its key. Returns `undefined` if the key does not exist.

- `getAll(): ContextDefinitionPublic[]`
  - Retrieves all registered context definitions.

#### Example

```typescript
const registry = new ContextRegistryPublic();

const context = {
  key: 'example-context',
  displayName: 'Example Context',
  description: 'An example context for demonstration purposes.',
  children: React.lazy(() =>
    Promise.resolve({
      default: () => <div>Example</div>,
    })
  ),
};

registry.register(context);
console.log(registry.get('example-context'));
```

## Server-Side API

### `ContextRegistryServer`

The `ContextRegistryServer` class allows you to register and retrieve context definitions on the server side.

#### Methods

- `register(contextDefinition: ContextDefinitionServer): void`

  - Registers a new context definition. Throws an error if the key, tool, or handler is already registered.

- `get(type: string): ContextDefinitionServer | undefined`

  - Retrieves a context definition by its type. Returns `undefined` if the type does not exist.

- `getTool(toolName: string): ToolDefinition | undefined`

  - Retrieves a tool definition by its name. Returns `undefined` if the tool does not exist.

- `getToolHandler(handlerName: string): ContextHandler | undefined`
  - Retrieves a handler by its name. Returns `undefined` if the handler does not exist.

#### Example

```typescript
const registry = new ContextRegistryServer();

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
console.log(registry.get('example-context'));
```

## Use Cases

- Centralized management of contexts for both client and server environments.
- Avoiding duplicate registrations of contexts, tools, or handlers.
- Simplifying the retrieval and usage of context-related data and functionality.
- Dynamically finding and displaying relevant Kibana assets based on the provided context.

## License

This plugin is licensed under the Elastic License 2.0.
