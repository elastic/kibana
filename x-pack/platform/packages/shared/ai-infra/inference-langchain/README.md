# @kbn/inference-langchain

This package exposes utilities to use the inference APIs and plugin with langchain

## InferenceChatModel

The inference chat model is a langchain model leveraging the inference APIs under the hood.

The main upside is that the unification and normalization layers are then fully handled
by the inference plugin. The developer / consumer doesn't even need to know which provider
is being used under the hood.

The easiest way to create an `InferenceChatModel` is by using the inference APIs:

```ts
const chatModel = await inferenceStart.getChatModel({
  request,
  connectorId: myInferenceConnectorId,
  chatModelOptions: {
    temperature: 0.2,
  },
});

// just use it as another langchain chatModel
```

But the chatModel can also be instantiated directly if needed:

```ts
import { connectorToInference } from '@kbn/inference-common';

const chatModel = new InferenceChatModel({
  chatComplete: inference.chatComplete,
  connector: connectorToInference(someInferenceConnector),
  logger: myPluginLogger,
});

// just use it as another langchain chatModel
```
