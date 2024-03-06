### Feature Capabilities

Feature capabilities are an object describing specific capabilities of the assistant, like whether a feature like streaming is enabled, and are defined in the sibling `./index.ts` file within this `kbn-elastic-assistant-common` package. These capabilities can be registered for a given plugin through the assistant server, and so do not need to be plumbed through the `ElasticAssistantProvider`.

Storage and accessor functions are made available via the `AppContextService`, and exposed to clients via the`/internal/elastic_assistant/capabilities` route, which can be fetched by clients using the `useCapabilities()` UI hook.

### Registering Capabilities

To register a capability on plugin start, add the following in the consuming plugin's `start()`, specifying any number of capabilities you would like to explicitly declare:

```ts
plugins.elasticAssistant.registerFeatures(APP_UI_ID, {
  assistantModelEvaluation: config.experimentalFeatures.assistantModelEvaluation,
  assistantStreamingEnabled: config.experimentalFeatures.assistantStreamingEnabled,
});
```

### Declaring Feature Capabilities
Default feature capabilities are declared in `x-pack/packages/kbn-elastic-assistant-common/impl/capabilities/index.ts`:

```ts
export type AssistantFeatures = { [K in keyof typeof defaultAssistantFeatures]: boolean };

export const defaultAssistantFeatures = Object.freeze({
  assistantModelEvaluation: false,
  assistantStreamingEnabled: false,
});
```

### Using Capabilities Client Side
Capabilities can be fetched client side using the `useCapabilities()` hook ala:

```ts
const { data: capabilities } = useCapabilities({ http, toasts });
const { assistantModelEvaluation: modelEvaluatorEnabled, assistantStreamingEnabled } = capabilities ?? defaultAssistantFeatures;
```

### Using Capabilities Server Side
Or server side within a route (or elsewhere) via the `assistantContext`:

```ts
const assistantContext = await context.elasticAssistant;
const pluginName = getPluginNameFromRequest({ request, logger });
const registeredFeatures = assistantContext.getRegisteredFeatures(pluginName);
if (!registeredFeatures.assistantModelEvaluation) {
  return response.notFound();
}
```

> [!NOTE]
> Note, just as with [registering arbitrary tools](https://github.com/elastic/kibana/pull/172234), features are registered for a specific plugin, where the plugin name that corresponds to your application is defined in the `x-kbn-context` header of requests made from your application, which may be different than your plugin's registered `APP_ID`.
