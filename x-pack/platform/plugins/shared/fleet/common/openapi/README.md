# OpenAPI

There is a new way to generate openapi docs from the route definition in code.

When adding a new route/modifying request/response parameters, make sure to add/update schema definitions when registering the route.
[Example](https://github.com/elastic/kibana/blob/main/x-pack/platform/plugins/shared/fleet/server/routes/agent/index.ts#L96-L123)

Read more: https://docs.elastic.dev/kibana-dev-docs/genereating-oas-for-http-apis 

To check the updated oas locally, run this script:

```
node scripts/capture_oas_snapshot --include-path /api/fleet --update
```

Use `--include-path /api/fleet` to only generate fleet paths.

Use `--no-serverless` to only generate for stateful.

Check the result in `oas_docs/bundle.json` and `oas_docs/bundle.serverless.json`

Check the result in Swagger UI by taking the raw file from the pr: https://petstore.swagger.io/?url=https://raw.githubusercontent.com/elastic/kibana/main/oas_docs/bundle.json

Changes to the bundles don't have to be committed, it is auto-committed by CI in `capture_oas_snapshot.sh`.
