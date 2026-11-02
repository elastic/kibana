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

The chat model can also target an inference feature instead of a connector, by passing a
`featureId` instead of a `connectorId`. The feature's top endpoint is resolved when the model is
created to snapshot the connector exposed by `getConnector()`, and every call then goes through
`chatComplete({ featureId })`, which resolves the feature again at call time:

```ts
const chatModel = await inferenceStart.getChatModel({
  request,
  featureId: 'my_feature_id',
  chatModelOptions: {
    temperature: 0.2,
  },
});

// the connector the feature resolved to is available for metadata
const connector = chatModel.getConnector();
```

On that path the feature's model settings apply: the feature decides which connector is called
and which `reasoning` is used, so the `reasoning` option (on the constructor or per call) is not
forwarded. `temperature` remains a caller option, exactly as with a `connectorId`.

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
