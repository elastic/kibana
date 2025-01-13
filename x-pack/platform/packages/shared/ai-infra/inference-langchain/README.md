# @kbn/inference-langchain

This package exposes utilities to use the inference APIs and plugin with langchain

## InferenceChatModel

The inference chat model is a langchain model leveraging the inference APIs under the hood.

The main upside is that the unification and normalization layers are then fully handled
by the inference plugin. The developer / consumer don't even need to know which provider 
is being used under the hood.

```ts
const chatModel = new InferenceChatModel({
   chatComplete: inference.chatComplete,
   connectorId: someConnectorId,
});

// just use it as another langchain chatModel
```
