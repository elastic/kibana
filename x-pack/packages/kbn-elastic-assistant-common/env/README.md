With https://github.com/elastic/kibana/pull/186566, we've introduced a few sample `*.http` files for easier development/testing. These files are supported out of the box in JetBrains IDE's or in VSCode with the [httpyac](https://httpyac.github.io/) (and many other) extensions. Since the configuration for these files includes a `-` in the name, a few @elastic/kibana-operations files have been updated to exclude them from checks and being included in the distribution.

You can read more about `http` files [here](https://www.jetbrains.com/help/webstorm/http-client-in-product-code-editor.html) and for the spec see this repo [here](https://github.com/JetBrains/http-request-in-editor-spec/blob/master/spec.md). If we find these useful, we could add support to our [OpenAPI Generator](https://openapi-generator.tech/docs/generators/jetbrains-http-client) to create these automatically. They currently live co-located next to the OAS and generated schema files here:

```
x-pack/packages/kbn-elastic-assistant-common/impl/schemas/knowledge_base/entries/bulk_crud_knowledge_base_entries_route.http
x-pack/packages/kbn-elastic-assistant-common/impl/schemas/knowledge_base/entries/crud_knowledge_base_entries_route.http
```

and the main config here in this directory:

```
x-pack/packages/kbn-elastic-assistant-common/env/http-client.env.json
```

The `x-pack/packages/kbn-elastic-assistant-common/.gitignore` has been updated to ignore `http-client.private.env.json` files locally, which is how you can override the config as you'd like. This is helpful to add variables like `basePath` as below:

```
{
  "dev": {
    "basePath": "/kbn"
  }
}
```

To use them, just open the corresponding `*.http` for the API you want to test, and click `Send`, and the response will open in another tab. Here is what that looks like for creating one of the new `IndexEntry` KB documents that have been introduced in the initial PR:

<p align="center">
  <img width="500" src="https://github.com/user-attachments/assets/c9e70d1a-28d2-4eb3-9853-ab6d8e1c7acf" />
</p> 


For continuing this effort, https://github.com/elastic/kibana/issues/192386 has been created.
