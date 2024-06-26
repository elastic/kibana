# @kbn/elastic-assistant-agents

Package for defining a common 'agent interface' for use in the Observability/Security AI Assistants, within the Search Playground, or anywhere within Kibana server code where common LLM-backed tasks are needed.

In the context of building conversational UI's, or LLM-backed features like Contextual Insights and Attack Discovery, an 'agent' is defined as a function that takes an input query (or set of messages), some default dependencies, and returns a string response. This interface closely resembles function or tool definitions as used when making requests to LLMs.

The reference agent presented in this package is the `esql-query-gen-agent`, which can be used to generate ESQL queries from a natural language input.

The first revision of this interface is an extraction of common dependencies used by the Observability Assistant's [`query`](https://github.com/elastic/kibana/blob/4fc13a4a586db2b3cc351e6a3d87f2c6471c5a55/x-pack/plugins/observability_solution/observability_ai_assistant_app/server/functions/query/index.ts#L73) function, and the Security Assistant's [`esql-knowledge-base-tool`](https://github.com/elastic/kibana/blob/e2e1fb350464b94a0ebb691db04d16d5badd4ef1/x-pack/plugins/security_solution/server/assistant/tools/esql_language_knowledge_base/esql_language_knowledge_base_tool.ts#L37).


### Observability `registerQueryFunction` dependencies:

Top level in-plugin registration via:

```ts
export const registerFunctions = async (registrationParameters: FunctionRegistrationParameters) => {}
```
with dependency chain:

``` ts
export type FunctionRegistrationParameters = Omit<
  Parameters<RegistrationCallback>[0],
  'registerContext' | 'hasFunction'
> & { pluginsStart: ObservabilityAIAssistantAppPluginStartDependencies };

/////

// Main entry point interface: see `observability_ai_assistant_app/server/functions/index.ts`
export type RegistrationCallback = ({}: {
  signal: AbortSignal; // unused
  resources: RespondFunctionResources;
  client: ObservabilityAIAssistantClient; // unused
  functions: ChatFunctionClient;
}) => Promise<void>;

/////

export type RespondFunctionResources = Pick<
  ObservabilityAIAssistantRouteHandlerResources,
  'context' | 'logger' | 'plugins' | 'request'
>;

/////

export class ChatFunctionClient {
  registerFunction: RegisterFunction = (definition, respond) => {;
  registerInstruction: RegisterInstruction = (instruction) => {};
  validate(name: string, parameters: unknown) {}
  getInstructions(): RegisteredInstruction[] {}
  hasAction(name: string) {}
  getFunctions({ filter }: { filter?: string; } = {}): FunctionHandler[] {}
  getActions() {}
  hasFunction(name: string): boolean {}
  async executeFunction({ chat, name, args, messages, signal }: {
    chat: FunctionCallChatFunction;
    name: string;
    args: string | undefined;
    messages: Message[];
    signal: AbortSignal;
  }): Promise<FunctionResponse> {}
}
```

With main public interface for registration through `ChatFunctionClient`, by means of `registerFunction`, with input interface:

```ts
export interface FunctionDefinition<TParameters extends CompatibleJSONSchema = any> {
  name: string;
  description: string;
  visibility?: FunctionVisibility;
  descriptionForUser?: string;
  parameters?: TParameters;
}
```

### Security `esql-knowledge-base-tool` tool dependencies:

Main public interface for registration is through `pluginStart` via 
```
registerTools: (pluginName: string, tools: AssistantTool[]) => void;
```

With top-level `AssistantTool` interface defined as:

```ts
export interface AssistantTool {
  id: string;
  name: string;
  description: string;
  sourceRegister: string;
  isSupported: (params: AssistantToolParams) => boolean;
  getTool: (params: AssistantToolParams) => Tool | DynamicStructuredTool | null;
}
```

and params provided to tools for execution:

```ts
export interface AssistantToolParams {
  alertsIndexPattern?: string;
  anonymizationFields?: AnonymizationFieldResponse[];
  isEnabledKnowledgeBase: boolean;
  chain?: RetrievalQAChain;
  esClient: ElasticsearchClient;
  kbDataClient?: AIAssistantKnowledgeBaseDataClient;
  langChainTimeout?: number;
  llm?: ActionsClientLlm | ActionsClientChatOpenAI | ActionsClientSimpleChatModel;
  logger: Logger;
  modelExists: boolean;
  onNewReplacements?: (newReplacements: Replacements) => void;
  replacements?: Replacements;
  request: KibanaRequest<
    unknown,
    unknown,
    ExecuteConnectorRequestBody | AttackDiscoveryPostRequestBody
  >;
  size?: number;
}
```


## Interface Overview

The Observability in-plugin `registerFunctions()` function (which is responsible for registering the esql query generation behavior), provides a swathe of dependencies, however actual usage falls mostly in line with the public API of the `ChatFunctionsClient`, with `resources` only providing access to a scoped `esClient` and `logger`. The public `registerFunction()` method of `ChatFunctionsClient` handles the function definition, json schema, and any additional arguments. 

On the Security side, the same publicly exposed `registerTools()` function is used for registering the `esql-knowledge-base-tool`, and makes available a hodgepodge of dependencies (mostly optional) via the `AssistantToolParams` defined above, with the `getTool` callback encapsulating the zod schema definition by means of the LangChain `Tool | DynamicStructuredTool` abstractions.

### Interface Commonalities

Between the two, we have common function/tool declaration fields, like `id`, `name`, and `description`, some differing descriptor fields like `visibility`, `isSupported` and `sourceRegister` (registering plugin), and then the generic params needed by the function/tool, like `esClients`, the `Kibana Request`, and abstractions for making requests to the LLM. 

Note: Generic params are mostly made available via each implementation's provided callbacks, either the `respond` callback when registering the function with the Observability Assistant, or the `getTool` callback when registering with Security Assistant.

---

### Proposed common interface:

```ts
export interface AgentInterface {
  id: string;
  name: string;
  description: string;
  visibility?: FunctionVisibility;
  isSupported?: (params: AssistantToolParams) => boolean;
  sourceRegister?: string;
  execute: (params: AgentParams) => Promise<AgentResponse>;
}

export interface AgentParams {
  esClient: ElasticsearchClient;
  logger: Logger;
  request: KibanaRequest<unknown, unknown, unknown>;
  // Additional parameters can be added as needed
}

export interface AgentResponse {
  // Define the structure of the function response
}
```