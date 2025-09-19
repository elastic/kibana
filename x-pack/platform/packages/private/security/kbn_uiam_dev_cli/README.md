# @kbn/uiam-dev-cli

The CLI that allows running UIAM service locally with the [Cosmos DB emulator](https://learn.microsoft.com/en-us/azure/cosmos-db/emulator-linux). 

The setup is pinned to a specific version of the UIAM service (can be overridden with `UIAM_GIT_REVISION` environment variable) and exposes three different ports:
- `8080`: UIAM service port (can be overridden with `UIAM_API_PORT` environment variable)
- `8081`: Cosmos DB emulator port (can be overridden with `UIAM_COSMOS_DB_GATEWAY_PORT` environment variable)
- `8082`: Cosmos DB emulator UI/Explorer port (can be overridden with `UIAM_COSMOS_DB_UI_PORT` environment variable)
