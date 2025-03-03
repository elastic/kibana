# @kbn/json-schemas

This package provides JSON schemas used by code editors within the Kibana app.

## Generating/Updating the JSON Schema

To generate or update the output JSON schema files, run the following command from the root directory of the package:

```bash
yarn run jsonSchema
```

By default, this command assumes that your `elasticsearch-specification` folder is located next to the Kibana repository. If your `elasticsearch-specification` folder is located elsewhere, you can specify the path to the OpenAPI file as a command-line argument:

```bash
yarn run jsonSchema /path/to/elasticsearch-specification/output/openapi/elasticsearch-serverless-openapi.json
```

### Example:

```bash
yarn run jsonSchema /Users/my_user/dev/elasticsearch-specification/output/openapi/elasticsearch-serverless-openapi.json
```

This will generate or update the necessary JSON schema files in the `./src` folder.

Once the changes are made, ensure they are reviewed and merged to the appropriate release version. 
