# OpenAPI (Experimental)

The current self-contained spec file can be used for online tools like those found at https://openapi.tools/. This spec is experimental and may be incomplete or change later.

A guide about the openApi specification can be found at [https://swagger.io/docs/specification/about/](https://swagger.io/docs/specification/about/).

## The `openapi` folder

* `entrypoint*.yaml` are the overview files that pull together all the components and examples.
* `components`: Reusable components

## Tools

Generate the `bundled` files by running the following commands:

```bash
npx @redocly/cli bundle entrypoint.yaml --output bundled.yaml --ext yaml
npx @redocly/cli bundle entrypoint_serverless.yaml --output bundled_serverless.yaml --ext yaml
```

These files are joined with the rest of the Kibana APIs per `oas_docs/README.md`
